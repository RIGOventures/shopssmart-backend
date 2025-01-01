// Import environment variables
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const { RedisStore } = require("connect-redis")

const cors = require('cors');

// Get Redis function
const { getClient } = require("@/database/redis");

// Get Redis client
const redis = getClient();

// Create server handler
const app = express();
app.use(cors());
app.use(express.json());

// Initialise store.
let redisStore = new RedisStore({
    client: redis,
    // prefix: getKeyName(keyPrefix), default: 'sess'
})

// Create session
const pkg = require('@/package.json');
app.use(session({
    name: pkg.name,
    secret: process.env.AUTH_SECRET,
    store: redisStore,
    resave: false,
    saveUninitialized: true,
}));
  

// Sets up these routes on a base '/' route
const routes = require('./routes');
app.use(
    '/', 
    routes 
); 

// Default response
app.get(
    '/',
    async (req, res) => {
        res.status(200).send('OK');
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