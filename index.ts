import { config } from 'dotenv'
config(); // fetch Environment variables

// Get Redis client
import { client } from "@/redis";

// Get server services
import express from 'express';
import cors from 'cors';

// Create server handler
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialise store.
import { RedisStore } from "connect-redis"
let redisStore = new RedisStore({
    client: client,
    // prefix: getKeyName(keyPrefix), default: 'sess'
})

// Create session
import session from 'express-session';
import * as pkg from '@/package.json';
app.use(session({
    name: pkg.name,
    secret: process.env.AUTH_SECRET,
    store: redisStore,
    resave: false,
    saveUninitialized: true,
}));
  
// Sets up these routes on a base '/' route
import routes from './routes';
app.use(
    '/', 
    routes
);


// (Optional) The port the server is running behind
const port = parseInt(process.env.PORT || '3000', 10)

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
    basePath: '/', // Base path (optional)
    servers: [
        { url: `http://localhost:${port}` },
        { url: `https://shopssmart-backend.onrender.com` }
    ],
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

// Create Swagger specification
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
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
});

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

// (Optional) Whether or not to launch Next.js in dev mode. 
const dev = process.env.NODE_ENV !== 'production' 

// Listen on server
app.listen(port, () => {
    // Log ready
    console.log(`Started ${dev ? 'development' : process.env.NODE_ENV} server on http://localhost:${port}`)
})