/**
 * @swagger
 * tags:
 *  name: Chats
 *  description: Chat administration
 */

import express from 'express';
const router = express.Router(); // create router

import { header, body, param } from 'express-validator';

import { ResultCode } from '@/utils/result';

import { pipeline } from "node:stream/promises";

import { isAuthenticated, rateLimit, reportValidationError } from '@/utils/middleware'; 

import { createUser, getProfile, getPreferences, userRepository, createChat, updateChat, chatRepository } from "@/database/types";

import { submitPrompt } from "@/model/vertex";

/**
 * @swagger
 * /message:
 *  post:
 *      summary: Get a chat response
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
    '/message',
    [
        rateLimit,
        body().isObject(),
        body('content')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { content } = req.body;

        // Handle on finish
        async function onFinish({ text }: { text: string }) {
            // End stream
            res.end(text)
        }

        // Submit message
        const streamResponse = await submitPrompt(content, {}, onFinish)

        // Pipe stream to response!
        await pipeline(streamResponse.body, res);
    }
)

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

        // Get session
        const { userId } = req.session;

        // Create chat
        const [result, chat] = await createChat(messages, userId)

        // Create chat
        await User.linkForeignRecord(userId, 'chats', chat)

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
        // Get session
        const { userId } = req.session;

        // Get chats
        const chats = await User.getForeignRecords(userId, 'chats')

        // Return result
        res.status(200).json(chats);
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
        await User.deleteForeignRecords(userId, 'chats')

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
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;

        // Get session
        const { userId } = req.session;
        
        // Get record
        const chat = await User.getForeignRecord(userId, 'chats', id)
        if (!chat) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Return result
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
            .custom(isAuthenticated),
        rateLimit,
        param('id')
            .isString()
            .isLength({ min: 1 }),
        body().isObject(),
        body('content')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;
        const { content } = req.body;

        // Get session
        const { userId } = req.session;

        // Get chat
        const chat = await User.getForeignRecord(userId, 'chats', id);
        if (!chat) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Handle on finish
        async function onFinish({ text }: { text: string }) {
            // Get message
            const responseMessages = [ { role: 'assistant', content: text } ]
            
            // save Chat
            updateChat(chat, responseMessages)

            // end stream
            res.end(text)
        }

        // Get user preferences
        const preferences = await User.getPreferences(userId);
   
        // Submit message
        const streamResponse = await submitPrompt(content, preferences, onFinish)

        // Pipe stream to response!
        await pipeline(streamResponse.body, res);
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
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;

        // Get session
        const { userId } = req.session;

        // Delete record
        const result =await User.deleteForeignRecord(userId, 'chats', id)
        if (result == 0){
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Return result
        res.send("OK");
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
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;

        // Get session
        const { userId } = req.session;

        // Get chat
        const chat = await User.getForeignRecord(userId, 'chats', id)
        if (!chat) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // add share path
        chat.sharePath = `/share/${chat.id}`

        // save Chat
        await chatRepository.save(chat)

        // Return result
        res.status(200).json(`/share/${chat.id}`);
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
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;

        const chat = await chatRepository.fetch(id)
        if (!chat || !chat.sharePath) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials })
            return
        }

        // Return result
        res.status(200).json(chat);
    }
);

module.exports = router
