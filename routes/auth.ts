/**
 * @swagger
 * tags:
 *  name: Auth
 *  description: User authentication and login
 */

/**
 * @swagger
 * definitions:
 *  Login:
 *      required:
 *          - email
 *          - password
 *      properties:
 *          email: 
 *              type: string
 *          password:
 *              type: string
 *          path:
 *              type: string
 *      example:
 *          email: user@test.com
 *          password: password
 */

const router = require('express').Router();
const { body, param } = require('express-validator');

// Types
const { ResultCode } = require('@/utils/result')

// Get error report middleware
const { reportValidationError, ResultError } = require('@/utils/validation/report-validation-error'); 

// Get User model
const User = require("@/models/User");

/**
 * @swagger
 * /signup:
 *  post:
 *      summary: Signup a user
 *      tags: [Auth]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      $ref: '#/definitions/Login'
 *      responses:
 *          201:
 *              description: The response code
 *              content:
 *                  text/plain:
 *                      type: string
 *          400:
 *              description: The email is alrady in use
 */
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
                    throw new ResultError(`E-mail ${value} already in use`, ResultCode.UserAlreadyExists);
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
        return res.status(201).json({ resultCode: ResultCode.UserCreated })
    }
);

/**
 * Authenticates credentials against database
 * @swagger
 * /login:
 *  post:
 *      summary: Login a user
 *      description: Login to the application
 *      tags: [Auth]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      $ref: '#/definitions/Login'
 *      responses:
 *          200:
 *              description: Login successful
 *              schema:
 *                  type: object
 *                  $ref: '#/definitions/Login'
 *          401:
 *              description: Failed login attempt
 */
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
                    throw new ResultError(`Failed login attempt for ${value}.`, ResultCode.InvalidCredentials);
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

            return res.status(401).json({ 
                type: 'error',
                resultCode: ResultCode.InvalidCredentials,
                message: message
            })
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
  
/**
 * @swagger
 * /logout:
 *  delete:
 *      summary: Logout a user
 *      description: Logout of the application
 *      tags: [Auth]
 *      responses:
 *          200:
 *              description: OK
 *              content:
 *                  text/plain:
 *                      type: string
 */
router.delete(
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