const router = require('express').Router();
const { body, param } = require('express-validator');

const { z } = require('zod')

// Get error report middleware
const reportValidationError = require('../utils/report-validation-error');

// Get Redis function
const { getClient, getKeyName } = require("../database/redis");

// Get Redis client
const redis = getClient();

// Create profile
router.post(
    '/profile/',
    [
        body().isObject(),
        body('userId').isEmail(),
        body('profileName').isString({ min: 1, message: "Profile name is required" }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId, profileName } = req.body;
        const profileKey = getKeyName('profiles', profileName);

        // Create id
        const profileId = crypto.randomUUID()
        // Create profile
        const profile = {
            id: profileId,
            name: profileName,
            userId,
        }

        await createRecord(profileKey, profile)

        res.status(200).json(profile);
    }
);

// Get all user profiles
router.get(
    '/profile/',
    [
        param('userId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId } = req.params;
        const userKey = getKeyName('users', userId);

        const profiles = await getRecords<Profile>('profile', userId)

        res.status(200).json(profiles);
    }
);

// Get a profile by ID
router.get(
    '/profile/:profileId',
    [
        param('userId').isString({ min: 1 }),
        param('profileId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId, profileId } = req.params;
        const userKey = getKeyName('users', userId);
        const profileKey = getKeyName('profiles', profileId);

        const profile = getRecord<Profile>(userKey, profileKey)

        res.status(200).json(profile);
    }
);

// Delete a user profile by ID
router.delete(
    '/profile/:profileId',
    [
        param('userId').isString({ min: 1 }),
        param('profileId').isString({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId, profileId } = req.params;
        const userKey = getKeyName('users', userId);
        const profileKey = getKeyName('profiles', profileId);

        await deleteRecord(userKey, profileKey)

        res.status(200).json(profile);
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
        const preferenceKey = getKeyName('profiles', profileId, 'preference');

        const { lifestyle, allergen, health } = req.body;
        const rawFormData = {
            lifestyle: lifestyle,
            allergen: allergen || 'None',
            health: health,
        };

        const validatedFields = UpdateSchema.safeParse(rawFormData);
        // If form validation fails, return errors early. Otherwise, continue.
        if (!validatedFields.success) {
            res.status(400).json({ resultCode: ResultCode.InvalidSubmission });
        }

        const { lifestyle, allergen, health } = validatedFields.data;

        const preferences = {
            lifestyle: lifestyle,
            allergen: allergen,
            health: health,
        } 

        await redisClient.hset(preferenceKey, preferences)

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
