const router = require('express').Router();
const { param } = require('express-validator');

// Sensitive fields
const SENSITIVE_FIELD_NAMES = ['password'];

// Remove sensitive fields
const removeSensitiveFields = require('../utils/remove-sensitive-fields');

// Get error report middleware
const reportValidationError = require('../utils/report-validation-error');

// Get Redis function
const { getClient, getKeyName } = require("../database/redis");

// Get Redis client
const redisClient = getClient();

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

        const userDetail = await redisClient.hgetall(userKey);
        SENSITIVE_FIELD_NAMES.map((fieldName) => delete userDetail[fieldName]);

        res.status(200).json(userDetail);
    },
);

// TODO: Get user's full name.
router.get(
    '/user/:userId/username',
    [
        param('userId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId } = req.params;
        const userKey = getKeyName('users', userId);

        // TODO: Get the firstName and lastName fields from the
        // user hash whose key is in userKey.
        // HINT: Check out the HMGET command...
        // https://redis.io/commands/hmget
        const [firstName, lastName] = ['TODO', 'TODO'];

        res.status(200).json({ fullName: `${firstName} ${lastName}` });
    },
);

// Get user by email address.
router.get(
    '/user/email/:emailAddress',
    [
        param('emailAddress').isEmail(),
        reportValidationError,
    ],
    async (req, res) => {
        // Need to escape . and @ in the email address when searching.
        /* eslint-disable no-useless-escape */
        const emailAddress = req.params.emailAddress.replace(/\./g, '\\.').replace(/\@/g, '\\@');
        /* eslint-enable */
        const searchResults = []//await performSearch(getKeyName('usersidx'), `@email:{${emailAddress}}`);

        const response = searchResults.length === 1
            ? removeSensitiveFields(searchResults, ...SENSITIVE_FIELD_NAMES)[0]
            : searchResults;

        res.status(200).json(response);
    },
);

module.exports = router;