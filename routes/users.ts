const router = require('express').Router();
const { body, param } = require('express-validator');

// Types
const { ResultCode } = require('@/utils/result')

// Sensitive fields
const SENSITIVE_FIELD_NAMES = ['password'];

// Get validators
const reportValidationError = require('@/utils/validation/report-validation-error'); // Get error report middleware

// Get User model
const User = require("@/models/User");
// Get Profile model
const Profile = require("@/models/Profile");

// Create a user.
router.post(
    '/user',
    [
        body().isObject(),
        body('email')
            .isEmail()
            .trim()
            .custom(async value => {
                const results = await User.find({ email: value })
                if (results.length >= 1) {
                    throw new Error('E-mail already in use');
                }
            }),
        body('password')
            .isString()
            .trim()
            .isLength({ min: 6 }),
        reportValidationError,
    ],
    async (req, res) => {
        // Get body
        const { email, password } = req.body;
    
        // Create user
        await User.create(email, password)
    
        // Return success
        return res.status(200).json({ resultCode: ResultCode.UserCreated })
    }
);

// Get users
router.get(
    '/user',
    [
        reportValidationError,
    ],
    async (req, res) => {
        // Get users
        const results = await User.find()

        // Remove sensitive fields
        SENSITIVE_FIELD_NAMES.map((fieldName) =>
            results.forEach(function(existingUser){ delete existingUser[fieldName] }));

        // Return filtered user
        res.status(200).json(results);
    }
);

// Get user by ID.
router.get(
    '/user/:userId',
    [
        param('userId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId } = req.params;
        
        // Find user
        const existingUser = await User.findById(userId)
        if (!existingUser) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Remove sensitive fields
        SENSITIVE_FIELD_NAMES.map((fieldName) => delete existingUser[fieldName]);

        // Return filtered user
        res.status(200).json(existingUser);
    },
);

// Get user by email address.
router.get(
    '/user/email/:email',
    [
        param('email')
            .isEmail(),
        reportValidationError,
    ],
    async (req, res) => {
        // Get parameters
        const { email } = req.params;

        // Get user
        const existingUser = await User.findOne({ email: email })
        if (!existingUser) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Remove sensitive fields
        SENSITIVE_FIELD_NAMES.map((fieldName) => delete existingUser[fieldName]);

        // Return filtered user
        res.status(200).json(existingUser);
    },
);

// Delete a user.
router.delete(
    '/user/:userId',
    [
        param('userId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId } = req.params;
        
        // Delete user
        const result = await User.deleteOne({ id: userId })
        if (result == 0){
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }
        
        // Return result
        res.status(200).json({ resultCode: ResultCode.UserUpdated });
    }
);

// Set user profile.
router.put(
    '/user/:userId/profile',
    [
        param('userId')
            .isString()
            .isLength({ min: 1 })
            .custom(async value => {
                const results = User.find({ id: value })
                if (results.length == 0) {
                    throw new Error(`Failed login attempt for ${value}.`);
                }
            }),
        body().isObject(),
        body('profileId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId } = req.params;
        const { profileId } = req.body;

        // Get profile (to ensure it exists)
        const profile = await Profile.findById(profileId)
        if (!profile) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Update user
        await User.updateOne({ id: userId }, { profileId: profile.id })

        // Return result
        res.status(200).json({ resultCode: ResultCode.UserUpdated });
    }
);

// Get user profile.
router.get(
    '/user/:userId/profile',
    [
        param('userId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { userId } = req.params;

        // Find user
        const existingUser = await User.findById(userId)
        if (!existingUser) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Create preference
        const preference = await User.getProfile(existingUser)

        // Return profile
        res.status(200).json(preference);
    }
);

module.exports = router;