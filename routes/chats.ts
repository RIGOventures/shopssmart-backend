/**
 * @swagger
 * tags:
 *  name: Chats
 *  description: Chat administration
 */

import express from 'express';
const router = express.Router(); // create router

import { header, body, param } from 'express-validator';

/**
 * @swagger
 * definitions:
 *  CreateChat:
 *      required:
 *          - messages
 *      properties:
 *          messages: 
 *              type: array
 *      example:
 *          messages: [{ "role": 'assistant', "content": "Apple" }]
 */

import { ResultCode, ResultError } from '@/utils/result';
import { isAuthenticated, rateLimit, reportValidationError } from '@/utils/middleware'; 

import { createChat, convertChat, updateChat, chatRepository, Chat, ConvertChat, getPreferences, getProfile, userSchema, userRepository, Message } from "@/database/types";
import { getKeyName, insertSortedRecord, deleteSortedRecord, getSortedSet, deleteSortedSet } from '@/database/redis';

import { pipeline } from "node:stream/promises";
import { submitPrompt } from "@/model/vertex";

/* define User Chat set key */
const USER_CHAT_SET_KEY = getKeyName(userSchema.schemaName, 'chats')

/**
 * @swagger
 * /chat:
 *  post:
 *      summary: Create a chat
 *      tags: [Chats]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      $ref: '#/definitions/CreateChat'
 *      responses:
 *          201:
 *              description: The response code
 *              content:
 *                  text/plain:
 *                      schema:
 *                          type: string
 */
router.post(
    '/chat',
    [
        header()
            .custom(isAuthenticated),
        body().isObject(),
        body('messages').isArray(),
        reportValidationError,
    ],
    async (req, res) => {
        const { messages } = req.body;

        // get Session
        const { userId } = req.session;

        // create Chat
        let chat = await createChat(messages, userId)

        // insert Chat to a sorted set
        await insertSortedRecord(USER_CHAT_SET_KEY, userId, chat)

        // Return results
        res.status(201).json({ resultCode: ResultCode.ChatCreated })
    }
);

/**
 * @swagger
 * /chat:
 *  get:
 *      summary: Get all chats
 *      tags: [Chats]
 *      responses:
 *          200:
 *              description: The response code
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          $ref: '#/components/Chat'
 */
router.get(
    '/chat',
    [
        header()
            .custom(isAuthenticated),
        reportValidationError,
    ],
    async (req, res) => {
        // get Session
        const { userId } = req.session;

        // get Chats
        const chats = await getSortedSet(USER_CHAT_SET_KEY, userId, chatRepository) as Chat[]

        // parse Chats
        const convertedChats = await Promise.all(chats.map(async (chat) => { 
            // convert Chat messages
            return await convertChat(chat); 
        })) as unknown as ConvertChat[]

        // return result
        res.status(200).json(convertedChats);
    }
);

/**
 * @swagger
 * /chat:
 *  delete:
 *      summary: Delete all chats
 *      tags: [Chats]
 *      responses:
 *          200:
 *              description: The response code
 *              content:
 *                  text/plain:
 *                      type: string
 */
router.delete(
    '/chat',
    [
        header()
            .custom(isAuthenticated),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        // Delete records
        await deleteSortedSet(USER_CHAT_SET_KEY, userId, chatRepository)

        // Return result
        res.status(200).json({ resultCode: ResultCode.ChatUpdated });
    }
);

/**
 * @swagger
 * parameters:
 *  chatId:
 *      name: id
 *      description: Chat's id.
 *      in: path
 *      required: true
 *      type: string
 */

/**
 * @swagger
 * /chat/{id}:
 *  get:
 *      summary: Get a chat by id
 *      tags: [Chats]
 *      parameters:
 *          - $ref: '#/parameters/chatId'
 *      responses:
 *          200:
 *              description: The chat
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          $ref: '#/components/Chat'
 *          400:
 *              description: The response code. Cannot find the chat.
 */
router.get(
    '/chat/:id',
    [
        header()
            .custom(isAuthenticated),
        param('id')
            .isString()
            .isLength({ min: 1 })
            .custom(async (value, { req }) => {
                // fetch Chat with id
                const existingChat = await chatRepository.fetch(value)

                // check Chat exists
                let noOfUserKeys = Object.keys(existingChat).length
                if (noOfUserKeys == 0) {
                    throw new ResultError(`Chat ${value} does not exist.`, ResultCode.InvalidCredentials);
                }

                // add Chat to request
                req.body.chat = existingChat
            }),
        reportValidationError,
    ],
    async (req, res) => {
        const { chat } = req.body;

        // get Session
        const { userId } = req.session;
        
        // compare with session.userId
        if (chat.userId != userId) {
            // return fail
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials })
            return
        }

        // return result
        res.status(200).json(chat);
    },
);

/**
 * @swagger
 * /chat/{id}:
 *  post:
 *      summary: Update a chat
 *      tags: [Chats]
 *      parameters:
 *          - $ref: '#/parameters/chatId'
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          content:
 *                              type: string
 *      responses:
 *          200:
 *              description: The response code
 *          400:
 *              description: The response code. Cannot find the chat.
 */
