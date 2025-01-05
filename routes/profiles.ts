const router = require('express').Router();
const { body, param } = require('express-validator');

const { ResultCode } = require('@/utils/result')

// Get error report middleware
const reportValidationError = require('@/utils/report-validation-error');

// Get authentication middleware
const isAuthenticated = require('@/utils/check-session');

// Get Redis function
const { getClient, getKeyName, createRelationalRecord, deleteRelationalRecord, getRelationalRecord, getRelationalRecords } = require("@/database/redis");

// Get Redis client
const redis = getClient();

// Create profile
router.post(
    '/profile',
    [
        isAuthenticated,
        body().isObject(),
        body('profileName').isString({ min: 1, message: "Profile name is required" }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

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
        param('profileId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        const { profileId } = req.params;

        const profile = getRelationalRecord('profiles', profileId, userId)

        res.status(200).json(profile);
    }
);

// Delete a user profile by ID
router.delete(
    '/profile/:profileId',
    [
        isAuthenticated,
        param('profileId').isString({ min: 1 }),
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
router.post(
    '/profile/:profileId/preference',
    [
        param('profileId').isString({ min: 1 }),
        body().isObject(),
        body('lifestyle').isString(),
        body('allergen').isString(),
        body('health').isString(),
        reportValidationError,
    ],
    async (req, res) => {
        const { profileId } = req.params;
        
        const { lifestyle, allergen, health } = req.body;

        // Create preference
        const pref = {
            lifestyle: lifestyle,
            allergen: allergen,
            health: health,
        } 

        const preferenceKey = getKeyName('profiles', profileId, 'preference');

        await redis.hset(preferenceKey, pref)

        res.status(200).json({ resultCode: ResultCode.UserUpdated });
    }
);

// Get profile preferences by ID
router.get(
    '/profile/:profileId/preference',
    [
        param('profileId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { profileId } = req.params;
        const preferenceKey = getKeyName('profiles', profileId, 'preferences');

        try {
            const pref = await redis.hgetall(preferenceKey)
            res.status(200).json(pref);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            res.status(400).json({ error: 'Failed to fetch profile.'});
        }
    }
);

module.exports = router;