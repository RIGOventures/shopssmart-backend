const router = require('express').Router();
const { body, param } = require('express-validator');

// Types
const { ResultCode } = require('@/utils/result')

// Get validators
const isAuthenticated = require('@/utils/validation/check-session'); // Get authentication middleware
const reportValidationError = require('@/utils/validation/report-validation-error'); // Get error report middleware

// Get User model
const User = require("@/models/User");
// Get Profile model
const Profile = require("@/models/Profile");

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
        const { profileName } = req.body;

        // Get session
        const { userId } = req.session;

        // Create profile
        const [result, profile] = await Profile.create(profileName, userId)

        // Link profile
        await User.linkForeignRecord(userId, 'profiles', profile)

        // Return result
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

        // Get profiles
        const profiles = await User.getForeignRecords(userId, 'profiles')

        // Return result
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
        const { profileId } = req.params;

        // Get session
        const { userId } = req.session;

        // Get record
        const profile = await User.getForeignRecord(userId, 'profiles', profileId)
        if (!profile) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }
            
        // Return result
        res.status(200).json(profile);
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
        const { profileId } = req.params;

        // Get session
        const { userId } = req.session;

        // Delete record
        await User.deleteForeignRecord(userId, 'profiles', profileId)

        // Return result
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
        const { profileId } = req.params;
        const { lifestyle, allergen, other } = req.body;

        // Link preference
        await Profile.setPreferences(profileId, lifestyle, allergen, other)

        // Return result
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
        const { profileId } = req.params;
        
        // Get preference
        const preference = await Profile.getPreferences(profileId)

        // Return result
        res.status(200).json(preference);
    }
);

module.exports = router;