router.post(
    '/chat/:id',
    [
        header()
            .custom(isAuthenticated)
            .custom(async (value, { req }) => {
                // get Session
                const { userId } = req.session;

                // fetch User with id
                const existingUser = await userRepository.fetch(userId)

                // check User exists
                let noOfUserKeys = Object.keys(existingUser).length
                if (noOfUserKeys == 0) {
                    throw new ResultError(`Failed login attempt for ${userId}.`, ResultCode.InvalidCredentials);
                }
                
                // add User to request
                req.body.user = existingUser
            }),
        rateLimit,
        param('id')
            .isString()
            .isLength({ min: 1 })
            .custom(async (value, { req }) => {
                // fetch Chat with id
                const existingChat = await chatRepository.fetch(value)

                // check Chat exists
                let noOfUserKeys = Object.keys(existingChat).length
                if (noOfUserKeys == 0) {
                    throw new ResultError(`Chat ${value} does not exist.`, ResultCode.InvalidCredentials);
                }

                // add Chat to request
                req.body.chat = existingChat
            }),
        body().isObject(),
        body('content')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { user, chat, content } = req.body;

        // get Session
        const { userId } = req.session;
        
        // compare with session.userId
        if (chat.userId != userId) {
            // return fail
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials })
            return
        }

        // Handle on finish
        async function onFinish({ text }: { text: string }) {
            // Get message
            const responseMessages = [ { role: 'assistant', content: text } ] as Message[]
            
            // save Chat
            updateChat(chat, responseMessages)

            // end stream
            res.end(text)
        }

        // get User Profile
        const profile = await getProfile(user)
        // get Profile Preferences
        const preferences = await getPreferences(profile)

        // submit message
        const streamResponse = await submitPrompt(content, preferences, onFinish)

        // pipe stream to response!
        await pipeline(streamResponse.body!, res);
    }
)

/**
 * @swagger
 * /chat/{id}:
 *  delete:
 *      summary: Delete a chat
 *      tags: [Chats]
 *      parameters:
 *          - $ref: '#/parameters/chatId'
 *      responses:
 *          200:
 *              description: OK
 *          400:
 *              description: The response code. Cannot find the chat.
 */
router.delete(
    '/chat/:id',
    [
        header()
            .custom(isAuthenticated),
        param('id')
            .isString()
            .isLength({ min: 1 })
            .custom(async (value, { req }) => {
                // fetch Chat with id
                const existingChat = await chatRepository.fetch(value)

                // check Chat exists
                let noOfUserKeys = Object.keys(existingChat).length
                if (noOfUserKeys == 0) {
                    throw new ResultError(`Chat ${value} does not exist.`, ResultCode.InvalidCredentials);
                }

                // add Chat to request
                req.body.chat = existingChat
            }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;
        const { chat } = req.body;
        
        // get Session
        const { userId } = req.session;
        
        // compare with session.userId
        if (chat.userId != userId) {
            // return fail
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials })
            return
        }

        // delete Chat from sorted set
        await deleteSortedRecord(USER_CHAT_SET_KEY, userId, chat)

        // delete Chat
        await chatRepository.remove(id)

        // return result
        res.status(200).json({ resultCode: ResultCode.ChatUpdated });
    }
);

/**
 * @swagger
 * /chat/{id}/share:
 *  put:
 *      summary: Share this chat
 *      tags: [Chats]
 *      parameters:
 *          - $ref: '#/parameters/chatId'
 *      responses:
 *          200:
 *              description: OK
 *          400:
 *              description: The response code. Cannot find the chat.
 */
router.put(
    '/chat/:id/share',
    [
        header()
            .custom(isAuthenticated),
        param('id')
            .isString()
            .isLength({ min: 1 })
            .custom(async (value, { req }) => {
                // fetch Chat with id
                const existingChat = await chatRepository.fetch(value)

                // check Chat exists
                let noOfUserKeys = Object.keys(existingChat).length
                if (noOfUserKeys == 0) {
                    throw new ResultError(`Chat ${value} does not exist.`, ResultCode.InvalidCredentials);
                }

                // add Chat to request
                req.body.chat = existingChat
            }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;
        const { chat } = req.body;

        // get Session
        const { userId } = req.session;
        
        // compare with session.userId
        if (chat.userId != userId) {
            // return fail
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials })
            return
        }

        // add share path
        chat.sharePath = `/share/${id}`

        // save Chat
        await chatRepository.save(chat)

        // Return result
        res.status(200).json(`/share/${id}`);
    }
);

/**
 * @swagger
 * /chat/{id}/share:
 *  get:
 *      summary: Get a shared chat
 *      tags: [Chats]
 *      parameters:
 *          - $ref: '#/parameters/chatId'
 *      responses:
 *          200:
 *              description: OK
 *          400:
 *              description: The response code. Cannot find the shared chat.
 */
router.get(
    '/chat/:id/share',
    [
        param('id')
            .isString()
            .isLength({ min: 1 })
            .custom(async (value, { req }) => {
                // fetch Chat with id
                const existingChat = await chatRepository.fetch(value)

                // check Chat exists
                let noOfUserKeys = Object.keys(existingChat).length
                if (noOfUserKeys == 0) {
                    throw new ResultError(`Chat ${value} does not exist.`, ResultCode.InvalidCredentials);
                }

                // add Chat to request
                req.body.chat = existingChat
            }),
        reportValidationError,
    ],
    async (req, res) => {
        const { chat } = req.body;

        // check the Chat share path
        if (!chat.sharePath) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials })
            return
        }

        // return result
        res.status(200).json(chat);
    }
);

module.exports = router
