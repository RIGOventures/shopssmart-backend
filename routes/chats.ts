const router = require('express').Router();
const { body, param } = require('express-validator');

const { ResultCode } = require('@/utils/result')

// Get error report middleware
const reportValidationError = require('@/utils/report-validation-error');

// Get Redis function
const { getClient, getKeyName, createRelationalRecord, deleteRelationalRecord, getRelationalRecord, getRelationalRecords } = require("@/database/redis");

// Get Redis client
const redis = getClient();

// Create a chat
router.post(
    '/chat',
    [
        body().isObject(),
        body('messages').isEmail(),
        reportValidationError,
    ],
    async (req, res) => {
        const { user } = req.session;
        const { userId } = user;

        // Get messages
        const { messages } = req.body;

        // Create id
        const chatId = crypto.randomUUID()

        // Create title
        const firstMessageContent = messages[0].content as string;
        const title = firstMessageContent.substring(0, 100);

        // Create chat
        const chat = {
            id: chatId,
            title,
            createdAt: new Date(),
            messages: messages,
            userId,
        };
        
        await createRelationalRecord('chats', chat)

        res.status(200).json({ resultCode: ResultCode.UserCreated })
    }
);

// Get chats
router.get(
    '/chat',
    [
        reportValidationError,
    ],
    async (req, res) => {
        const { userId } = req.params;

        const chats = await getRelationalRecords('chats', userId)

        res.status(200).json(chats);
    }
);

// TODO: Replace functions
// const { revalidatePath } = require('next/cache')

// Clear all chats
router.delete(
    '/chat',
    [
        reportValidationError,
    ],
    async (req, res) => {
        const { userId } = req.params;

        // Remove the foreign key
        const foreignKey = getKeyName('users', 'chat', userId)

        const chats: string[] = await redis.zrange(foreignKey, 0, -1)
        if (!chats.length) {
            res.redirect('/')
        }
        const pipeline = redis.pipeline()

        for (const chat of chats) {
            pipeline.del(chat)
            pipeline.zrem(foreignKey, chat)
        }

        await pipeline.exec()

        //revalidatePath('/')
        res.redirect('/')

    }
);

// Update a chat
router.post(
    '/chat/:chatId',
    [
        param('chatId').isString({ min: 1 }),
        body().isObject(),
        body('messages').isEmail(),
        reportValidationError,
    ],
    async (req, res) => {
        const { user } = req.session;
        const { userId } = user;

        const { chatId } = req.body;

        const existingChat = await getRelationalRecord('chats', chatId, userId);

        // Get messages
        const { messages } = req.body;

        // Update the chat
        const chat = {
            ... existingChat,
            messages: messages,
        };
        
        await createRelationalRecord('chats', chat)

        res.status(200).json({ resultCode: ResultCode.UserCreated })
    }
);

// Get a chat by ID
router.get(
    '/chat/:chatId',
    [
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId, chatId } = req.params;

        const chat = getRelationalRecord('chats', chatId, userId)

        res.status(200).json(chat);
    }
);

// Delete a user chat by ID
router.delete(
    '/chat/:chatId',
    [
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId, chatId } = req.params;

        await deleteRelationalRecord('chats', chatId, userId)

        res.send("OK");
    }
);

// Share this chat
router.post(
    '/chat/:chatId/share',
    [
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId, chatId } = req.params;

        const chat = getRelationalRecord('chats', chatId, userId)

        const payload = {
            ...chat,
            sharePath: `/share/${chat.id}`
        }

        const chatKey = getKeyName('chats', chat.id)
        await redis.hset(chatKey, payload)

        res.status(200).json(payload);
    }
);

// Share this chat
router.post(
    '/chat/:chatId/share',
    [
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { chatId } = req.params;
        const chatKey = getKeyName('chats', chatId)

        const chat = await redis.hgetall(chatKey)
        if (!chat || !chat.sharePath) {
            res.status(400)
        }

        res.status(200).json(chat);
    }
);

module.exports = router;
