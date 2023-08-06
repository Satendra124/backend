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

const { MongoClient } = require("mongodb");

const mongoURI =
    "mongodb+srv://${challenger}raj:ohhello@cluster0.sj549jp.mongodb.net/goose?retryWrites=true&w=majority";
const client = new MongoClient(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function connectToDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

connectToDB();

// Assuming you have a MongoDB collection named "users"
const roomCollection = client.db("goose").collection("room");


const mockGameState = {
    you: 0,
    state: "ADD_ATTRIBUTES",
    players: [
        "satendra",
        "raj",
    ],
    challenger_message: "hello",
    replyer_message: "hi",
    challenger: "raj",
    replyer: "satendra",
    attributes_data: {
        "satendra": {
            "fun": 90,
            "health": 100,
            "love": 90
        },
        "raj": {
            "fun": 95,
            "health": 100,
            "love": 110
        }
    },
    prompt: [],
    attributes:[],
};

const round_states = [
    "NO_PLAYER",
    "ADD_ATTRIBUTES",
    "0_READY",
    "1_READY",
    "0_CHALLENGE",
    "1_REPLY",
    "1_CHALLENGE",
    "0_REPLY",
    "1_WON",
    "0_WON"
];

const axios = require("axios");

const apiKey = "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";
const apiUrl = "https://api.openai.com/v1/chat/completions";

const playGame = async (roomData) => {
    if(!(roomData.state === "0_CHALLENGE" || roomData.state === "1_CHALLENGE")){
        return {
            error:true,
            reason:"Not in challenge state"
        }
    }
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
    };
    const prompt = roomData.prompt;
    const challenger = roomData.challenger;
    const replyer = roomData.replyer;
    const challenger_message = roomData.challenger_message;
    const replyer_message = roomData.replyer_message;
    if(prompt.length === 0){
        prompt.push({ 
            role: "system", 
            content: `Act as a game api.\n\ntwo players ${challenger} and ${replyer} plays a game of life trying to kill each other.\n\nFirst ${challenger} writes and ${replyer} replies then ${replyer} writes and ${challenger} replies and so on.\n\nThere are attributes ${roomData.attributes.join(',')} each with initial being 100 and max 200 and min 0.\nAny attribute going to zero means that player dies.\n\nAll attributes are for you to decide that what happens on what but fun should decrease drastically if players tries to repeat his past events.fun doesn't decrease in any other conditions, but it can be increased.\n\nMake sure everything follows a story failing of which send a response with valid as false other response should have valid as true. also give a reason when having valid as false.\n\nfor valid as true give current attribute values of both players\n\nYou can only reply as json object.if confused reply as valid as false and reason as the reason for confusion.\n\nThere are only these json with which you can reply with\nfor valid:\n{\n\"valid\":true,\n\"data\":{\n    \"${challenger}\": {\n    <attributes-data>\n  },\n  \"${replyer}\": {\n    <attributes-data>\n  }\n  }\n}\nfor invalid:\n{\n\"valid\":false,\n\"reason\":\"Reason for invalid response\"\n}\n\n`
        });
    }
    prompt.push({ role: "user", content: `${challenger}:${challenger_message} \n ${replyer}:${replyer_message}` });
    const data = {
        model: "gpt-3.5-turbo-16k",
        messages: prompt,
    };

    const res = await axios.post(apiUrl, data, { headers });
    console.log(res);
    const aiData = JSON.parse(res.data.choices[0].message);
    if(aiData.content.valid){
        roomData.attributes_data = aiData.content.data;
        roomData.prompt.push(aiData);
    }else{
        roomData.prompt.push(aiData);
    }
    roomData.challenger_message = "";
    roomData.replyer_message = "";
    roomData.replyer = challenger;
    roomData.challenger = replyer;
    await roomCollection.updateOne({ _id: roomData._id }, { $set: roomData });
    return roomData;
};


// Route to fetch all users
app.get("/api/room", async (req, res) => {
    try {
        const rooms = await roomCollection.find().toArray();
        res.json(rooms);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route to create a new user
app.post("/api/room", async (req, res) => {
    try {
        const { id } = req.body;
        const { username } = req.body;
        const exist = await roomCollection.findOne({ _id: id });
        if (exist) {
            //check if player already in room
            if (exist.players.includes(username)) {
                res.json({ ...exist});
                return;
            }
            exist.state = round_states[1];
            exist.players.push(username);
            exist.replyer = username;
            await roomCollection.updateOne({ _id: id }, { $set: { ...exist } });
            res.json({ ...exist});
        } else {
            const roomData = {
                _id: id,
                players: [username],
                state: round_states[0],
                challenger: username,
                replyer: username,
                challenger_message: "",
                replyer_message: "",
                attributes_data: {},
                prompt: [],
                attributes: ["fun"],
            };
            const result = await roomCollection.insertOne({ ...roomData });
            res.json({ roomData, you: 0 });
        }
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// refresh state
app.post("/api/refresh", async (req, res) => {
    const { room } = req.body;
    const roomData = await roomCollection.findOne({ _id: room });
    if (!roomData) {
        res.json({ error: "Room Not Found" });
        return;
    }
    res.json(roomData);
});

app.post("/api/attributes", async (req, res) => {
    const { room } = req.body;
    const { attributes } = req.body;
    const roomData = await roomCollection.findOne({ _id: room });
    if (!roomData) {
        res.json({ error: "Room Not Found" });
        return;
    }
    roomData.attributes = attributes;
    await roomCollection.updateOne({ _id: roomData._id }, { $set: roomData });
    res.json(roomData);
});


app.post("/api/next", async (req, res) => {
    const { room } = req.body;
    const { username } = req.body;
    const roomData = await roomCollection.findOne({ _id: room });
    if (!roomData) {
        res.json({ error: "Room Not Found" });
        return;
    }
    if(roomData.challenger === username){
        switch (roomData.state) {
            case 'ADD_ATTRIBUTES':
                roomData.state = '0_READY';
                break;
            case '1_READY':
                roomData.state = '0_CHALLENGE';
            default:
                roomData.state = 'ERROR';
                break;
        }
    }else if(roomData.replyer === username){
        if(roomData.state === '0_READY') {
            roomData.state = '0_CHALLENGE';
        }else roomData.state = '1_READY';
    }
    roomData.state = round_states[2];
    await roomCollection.updateOne({ _id: roomData._id }, { $set: roomData });
    res.json(roomData);
});


app.post("/api/message", async (req, res) => {
    const {room} = req.body;
    const {username} = req.body;
    const {message} = req.body;
    const roomData = await roomCollection.findOne({ _id: room });
    if (!roomData) {
        res.json({ error: "Room Not Found" });
        return;
    }
    if(roomData.challenger === username){
        roomData.challenger_message = message;
    }else if(roomData.replyer === username){
        roomData.replyer_message = message;
    }
    if(roomData.challenger_message && roomData.replyer_message) await playGame(roomData);
});