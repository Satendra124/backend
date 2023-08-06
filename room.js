const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    attr: {
        type: Map,
        of: new mongoose.Schema({}, { strict: false }),
        required: true,
    },
    players: [{ type: String, required: true }],
    prompts: [{
        role: { type: String, required: true },
        content: { type: String, required: true },
    }],
    current_round: {
        challenger: { type: String, required: true },
        replier: { type: String, required: true },
        challenger_message: { type: String, required: true },
    }
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
