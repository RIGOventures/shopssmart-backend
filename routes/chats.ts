const router = require('express').Router();
const { body, param } = require('express-validator');

// Types
const { ResultCode } = require('@/utils/result')

const { pipeline } = require("node:stream/promises");

// Get validators
const isAuthenticated = require('@/utils/validation/check-session'); // Get authentication middleware
const rateLimit = require('@/utils/validation/rate-limit'); // Get authentication middleware
const reportValidationError = require('@/utils/validation/report-validation-error'); // Get error report middleware

// Get User model
const User = require("@/models/User");
// Get Chat model
const Chat = require("@/models/Chat");

// Get AI mode
const { submitPrompt } = require("@/model/vertex");

// Create a chat
router.post(
    '/chat',
    [
        isAuthenticated,
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
        res.status(200).json({ resultCode: ResultCode.ChatCreated })
    }
);

// Get chats
router.get(
    '/chat',
    [
        isAuthenticated,
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        // Get chats
        const chats = await User.getForeignRecords(userId, 'chats')
        chats.map((chat) => {
            chat['messages'] = JSON.parse(chat['messages'])
        });

        // Return result
        res.status(200).json(chats);
    }
);

// Clear all chats
router.delete(
    '/chat',
    [
        isAuthenticated,
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

// Get chat by ID.
router.get(
    '/chat/:chatId',
    [
        isAuthenticated,
        param('chatId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { chatId } = req.params;

        // Get session
        const { userId } = req.session;
        
        // Get record
        const chat = await User.getForeignRecord(userId, 'chats', chatId)
        if (!chat) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }
        chat['messages'] = JSON.parse(chat['messages'])

        // Return result
        res.status(200).json(chat);
    },
);

// Update a chat
router.post(
    '/chat/:chatId',
    [
        isAuthenticated,
        rateLimit,
        param('chatId')
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

        // Get user preferences
        const existingUser = await User.findById(userId);
        const profile = await User.getProfile(existingUser)
        
        // Get chat
        const chat = await User.getForeignRecord(userId, 'chats', chatId);
        chat['messages'] = JSON.parse(chat['messages'])

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

        // Submit message
        const streamResponse = await submitPrompt(content, profile.preference, onFinish)

        // Pipe stream to response!
        await pipeline(streamResponse.body, res);
    }
)

// Delete a user chat by ID
router.delete(
    '/chat/:chatId',
    [
        isAuthenticated,
        param('chatId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { chatId } = req.params;

        // Get session
        const { userId } = req.session;

        // Delete record
        await User.deleteForeignRecord(userId, 'chats', chatId)

        // Return result
        res.send("OK");
    }
);

// Share this chat
router.put(
    '/chat/:chatId/share',
    [
        isAuthenticated,
        param('chatId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { chatId } = req.params;

        // Get session
        const { userId } = req.session;

        // Get chat
        const chat = await User.getForeignRecord(userId, 'chats', chatId)

        // Update chat
        await Chat.updateOne({ id: chat.id }, {
            sharePath: `/share/${chat.id}`,      
        })

        // Return result
        res.status(200).json(`/share/${chat.id}`);
    }
);

// Get a shared chat
router.get(
    '/chat/:chatId/share',
    [
        param('chatId')
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
