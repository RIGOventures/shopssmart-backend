const router = require('express').Router();
const { body, param } = require('express-validator');

// Types
const { ResultCode } = require('@/utils/result')

const bcrypt = require('bcrypt')

// Get validators
const reportValidationError = require('@/utils/validation/report-validation-error'); // Get error report middleware

// Get Redis function
const { 
    performSearch, 
    getKeyName 
} = require("@/database/redis");

// Get Redis function
const { createUser } = require("@/routes/users");

// Signup user
router.post(
    '/signup',
    [
        body().isObject(),
        body('email')
            .isEmail()
            .trim()
            .custom(async value => {
                // Format email address usable by Redis (do not save this!)
                const emailAddress = value.replace(/\./g, '\\.').replace(/\@/g, '\\@');

                // Search using the formatted email
                const searchResults = await performSearch(getKeyName('users', 'idx'), `@email:{${emailAddress}}`);
                if (searchResults.length >= 1) {
                    // TODO: Send result code { resultCode: ResultCode.UserAlreadyExists }
                    throw new Error('E-mail already in use');
                }
            }),
        body('password')
            .isString()
            .trim()
            .isLength({ min: 6 }),
        reportValidationError,
    ],
    createUser
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
                // Format email address usable by Redis (do not save this!)
                const emailAddress = value.replace(/\./g, '\\.').replace(/\@/g, '\\@');

                // Search using the formatted email
                const searchResults = await performSearch(getKeyName('users', 'idx'), `@email:{${emailAddress}}`);
                if (searchResults.length == 0) {
                    // TODO: Send result code { resultCode: ResultCode.InvalidCredentials }
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
        // Get body
        const { email, password } = req.body;
        
        // Format email address usable by Redis (do not save this!)
        const emailAddress = email.replace(/\./g, '\\.').replace(/\@/g, '\\@');

        // Search for user by email
        const searchResults = await performSearch(getKeyName('users', 'idx'), `@email:{${emailAddress}}`)
        // Get user
        const existingUser = searchResults[0]

        // See if the correct password for this email was provided...
        const passwordCorrect = await bcrypt.compare(password, existingUser.password);
        if (passwordCorrect) {
            console.log(`> Login user ${email}.`);

            // Add session
            req.session.userId = existingUser.id;
            req.session.email = existingUser.email;

            // Redirect?
            res.status(200).json({
                type: 'success',
                resultCode: ResultCode.UserLoggedIn
            })
            return 
        }

        // Remove any session this user previously had.
        req.session.destroy();

        const message = `Failed login attempt for ${email}.`
        console.log(message);

        res.status(401).json({ 
            type: 'error',
            resultCode: ResultCode.InvalidCredentials,
            message: message
        })

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
        session.destroy((e) => {
            if (e) {
                console.log('Error performing logout:');
                console.log(e);
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