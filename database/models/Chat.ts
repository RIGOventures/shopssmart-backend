const { convertToCoreMessages } = require('ai');

// Define key
const MODEL_KEY = "chats"

// Get Default model
const Model = require("@/models/Model");

// Define user class
class Chat extends Model {
    constructor(keyName: string) {
        super(keyName);
    }
}

// Create chat
const create = async function(messages: [], userId: string) {
    // Get messages
    const coreMessages = await convertToCoreMessages(messages);
    // const latestMessageContent = coreMessages[coreMessages.length - 1].content as string;

    // Create title
    const firstMessageContent = coreMessages[0].content as string;
    const title = firstMessageContent.substring(0, 100);

    // Get path
    // const path = `/list/${chatId}`;

    // Create chat
    const chat = {
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: JSON.stringify(coreMessages),
        title,
        userId
    };

    return await Model.prototype.create.call(this, chat)
}
Chat.prototype.create = create

// Find record(s). 
const find = async function(object: object) {
    const responses = await Model.prototype.find.call(this, object)
    if (responses instanceof Array) {
        responses.map((chat) => {
            chat['messages'] = JSON.parse(chat['messages'])
        });
    } else if (typeof responses['messages'] === 'string') {
        responses['messages'] = JSON.parse(responses['messages'])
    }
    return responses
}
Chat.prototype.find = find

// Find a record. 
const findById = async function(id: string) {
    const chat = await Model.prototype.findById.call(this, id)
    // Convert messages
    const messages = chat['messages']
    if (messages) {
        chat['messages'] = JSON.parse(messages)
    }
    return chat
}
Chat.prototype.findById = findById

// Update one record.
const updateOne = async function(object: object, values: object) {
    // Check messages
    const messages = values['messages']
    if (messages) {
        // Convert messages
        const coreMessages = await convertToCoreMessages(messages);
        values['messages'] = JSON.stringify(coreMessages);
    }

    // Update record
    return await Model.prototype.updateOne.call(this, object, values)
}
Chat.prototype.updateOne = updateOne

module.exports = new Chat(MODEL_KEY)