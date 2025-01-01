// Import environment variables
require('dotenv').config();

const express = require('express');
const { body } = require('express-validator');
const session = require('express-session');
const { RedisStore } = require("connect-redis")

const cors = require('cors');

const bcrypt = require('bcrypt')

// Get Redis function
const { performSearch, getClient, getKeyName } = require("./database/redis");

// Get Redis client
const redis = getClient();

// Get error report middleware
const reportValidationError = require('./utils/report-validation-error');

// Create server handler
const app = express();
app.use(cors());
app.use(express.json());

// Add api route
const routes = require('./routes');
app.use('/', routes); //sets up these routes on a base '/' route for your site

// Initialise store.
let redisStore = new RedisStore({
    client: redis.getClient(),
    // prefix: getKeyName(keyPrefix), default: 'sess'
})

const pkg = require('package.json');
app.use(session({
    name: pkg.name,
    secret: process.env.AUTH_SECRET,
    store: redisStore,
    resave: false,
    saveUninitialized: true,
}));
  
app.post(
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
  
app.get(
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

// (Optional) Whether or not to launch Next.js in dev mode. 
const dev = process.env.NODE_ENV !== 'production' 
// (Optional) The port the server is running behind
const port = parseInt(process.env.PORT || '3000', 10)

// Listen on server
app.listen(port, () => {
    // Log ready
    console.log(
        `> Started ${dev ? 'development' : process.env.NODE_ENV} server on http://localhost:${port}`
    )
})