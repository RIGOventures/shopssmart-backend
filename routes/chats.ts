const router = require('express').Router();
const { body, param } = require('express-validator');

// Get error report middleware
const reportValidationError = require('../utils/report-validation-error');

// Get Redis function
const { getClient, getKeyName, createRelationalRecord } = require("../database/redis");

// Get Redis client
const redis = getClient();

const { revalidatePath } = require('next/cache')
const { redirect } = require('next/navigation')

// Create a chat
router.post(
    '/chat/',
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
        const chatKey = getKeyName('chats', chatId);

        const existingChat = await redis.hgetall(chatKey);

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

// Get chats
router.get(
    '/chat/',
    [
        body().isObject(),
        body('userId').isEmail(),
        reportValidationError,
    ],
    async (req, res) => {

        return getRecords<Chat>('chat', userId)
    }
);

// Get chats
router.delete(
    '/chat/',
    [
        body().isObject(),
        body('userId').isEmail(),
        reportValidationError,
    ],
    async (req, res) => {
        const session = await auth()

        if (!session?.user?.id) {
            return {
                error: 'Unauthorized'
            }
        }

        const chats: string[] = await redis.zrange(`user:chat:${session.user.id}`, 0, -1)
        if (!chats.length) {
            return redirect('/')
        }
        const pipeline = redis.pipeline()

        for (const chat of chats) {
            pipeline.del(chat)
            pipeline.zrem(`user:chat:${session.user.id}`, chat)
        }

        await pipeline.exec()

        revalidatePath('/')
        return redirect('/')
    }
);

// Get a chat by ID
router.get(
    '/chat/:chatId',
    [
        param('userId').isString({ min: 1 }),
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId, chatId } = req.params;
        const userKey = getKeyName('users', userId);
        const chatKey = getKeyName('chats', chatId);

        const profile = getRecord<Profile>(userKey, profileKey)
        return getRecord<Chat>('chat', id, userId)
        res.status(200).json(profile);
    }
);

// Delete a user chat by ID
router.delete(
    '/chat/:chatId',
    [
        param('userId').isString({ min: 1 }),
        param('chatId').isString({ min: 1 }),
        body().isObject(),
        body('path').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId, chatId } = req.params;
        const userKey = getKeyName('users', userId);
        const profileKey = getKeyName('profiles', profileId);

        const { path } = req.body;
        await deleteRecord(userKey, profileKey)

        res.status(200).json(profile);
        revalidatePath('/')
        return revalidatePath(path)
    }
);

// Share this chat
router.post(
    '/chat/:chatId/share',
    [
        param('userId').isString({ min: 1 }),
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId, chatId } = req.params;

        const session = await auth()
        if (!session?.user?.id) {
            return {
                error: 'Unauthorized'
            }
        }

        const chat = await redis.hgetall<Chat>(`chat:${id}`)
        if (!chat || chat.userId !== session.user.id) {
            return {
                error: 'Something went wrong'
            }
        }

        const payload = {
            ...chat,
            sharePath: `/share/${chat.id}`
        }

        await redis.hset(`chat:${chat.id}`, payload)

        return payload
    }
);

// Share this chat
router.post(
    '/chat/:chatId/share',
    [
        param('userId').isString({ min: 1 }),
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId, chatId } = req.params;
        const chat = await kv.hgetall<Chat>(`chat:${id}`)

        if (!chat || !chat.sharePath) {
            return null
        }

        return chat
    }
);
