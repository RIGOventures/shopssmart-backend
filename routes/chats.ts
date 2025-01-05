const router = require('express').Router();
const { body, param } = require('express-validator');

const { ResultCode } = require('@/utils/result')

const { pipeline } = require("node:stream/promises");

const { convertToCoreMessages } = require('ai');

// Get error report middleware
const reportValidationError = require('@/utils/report-validation-error');

// Get authentication middleware
const isAuthenticated = require('@/utils/check-session');

// Get Redis function
const { getClient, getKeyName, createRelationalRecord, deleteRelationalRecord, getRelationalRecord, getRelationalRecords } = require("@/database/redis");

// Rate limit utility
const { rateLimit } = require("@/database/rate-limit");

// Get Redis client
const redis = getClient();

// Get AI mode
const { submitPrompt } = require("@/model/vertex");

// Create chat
const saveChat = async (req, res) => {
    // Get session
    const { userId } = req.session;

    // Get chat generation request details
    const { chatId } = req.params;

    // Get messages
    const { messages } = req.body;
    const coreMessages = await convertToCoreMessages(messages);
    // const latestMessageContent = coreMessages[coreMessages.length - 1].content as string;

    // Create title
    const firstMessageContent = coreMessages[0].content as string;
    const title = firstMessageContent.substring(0, 100);

    // Get path
    // const path = `/list/${chatId}`;

    // Create chat
    const chat = {
        id: chatId,
        createdAt: new Date(),
        messages: JSON.stringify(coreMessages),
        title,        
        userId,
    };
    
    await createRelationalRecord('chats', chat)

    return chat
}

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
        // Create id
        const chatId = crypto.randomUUID()
        req.params.chatId = chatId

        // Save chat
        await saveChat(req, res)

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

        const chats = await getRelationalRecords('chats', userId)

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

        // Fetch all the records stored with the user
        const foreignKey = getKeyName('users', 'chats', userId)
        const chats: string[] = await redis.zrange(foreignKey, 0, -1)
        if (!chats.length) {
            res.status(200).json({ resultCode: ResultCode.ChatUpdated });
            return
        }

        // Start pipeline
        const pipeline = redis.pipeline()

        // Get all chats saved
        for (const chat of chats) {
            pipeline.del(chat)
            pipeline.zrem(foreignKey, chat)
        }

        await pipeline.exec()

        res.status(200).json({ resultCode: ResultCode.ChatUpdated });

    }
);

// Get chat by ID.
router.get(
    '/chat/:chatId',
    [
        isAuthenticated,
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        const { chatId } = req.params;

        const chat = await getRelationalRecord('chats', chatId, userId)
        if (chat) {
            res.status(200).json(chat);
        } else {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
        }

    },
);

// Rate limit by middleware
const rateLimitValidation = async (req, res, next) => {
    // Get header
    const headersList = req.headers
    // Get user ip
    const userIP =
        headersList['x-forwarded-for'] || headersList['cf-connecting-ip'] || req.socket.remoteAddress || '';

    // Apply rate limit middleware
    const rateLimitResult = await rateLimit(userIP);
    if (rateLimitResult) {
        // TODO: enable in production
        //return rateLimitResult;
    }

    return next()
}
// Get preferences
const getPreferences = async (userId: number) => {
   // Get user
   const userKey = getKeyName('users', userId);
   const existingUser = await redis.hgetall(userKey);

   // Get key
   const profileId = existingUser.profileId
   const preferenceKey = getKeyName('profiles', profileId, 'preferences');

   // Get preferences
   return await redis.hgetall(preferenceKey)
}

// Update a chat
router.post(
    '/chat/:chatId',
    [
        isAuthenticated,
        rateLimitValidation,
        param('chatId').isString({ min: 1 }),
        body().isObject(),
        body('content').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        // Get chat
        const { chatId } = req.params;
        const existingChat = await getRelationalRecord('chats', chatId, userId);

        // Get messages
        const { content } = req.body;

        // Get user preferences
        const preferences = await getPreferences(userId)

        // Handle on finish
        async function onFinish({ text }: { text: string }) {

            // Get current messages
            const messages = JSON.parse(existingChat.messages)
            // Get response message
            const responseMessages = [ { role: 'assistant', content: text } ]

            // Append to chat messages
            const chatMessages = [...messages, ...responseMessages];
            req.body.messages = chatMessages // Add to body
            
            // Save chat
            await saveChat(req, res)

            // End stream
            res.end(text)
        }

        // Submit message
        const streamResponse = await submitPrompt(content, preferences, onFinish)

        // Pipe stream to response!
        await pipeline(streamResponse.body, res);

    }
)

// Delete a user chat by ID
router.delete(
    '/chat/:chatId',
    [
        isAuthenticated,
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        // Get chat
        const { chatId } = req.params;

        await deleteRelationalRecord('chats', chatId, userId)

        res.send("OK");
    }
);

// Share this chat
router.put(
    '/chat/:chatId/share',
    [
        isAuthenticated,
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        // Get chat
        const { chatId } = req.params;
        const chat = await getRelationalRecord('chats', chatId, userId)

        // Update chat
        const payload = {
            ...chat,
            sharePath: `/share/${chat.id}`
        }

        const chatKey = getKeyName('chats', chat.id)

        await redis.hset(chatKey, payload)

        res.status(200).json(payload);
    }
);

// Get a shared chat
router.get(
    '/chat/:chatId/share',
    [
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get chat
        const { chatId } = req.params;
        const chatKey = getKeyName('chats', chatId)

        const chat = await redis.hgetall(chatKey)
        if (!chat || !chat.sharePath) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials })
            return
        }

        res.status(200).json(chat);
    }
);

module.exports = router;
