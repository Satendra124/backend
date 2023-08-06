const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: Number, required: true },
});

const playerSchema = new mongoose.Schema({
  player: { type: String, required: true },
  attributes: [attributeSchema],
});

const promptSchema = new mongoose.Schema({
    role: { type: String, required: true },
    content: { type: String, required: true },
});

const roomSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  attr: [playerSchema],
  players: [{ type: String, required: true }],
  prompts: [promptSchema],
  current_round: {
    challenger: { type: String, required: true },
    replier: { type: String, required: false },
    challenger_message: { type: String, required: false },
  },
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;

const sc = {
    _id: "rooms2323",
    attr: [
        {
            player: "satendra",
            attributes: [
                { name: "name", value: 100 },
                { name: "name2", value: 100 },
                { name: "name3", value: 100 },
                { name: "name4", value: 100 }
            ]
        },
        {
            player: "sauravh",
            attributes: [
                { name: "name", value: 100 },
                { name: "name2", value: 100 },
                { name: "name3", value: 100 },
                { name: "name4", value: 100 }
            ]
        }
    ],
    players: ["satendra", "saurabh"],
    prompts: [
        {
            "role": "system",
            "content": "you are ai"
        },
        {
            "role": "user",
            "content": "user message"
        }
    ],
    current_round: {
        challenger: "satendra",
        replier: "saurabh",
        challenger_message: "challenger message",
    }
}