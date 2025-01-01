const router = require('express').Router();
const { body, param } = require('express-validator');

const bcrypt = require('bcrypt')

//import { ResultCode } from '@/lib/utils/result'

// Sensitive fields
const SENSITIVE_FIELD_NAMES = ['password'];

// Remove sensitive fields
const removeSensitiveFields = require('../utils/remove-sensitive-fields');

// Get error report middleware
const reportValidationError = require('../utils/report-validation-error');

// Get Redis function
const { getClient, getKeyName } = require("../database/redis");

// Get Redis client
const redis = getClient();

// Create a user.
router.post(
    '/user/',
    [
        body().isObject(),
        body('email').isEmail(),
        body('password').isString({ min: 6 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { email, password } = req.body;

        const existingUser = await redis.hgetall(`users:${email}`)
        await getUser(email)
        if (existingUser) {
            res.status(400).json({ resultCode: ResultCode.UserAlreadyExists })
        } else {

            // Encrypy password
            const saltRounds = 10; // Typically a value between 10 and 12
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Create id
            const userId = crypto.randomUUID()
            // Create user
            const user = {
                id: userId,
                email,
                password: hashedPassword
            } 

            await redis.hset(getKeyName('users', userId), user)

            res.status(200).json({ resultCode: ResultCode.UserCreated })
        }
    }
);

// Get user by ID.
router.get(
    '/user/:userId',
    [
        param('userId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId } = req.params;
        const userKey = getKeyName('users', userId);

        const existingUser = await redis.hgetall(userKey);
        if (existingUser) {
            SENSITIVE_FIELD_NAMES.map((fieldName) => delete existingUser[fieldName]);

            res.status(200).json(existingUser);
        } else {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
        }
        
    },
);

// Get user by email address.
router.get(
    '/user/email/:email',
    [
        param('email').isEmail(),
        reportValidationError,
    ],
    async (req, res) => {
        const { email } = req.params;
        // Need to escape . and @ in the email address when searching.
        /* eslint-disable no-useless-escape */
        const emailAddress = email.replace(/\./g, '\\.').replace(/\@/g, '\\@');
        /* eslint-enable */
        const searchResults = []//await performSearch(getKeyName('usersidx'), `@email:{${emailAddress}}`);

        const response = searchResults.length === 1
            ? removeSensitiveFields(searchResults, ...SENSITIVE_FIELD_NAMES)[0]
            : searchResults;

        res.status(200).json(response);
    },
);

// Set user profile.
router.post(
    '/user/:userId/profile',
    [
        param('userId').isString({ min: 1 }),
        body().isObject(),
        body('profileId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {

        const { userId } = req.params;
        const userKey = getKeyName('users', userId);

        const { profileId } = req.body;

        const existingUser = await getUser(userId)
        if (existingUser) {
            const user = {
                ...existingUser,
                profileId: profileId
            } 

            await redis.hset(userKey, user)

            res.status(200).json({ resultCode: ResultCode.UserUpdated });

        } else {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
        }
    }
);

// Get user profile.
router.get(
    '/user/:userId/profile',
    [
        param('userId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {

        const { userId } = req.params;
        const userKey = getKeyName('users', userId);

        const { profileId } = req.body;

        // TODO: Get the profileId fields from the
        // user hash whose key is in userKey.
        // HINT: Check out the HMGET command...
        // https://redis.io/commands/hmget

        const existingUser = await getUser(userId)
        if (existingUser) {
            res.status(200).json({ profileId: existingUser.profileId || 'default' });
        } else {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
        }
    }
);

module.exports = router;