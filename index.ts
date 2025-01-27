// Import environment variables
require('dotenv').config();

// (Optional) Whether or not to launch Next.js in dev mode. 
const dev = process.env.NODE_ENV !== 'production' 
// (Optional) The port the server is running behind
const port = parseInt(process.env.PORT || '3000', 10)

const express = require('express');
const session = require('express-session');
const { RedisStore } = require("connect-redis")

// API documentation
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const cors = require('cors');

// Get Redis function
const { getClient } = require("@/database/redis");

// Get Redis client
const redis = getClient();

// Create server handler
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Create Swagger definition
// You can set every attribute except paths and swagger
// https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md
const swaggerDefinition = {
    openapi: "3.1.0",
    info: {
        // API informations (required)
        title: "Shopssmart Express API with Swagger", // Title (required)
        version: '1.0.0', // Version (required)
        description: 'A sample API', // Description (optional)
        contact: {
            name: "Shopssmart",
            url: "https://shopssmart.life/",
            email: "info@email.com",
        },
    },
    host: `localhost:${port}`, // Host (optional)
    basePath: '/', // Base path (optional)
    servers: [{ url: `http://localhost:${port}` }],
};

// Initialize swagger-jsdoc -> returns validated swagger spec in json format
const options = {
    definition: swaggerDefinition,
    apis: [
        "index.ts",
        "./routes/*.ts",
        "./database/models/*.ts"
    ],
};
const swaggerSpec = swaggerJsdoc(options);

// Sets up documentation route
app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// Log server errors (not try-catch)
app.use(function (err, req, res, next) {
    console.error(err.stack)
    next(err)
  }
)

// Handle server errors (not try-catch)
app.use(function(err, req, res, next) {
    res.status(err.status || 500).json({ error: err });
});

// Catch any unhandled exception occurs
process.on('uncaughtException', function(err, data) {
    console.log(`Uncaught Exception: ${err.message}`)
    process.exit(1)
})

// Catch any unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at', promise, `reason: ${reason}`)
    process.exit(1)
})

/**
 * Default response
 * @swagger
 * /:
 *   get:
 *     description: Returns the homepage
 *     responses:
 *       200:
 *         description: OK
 */
app.get(
    '/',
    async (req, res) => {
        res.send('OK');
    },
);

// Listen on server
app.listen(port, () => {
    // Log ready
    console.log(
        `> Started ${dev ? 'development' : process.env.NODE_ENV} server on http://localhost:${port}`
    )
})