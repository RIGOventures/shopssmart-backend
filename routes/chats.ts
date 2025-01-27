/**
 * @swagger
 * tags:
 *  name: Chats
 *  description: Chat administration
 */

const router = require('express').Router();
const { header, body, param } = require('express-validator');

// Types
const { ResultCode } = require('@/utils/result')

const { pipeline } = require("node:stream/promises");

// Get authentication middleware
const isAuthenticated = require('@/utils/validation/check-session'); 
// Get rate limit middleware
const rateLimit = require('@/utils/validation/rate-limit');
// Get error report middleware
const { reportValidationError, ResultError } = require('@/utils/validation/report-validation-error'); 

// Get User model
const User = require("@/models/User");
// Get Chat model
const Chat = require("@/models/Chat");

// Get AI mode
const { submitPrompt } = require("@/model/vertex");

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
        const [result, chat] = await Chat.create(messages, userId)

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
        const { chatId } = req.params;
        const { content } = req.body;

        // Get session
        const { userId } = req.session;

        // Get chat
        const chat = await User.getForeignRecord(userId, 'chats', chatId);
        if (!chat) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Handle on finish
        async function onFinish({ text }: { text: string }) {
            // Get message
            const responseMessages = [ { role: 'assistant', content: text } ]
            // Append to messages
            const chatMessages = [...chat['messages'], ...responseMessages];

            // Save chat
            await Chat.updateOne({ id: chatId }, {
                updatedAt: new Date(),
                messages: chatMessages,      
            })
            
            // End stream
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

        // Update chat
        await Chat.updateOne({ id: chat.id }, {
            sharePath: `/share/${chat.id}`,      
        })

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
        const { chatId } = req.params;

        const chat = await Chat.findById(chatId)
        if (!chat || !chat.sharePath) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials })
            return
        }

        // Return result
        res.status(200).json(chat);
    }
);

module.exports = router;
