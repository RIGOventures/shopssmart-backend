const router = require('express').Router();
const { body, param } = require('express-validator');

const bcrypt = require('bcrypt')

const { ResultCode } = require('@/utils/result')

// Sensitive fields
const SENSITIVE_FIELD_NAMES = ['password'];

// Remove sensitive fields
const removeSensitiveFields = require('@/utils/remove-sensitive-fields');

// Get error report middleware
const reportValidationError = require('@/utils/report-validation-error');

// Get Redis function
const { getClient, getKeyName, performSearch } = require("@/database/redis");

// Get Redis client
const redis = getClient();

// Create user
const createUser = async (req, res) => {
    const { email, password } = req.body;

    // Need to escape . and @ in the email address when searching.
    const emailAddress = email.replace(/\./g, '\\.').replace(/\@/g, '\\@');

    // Check if this email address is in use
    const searchResults = await performSearch(getKeyName('users', 'idx'), `@email:{${emailAddress}}`);
    if (searchResults.length === 1) {
        res.status(400).json({ resultCode: ResultCode.UserAlreadyExists })
    }

    // Encrypy password
    const saltRounds = 10; // Typically a value between 10 and 12
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create id
    const userId = crypto.randomUUID()
    const userKey = getKeyName('users', userId)

    // Create user
    const user = {
        id: userId,
        email,
        password: hashedPassword
    } 

    await redis.hset(userKey, user)

    res.status(200).json({ resultCode: ResultCode.UserCreated })
}

// Create a user.
router.post(
    '/user',
    [
        body().isObject(),
        body('email').isEmail(),
        body('password').isString({ min: 6 }),
        reportValidationError,
    ],
    createUser
);

// Get users
router.get(
    '/user',
    [
        reportValidationError,
    ],
    async (req, res) => {
    
        // Fetch all the keys that match the mask
        const userMask = getKeyName('users', "*")
         
        const userKeys: string[] = []

        let cursor = 0
        do {
            const result = await redis.scan(cursor, 'MATCH', userMask)
            // Update cursor
            cursor = result[0]

            // Append user keys
            const resultKeys = result[1]
            userKeys.push(...resultKeys)
        } while (cursor != 0)

        const pipeline = redis.pipeline()

        // Get all users saved
        for (const userKey of userKeys) {
            pipeline.hgetall(userKey)
        }

        const results = await pipeline.exec()

        // Flatten and filter results
        const filtered = results.flat().filter(function (el) { return el != null; });

        // Remove sensitive fields
        SENSITIVE_FIELD_NAMES.map((fieldName) =>
            filtered.forEach(function(existingUser){ delete existingUser[fieldName] }));

        res.status(200).json(filtered);
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
        const emailAddress = email.replace(/\./g, '\\.').replace(/\@/g, '\\@');
  
        const searchResults = await performSearch(getKeyName('users', 'idx'), `@email:{${emailAddress}}`);
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

        const existingUser = await redis.hgetall(userKey);
        if (!existingUser) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
        }

        const { profileId } = req.body;

        // Update user
        const user = {
            ...existingUser,
            profileId: profileId
        } 

        await redis.hset(userKey, user)

        res.status(200).json({ resultCode: ResultCode.UserUpdated });
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

        const existingUser = await redis.hgetall(userKey);
        if (existingUser) {
            // TODO: Get the profileId field from the user hash whose key is in userKey.
            // Check out the HMGET command... https://redis.io/commands/hmget
            res.status(200).json({ profileId: existingUser.profileId || 'default' });
        } else {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
        }
    }
);

module.exports = router;

// Append other functions as named export
module.exports.createUser = createUser
