// Load environment variables
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const { RedisStore } = require('connect-redis');
const cors = require('cors');

// Get Redis client
const { getClient } = require('@/database/redis');
const redisClient = getClient();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Redis store for sessions
const redisStore = new RedisStore({
  client: redisClient,
});

// Session management
const pkg = require('@/package.json');
app.use(
  session({
    name: pkg.name,
    secret: process.env.AUTH_SECRET,
    store: redisStore,
    resave: false,
    saveUninitialized: true,
  })
);

// Set up routes
const routes = require('./routes');
app.use('/', routes);

// Default response
app.get('/', async (req, res) => {
  res.status(200).send('OK');
});

// Server configuration
const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port} (${dev ? 'development' : 'production'})`);
});
