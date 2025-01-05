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
        param('profileId').isString({ min: 1 }),
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
router.put(
    '/profile/:profileId/preference',
    [
        param('profileId').isString({ min: 1 }),
        body().isObject(),
        body('lifestyle').isString(), // TODO: Check as enum
        body('allergen').isString(), // TODO: Check as enum
        body('other').isString(),
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
        param('profileId').isString({ min: 1 }),
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