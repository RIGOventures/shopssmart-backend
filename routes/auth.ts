const router = require('express').Router();
const { body, param } = require('express-validator');

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

// Login at a user
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

        const searchResults = await performSearch(getKeyName('users', 'idx'), `@email:{${emailAddress}}`, 'RETURN', '1', 'password');
        // Valid searchResults looks like [ { password: 'ssssh' } ] but the password has
        // been encrypted with bcrypt (the dataloader encrypts passwords when loading data).

        if (searchResults.length === 1) {
            // See if the correct password for this email was provided...
            const passwordCorrect = await bcrypt.compare(password, searchResults[0].password);
            if (passwordCorrect) {
                console.log(`> Login for ${email}.`);
                req.session.user = email;
                return res.send('OK');
            }
        }
    
        // Remove any session this user previously had.
        req.session.destroy();
    
        console.log(`Failed login attempt for ${email}.`);
        return res.status(401).send('Invalid login.');
    },
);
  
// Logout
router.get(
    '/logout',
    (req, res) => {
        const { user } = req.session;
    
        req.session.destroy((err) => {
            if (err) {
                console.log('Error performing logout:');
                console.log(err);
            } else if (user) {
                console.log(`Logged out user ${user}.`);
            } else {
                console.log('Logout called by a user without a session.');
            }
        });
    
        res.send('OK');
    },
);

module.exports = router;