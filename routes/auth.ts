const router = require('express').Router();
const { body, param } = require('express-validator');

const { ResultCode } = require('@/utils/result')

const bcrypt = require('bcrypt')

// Get Redis function
const { performSearch, getKeyName } = require("@/database/redis");

// Get Redis function
const { createUser } = require("@/routes/users");

// Get error report middleware
const reportValidationError = require('@/utils/report-validation-error');

// Signup user
router.post(
    '/signup',
    [
        body().isObject(),
        body('email').isEmail(),
        body('password').isString({ min: 6 }),
        reportValidationError,
    ],
    createUser
);

// Authenticates credentials against database
router.post(
    '/login',
    [
        body().isObject(),
        body('email').isEmail(),
        body('password').isString(),
        reportValidationError,
    ],
    async (req, res) => {
        const { email, password } = req.body;
        // Need to escape . and @ in the email address when searching.
        const emailAddress = email.replace(/\./g, '\\.').replace(/\@/g, '\\@');

        // Valid searchResults looks like [ { password: 'ssssh' } ] but the password has
        // been encrypted with bcrypt (the dataloader encrypts passwords when loading data).
        const searchResults = await performSearch(getKeyName('users', 'idx'), `@email:{${emailAddress}}`) //, 'RETURN', '1', 'password');
        if (searchResults.length >= 1) {
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
                return res.status(200).json({
                    type: 'success',
                    resultCode: ResultCode.UserLoggedIn
                })
            }
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
        const { email } = req.session;
    
        req.session.destroy((e) => {
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

        res.send('OK');
    },
);

module.exports = router;