const express = require("express");
const app = express();
const port = 8080; // You can use any port number you prefer
const cors = require("cors");

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors());

// Start the server
app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});

const mongoose = require('mongoose');
const Room = require('./room');
const { get_new_state_update_prompt, make_promt, make_intial_prompt } = require("./ai");

// Connect to MongoDB
mongoose.connect('mongodb+srv://satendraraj:ohhello@cluster0.sj549jp.mongodb.net/goose?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

const INITIAL_ATTRIBUTE_VALUE = 10;
const MAX_ATTRIBUTE_VALUE = 15;
const MIN_ATTRIBUTE_VALUE = 0;

app.post("/api/room", async (req, res) => {
    try {
        const room_id = req.body.room_id;
        const player_id = req.body.player_id;
        const attributes = req.body.attributes;
        if (!room_id || !player_id || !attributes) {
            res.status(400).json({ message: "Invalid request" });
            return;
        }

        const room = await Room.findById(room_id);
        if (room) {
            if (room.players.length === 1) {
                if (room.players[0] === player_id) {
                    res.status(200).json(room);
                    return;
                }
                const attribute_map = attributes.map(attr => ({ name: attr, value: INITIAL_ATTRIBUTE_VALUE }));
                room.players.push(player_id);
                room.attr.push({
                    player: player_id,
                    attributes: attribute_map,
                });
                const opponent_attributes = room.attr.find(p => p.player === room.players[0]).attributes;
                let all_attributes = [...attribute_map, ...opponent_attributes];
                // remove duplicates
                const map = {};
                all_attributes.forEach((attribute) => {
                    if (!map[attribute.name]) {
                        map[attribute.name] = attribute;
                    } else {
                        map[attribute.name].value += attribute.value;
                    }
                });
                all_attributes = Object.values(map);
                console.log(all_attributes);
                all_attributes.forEach((attribute) => {
                    delete attribute._id;
                });
                room.attr.forEach((player) => {
                    player.attributes = all_attributes;
                });
                // add this player as replier
                room.current_round.replier = player_id;
                const all_attributes_names = all_attributes.map(attr => attr.name);
                room.prompts.push(make_intial_prompt(room.players,all_attributes_names));
                console.log(room);
                await room.save();
                res.status(200).json(room);
            } else {
                res.status(400).json({ message: "Room is full" });
            }
        } else {
            const newPlayer = {
                player: player_id,
                attributes: attributes.map(attr => ({ name: attr, value: INITIAL_ATTRIBUTE_VALUE })),
            };
            const room = new Room({
                _id: room_id,
                attr: [newPlayer],
                players: [player_id],
                prompts: [],
                current_round: {
                    challenger: player_id,
                    replier: null,
                    challenger_message: null,
                }
            });
            await room.save();
            res.status(200).json(room);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Send message
app.post("/api/room/:room_id/message", async (req, res) => {
    try {
        const room_id = req.params.room_id;
        const player_id = req.body.player_id;
        const message = req.body.message;
        if (!room_id || !player_id || !message) {
            res.status(400).json({ message: "Invalid request" });
            return;
        }

        const room = await Room.findById(room_id);
        if (!room) {
            res.status(400).json({ message: "Room not found" });
            return;
        }

        const isReplier = room.current_round.replier === player_id;
        const isChallenger = room.current_round.challenger === player_id;
        if (!isReplier && !isChallenger) {
            res.status(400).json({ message: "Player not found" });
            return;
        }
        if(isReplier && room.current_round.challenger_message) {
            // Here main game logic will be done
            const challenger_message = room.current_round.challenger_message;
            const replier_message = message;
            const challenger = room.current_round.challenger;
            const replier = room.current_round.replier;
            const prompt = make_promt(challenger,replier,challenger_message,replier_message);
            room.prompts.push(prompt);
            const rooms_obj = room.toObject();
            const state = await get_new_state_update_prompt(rooms_obj.prompts,room.prompts);
            if(!state) {
                res.status(400).json({ message: "Error connecting to AI" });
                return;
            }
            if(!state.valid){
                // next round
                room.current_round.challenger = replier;
                room.current_round.replier = challenger;
                room.current_round.challenger_message = null;
                await room.save();
                res.status(200).json(room);
                return; 
            }
            // transform data
            room.attr.forEach((player) => {
                player.attributes.forEach((attribute) => {
                    attribute.value = state.data[player.player][attribute.name];
                });
            });
            room.current_round.challenger_message = null;
            room.current_round.replier = challenger;
            room.current_round.challenger = replier;
            console.log(room.toObject());
            await room.save();
            res.status(200).json(room);
        }else if(isChallenger && !room.current_round.challenger_message) {
            // add challenger message
            room.current_round.challenger_message = message;
            await room.save();
            res.status(200).json(room);
        }else {
            res.status(400).json({ message: "Invalid request" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// get room data
app.get("/api/room/:room_id", async (req, res) => {
    try {
        const room_id = req.params.room_id;
        if (!room_id) {
            res.status(400).json({ message: "Invalid request" });
            return;
        }

        const room = await Room.findById(room_id);
        if (!room) {
            res.status(400).json({ message: "Room not found" });
            return;
        }
        res.status(200).json(room);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});