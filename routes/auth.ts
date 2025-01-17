const router = require('express').Router();
const { body, param } = require('express-validator');

// Types
const { ResultCode } = require('@/utils/result')

// Get validators
const reportValidationError = require('@/utils/validation/report-validation-error'); // Get error report middleware

// Get User model
const User = require("@/models/User");

// Signup user
router.post(
    '/signup',
    [
        body().isObject(),
        body('email')
            .isEmail()
            .trim()
            .custom(async value => {
                const results = await User.find({ email: value })
                if (results.length >= 1) {
                    throw new Error(`E-mail ${value} already in use`);
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

// Authenticates credentials against database
router.post(
    '/login',
    [
        body().isObject(),
        body('email')
            .isEmail()
            .trim()
            .custom(async value => {
                const searchResults = await User.find({ email: value })
                if (searchResults.length == 0) {
                    throw new Error(`Failed login attempt for ${value}.`);
                }
            }),
        body('password')
            .isString()
            .trim()
            .isLength({ min: 6 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { email, password } = req.body;

        // Get user
        const existingUser = await User.findOne({ email: email })

        // TODO: Get specific field from a hash.
        // Check out the HMGET command... https://redis.io/commands/hmget

        // See if the correct password for this email was provided...
        const passwordCorrect = await User.validatePassword(existingUser, password);
        if (!passwordCorrect) {
            // Remove any session this user previously had.
            req.session.destroy();

            const message = `Failed login attempt for ${email}.`
            console.log(message);

            res.status(401).json({ 
                type: 'error',
                resultCode: ResultCode.InvalidCredentials,
                message: message
            })
            return 
        }

        const message = `> Login user ${email}.`
        console.log(message);

        // Add session
        req.session.userId = existingUser.id;
        req.session.email = existingUser.email;

        // Return result
        res.status(200).json({ resultCode: ResultCode.UserLoggedIn })
    },
);
  
// Logout
router.get(
    '/logout',
    (req, res) => {
        // Get session
        const session = req.session
        const { email } = session;
    
        // Destroy the session
        session.destroy((err) => {
            if (err) {
                console.log('Error performing logout:');
                console.log(err);
                return
            }

            if (email) {
                console.log(`> Logout user ${email}.`);
            } else {
                console.log('Logout called by a user without a session.');
            }
        });

        // Send OK
        res.send('OK');
    },
);

module.exports = router;