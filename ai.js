const axios = require("axios");

const make_intial_prompt = (players, attributes) => {
    return {
        "role": "system",
        "content": `Act as a game api.\n\ntwo players ${players[0]} and ${players[1]} plays a game of life trying to kill each other.\n\nFirst ${players[0]} writes and ${players[1]} replies then ${players[1]} writes and ${players[0]} replies and so on.\n\nThere are attributes ${attributes.join(',')} each with initial being 10 and max 15 and min 0.\nAny attribute going to zero means that player dies.\n\nAll attributes are for you to decide that what happens on what action.\n\nMake sure everything follows a story failing of which send a response with valid as false other response should have valid as true. also give a reason when having valid as false.\n\nfor valid as true give current attribute values of both players\n\nYou can only reply as json object.if confused reply as valid as false and reason as the reason for confusion.\nvalid as true should also give an justification on why and how each attributes were changed and by how much think deep and create a story of 50 words.\n\nThere are only these json with which you can reply with\nfor valid:\n{\n\"valid\":true,\n\"reason\":\"Justification for changes\"\n\"data\":{\n    \"${players[0]}\": {\n    <attributes-data>\n  },\n  \"${players[1]}\": {\n    <attributes-data>\n  }\n  }\n}\nfor invalid:\n{\n\"valid\":false,\n\"reason\":\"Reason for invalid response\"\n}\n\n donot format the json\n`
    }
};

const make_promt = (challenger, replyer, challenger_message, replyer_message) => {
    return { role: "user", content: `${challenger}:${challenger_message} \n ${replyer}:${replyer_message}` };
}

const get_new_state_update_prompt = async (prompts, propts_sv, tries = 0) => {
    // remove extra values _id from prompts
    prompts.forEach((prompt) => {
        delete prompt._id;
    });

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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'
    };
    const data = {
        "model": "gpt-3.5-turbo-16k",
        "messages": prompts,
        "temperature": 1,
        "max_tokens": 256,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    };
    // try three times to get a non error response
    try {
        const res = await axios.post('https://api.openai.com/v1/chat/completions', data, { headers: headers });
        const AI_prompt = res.data.choices[0].message;
        const  resData = JSON.parse(AI_prompt.content);
        propts_sv.push(AI_prompt);
        return resData;
    } catch (error) {
        console.error(error);
        return null;
    }
    
}

//export
module.exports = {
    make_intial_prompt,
    make_promt,
    get_new_state_update_prompt
};
