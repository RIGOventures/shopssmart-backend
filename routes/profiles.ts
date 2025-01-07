const router = require('express').Router();
const { body, param } = require('express-validator');

// Types
const { ResultCode } = require('@/utils/result')

// Get validators
const isAuthenticated = require('@/utils/validation/check-session'); // Get authentication middleware
const reportValidationError = require('@/utils/validation/report-validation-error'); // Get error report middleware

// Get Redis function
const { 
    getClient, 
    getKeyName, 
    createRelationalRecord, 
    deleteRelationalRecord, 
    getRelationalRecord, 
    getRelationalRecords 
} = require("@/database/redis");

// Get Redis client
const redis = getClient();

// Create profile
router.post(
    '/profile',
    [
        isAuthenticated,
        body().isObject(),
        body('profileName', "Profile name is required")
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        // Get profile name
        const { profileName } = req.body;
 
        // Create id
        const profileId = crypto.randomUUID()

        // Create profile
        const profile = {
            id: profileId,
            name: profileName,
            userId,
        }

        await createRelationalRecord('profiles', profile)

        res.status(200).json(profile);

    }
);

// Get all user profiles
router.get(
    '/profile',
    [
        isAuthenticated,
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        const profiles = await getRelationalRecords('profiles', userId)

        res.status(200).json(profiles);
    }
);

// Get a profile by ID
router.get(
    '/profile/:profileId',
    [
        isAuthenticated,
        param('profileId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        const { profileId } = req.params;

        const profile = await getRelationalRecord('profiles', profileId, userId)
        if (profile) {
            res.status(200).json(profile);
        } else {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
        }

    }
);

// Delete a user profile by ID
router.delete(
    '/profile/:profileId',
    [
        isAuthenticated,
        param('profileId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        const { profileId } = req.params;

        await deleteRelationalRecord('profiles', profileId, userId)

        res.send("OK");
    }
);

// Set profile preferences by ID
router.put(
    '/profile/:profileId/preference',
    [
        param('profileId')
            .isString()
            .isLength({ min: 1 }),
        body().isObject(),
        body('lifestyle') // TODO: Check as enum
            .isString(), 
        body('allergen') // TODO: Check as enum
            .isString(), 
        body('other')
            .isString(),
        reportValidationError,
    ],
    async (req, res) => {
        // Create profile Id
        const { profileId } = req.params;
        const preferenceKey = getKeyName('profiles', 'preferences', profileId);

        // Create preference
        const { lifestyle, allergen, other } = req.body;
        const pref = {
            lifestyle: lifestyle,
            allergen: allergen,
            other: other,
            profileId: profileId
        } 

        await redis.hset(preferenceKey, pref)

        res.status(200).json({ resultCode: ResultCode.ProfileUpdated });
    }
);

// Get profile preferences by ID
router.get(
    '/profile/:profileId/preference',
    [
        param('profileId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get primary key
        const { profileId } = req.params;
        const preferenceKey = getKeyName('profiles', 'preferences', profileId);

        const pref = await redis.hgetall(preferenceKey)
            
        res.status(200).json(pref);
    }
);

module.exports = router;