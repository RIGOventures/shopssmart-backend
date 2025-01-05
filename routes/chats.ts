const router = require('express').Router();
const { body, param } = require('express-validator');

const { ResultCode } = require('@/utils/result')

const  { AxiosError } = require('axios')

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
    const { chatId } = req.param;

    // Get messages
    const { messages } = req.body;

    // Create title
    const firstMessageContent = messages[0].content as string;
    const title = firstMessageContent.substring(0, 100);

    const path = `/list/${chatId}`;

    // Create chat
    const chat = {
        id: chatId,
        title,
        createdAt: new Date(),
        messages: messages,
        userId,
    };
    
    await createRelationalRecord('chats', chat)
}

// Create a chat
router.post(
    '/chat',
    [
        isAuthenticated,
        body().isObject(),
        body('messages').isEmail(),
        reportValidationError,
    ],
    async (req, res) => {
        // Create id
        const chatId = crypto.randomUUID()
        req.param.chatId = chatId

        await saveChat(req, res)

        res.status(200).json({ resultCode: ResultCode.UserCreated })
    }
);

// Create a chat
router.post(
    '/chat/:chatId',
    [
        isAuthenticated,
        param('chatId').isString({ min: 1 }),
        body().isObject(),
        body('messages').isEmail(),
        reportValidationError,
    ],
    async (req, res) => {

        // Rate limit by middleware
        try {
            // Get header
            const headersList = req.headers

            // Get user ip
            const userIP =
                headersList.get('x-forwarded-for') || headersList.get('cf-connecting-ip') || '';

            // Apply rate limit middleware
            const rateLimitResult = await rateLimit(userIP);
            if (rateLimitResult) {
                //return rateLimitResult;
            }
        } catch (error) {

            let message
            if (error instanceof Error) message = error.message
            else message = String(error)

            return res.status(400).json({
                type: 'error',
                resultCode: ResultCode.UnknownError,
                message: message
            })
        }

        // Get messages
        const { messages } = req.body;
        const coreMessages = convertToCoreMessages(messages);
    
        // Get value
        const messageContent = coreMessages[coreMessages.length - 1].content as string;

        // Handle on finish
        async function onFinish({ text }: { text: string }) {

            try {

                // Update messages
                const responseMessages = [ { role: 'assistant', content: text } ]
                const chatMessages = [...coreMessages, ...responseMessages];
                req.body.message = chatMessages

                await saveChat(req, res)

            } catch (error) {
                console.error('Failed to save chat');
                
                let message
                if (error instanceof Error) message = error.message
                else message = String(error)

                console.log(message)

                let resultCode 

                if (error instanceof AxiosError) {
                    
                    let statusCode = error.response?.status
                    switch (statusCode) {
                        case 401:
                            resultCode = ResultCode.InvalidCredentials
                            break
                        case 402:
                        case 420:
                            resultCode = ResultCode.RateLimited
                            break
                        default:
                            resultCode = ResultCode.UnknownError
                    }

                } else {
                    resultCode = ResultCode.UnknownError
                }
                
                // TODO: Return as results stream to client
                return res.status(400).json({
                    type: 'error',
                    resultCode: ResultCode.UnknownError,
                    message: message
                })

            }
        }

        // Get session
        const { userId } = req.session;

        // Get user preferences
        let preferences = {}
        if (userId) {
            // Get user
            const userKey = getKeyName('users', userId);
            const existingUser = await redis.hgetall(userKey);

            // Get key
            const profileId = existingUser.profileId
            const preferenceKey = getKeyName('profiles', profileId, 'preferences');

            // Get preferences
            preferences = await redis.hgetall(preferenceKey) || {}
        }

        // Submit message
        const dataStreamResponse = await submitPrompt(messageContent, preferences, onFinish)

        // The Express's Response is actually a stream!
        dataStreamResponse.on('end', () => res.end());
        return dataStreamResponse.pipe(res)
    }
)

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

// TODO: Replace functions
// const { revalidatePath } = require('next/cache')

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
        isAuthenticated,
        param('chatId').isString({ min: 1 }),
        body().isObject(),
        body('messages').isEmail(),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        // Get chat
        const { chatId } = req.param;
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
        isAuthenticated,
        param('chatId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        // Get chat
        const { chatId } = req.param;

        const chat = getRelationalRecord('chats', chatId, userId)

        res.status(200).json(chat);
    }
);

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
        const { chatId } = req.param;

        await deleteRelationalRecord('chats', chatId, userId)

        res.send("OK");
    }
);

// Share this chat
router.post(
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
        const { chatId } = req.param;

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
