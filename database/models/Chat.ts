import _ from 'lodash'

import { Entity, Schema, Repository } from 'redis-om'
import { client } from "@/redis";

export type Message = {
    role: "system" | "user" | "assistant" | "data",
    content: string
}

/**
 * @swagger
 * components:
 *  schemas:
 *      Chat:
 *          type: object
 *          required:
 *              - name
 *              - userId
 *          properties:
 *              id:
 *                  type: string
 *                  description: The auto-generated id of the chat
 *              title:
 *                  type: string
 *                  description: The title of the chat
 *              userId:
 *                  type: string
 *                  description: The foreign key of a user
 *              messages: 
 *                  type: array
 *                  description: The chat messaged
 *              createdAt:
 *                  type: string
 *                  format: date
 *                  description: The time the chat was created
 *              updatedAt:
 *                  type: string
 *                  format: date
 *                  description: The time the chat was updated
 *          example:
 *              id: 7d7a9092-666b-4a84-8aad-294d15a306f6
 *              title: Apple
 *              userId: 410544b2-4001-4271-9855-fec4b6a6442a
 *              messages: [{ "role": 'assistant', "content": "Apple" }]
 */

/* define Chat entity */
export interface IChat extends Entity {
    /* add identification for Chat */
    title: string
    createdAt: Date
    updatedAt: Date

    /* add paths for Chat */
    path?: string
    sharePath?: string
    
    /* add foreign key for Chat's User */
    userId?: string
}

export interface Chat extends IChat {
    /* add messages for Chat */
    messages: string[] 
}

export interface ConvertChat extends IChat {
    /* redefine messages for Chat */
    messages: Message[] 
}

/* create a Schema for Chat */
export const chatSchema = new Schema<Chat>('chat', {
    title: { type: 'string' }, 
    createdAt: { type: 'date' }, 
    updatedAt: { type: 'date' }, 
    messages: { type: 'string[]' }, 
    path: { type: 'string', indexed: false }, 
    sharePath: { type: 'string', indexed: false }, 
    userId: { type: 'string' },
})

/* define Chat repository */
export const chatRepository = new Repository(chatSchema, client)

import { convertToCoreMessages } from 'ai';

/* create Chat */
export const createChat = async (messages: Message[], userId: string) => {
    // get messages
    const coreMessages = await convertToCoreMessages(messages);
    // const latestMessageContent = coreMessages[coreMessages.length - 1].content as string;

    // create title
    const firstMessageContent = coreMessages[0].content as string;
    const title = firstMessageContent.substring(0, 100);

    // stringify messages
    let chatMessages = coreMessages.map(JSON.stringify);

    // define path
    // const path = `/list/${chatId}`,
    
    // create chat
    const chat = {
        title,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: chatMessages,
        userId
    };

    // save chat
    return await chatRepository.save(chat)
}

/* convert Chat */
const convertMessages = async (messages: (string | Message)[]) => {
    // parse messages
    let parsedMessages = messages.map(message => {
        if (_.isString(message)) return JSON.parse(message)
        return message
    });
 
    // get core messages
    const coreMessages = await convertToCoreMessages(parsedMessages)
    return coreMessages
}

/* convert Chat */
export const convertChat = async (chat: Chat) => {
    // clone chat
    let convertedChat: ConvertChat = JSON.parse(JSON.stringify(chat))

    // change messages
    convertedChat.messages = await convertMessages(chat.messages) as Message[];

    // return chat
    return convertedChat
}

/* update one Chat */
export const updateChat = async (chat: Chat, responseMessages: Message[]) => {
    // append to messages
    const messages = [...chat.messages, ...responseMessages];

    // get core messages
    const coreMessages = await convertMessages(messages);

    // stringify messages
    let chatMessages = coreMessages.map(JSON.stringify);

    // save messages
    chat.messages = chatMessages
    // save update date
    chat.updatedAt = new Date()

    // save Chat
    return await chatRepository.save(chat)
}
