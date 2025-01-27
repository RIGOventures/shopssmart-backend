/**
 * @swagger
 * tags:
 *  name: Users
 *  description: User administration
 */

const router = require('express').Router();
const { body, param } = require('express-validator');

// Types
const { ResultCode } = require('@/utils/result')

// Sensitive fields
const SENSITIVE_FIELD_NAMES = ['password'];

// Get validators
const { reportValidationError, ResultError } = require('@/utils/validation/report-validation-error'); // Get error report middleware

// Get User model
const User = require("@/models/User");
// Get Profile model
const Profile = require("@/models/Profile");

/**
 * @swagger
 * /user:
 *  post:
 *      summary: Create a user
 *      tags: [Users]
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
 *                      schema:
 *                          type: string
 *          400:
 *              description: The email is alrady in use
 */
router.post(
    '/user',
    [
        body().isObject(),
        body('email')
            .isEmail()
            .trim()
            .custom(async value => {
                const results = await User.find({ email: value })
                if (results.length >= 1) {
                    throw new ResultError('E-mail already in use', ResultCode.UserAlreadyExists);
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
 * @swagger
 * /user:
 *  get:
 *      summary: Get all users
 *      tags: [Users]
 *      responses:
 *          200:
 *              description: The response code
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          $ref: '#/components/User'
 */
router.get(
    '/user',
    [
        reportValidationError,
    ],
    async (req, res) => {
        // Get users
        const results = await User.find()

        // Remove sensitive fields
        SENSITIVE_FIELD_NAMES.map((fieldName) =>
            results.forEach(function(existingUser){ delete existingUser[fieldName] }));

        // Return filtered user
        res.status(200).json(results);
    }
);

/**
 * @swagger
 * parameters:
 *  userId:
 *      name: id
 *      description: User's id.
 *      in: path
 *      required: true
 *      type: string
 */

/**
 * @swagger
 * /user/{id}:
 *  get:
 *      summary: Get a user by id
 *      tags: [Users]
 *      parameters:
 *          - $ref: '#/parameters/userId'
 *      responses:
 *          200:
 *              description: The user
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          $ref: '#/components/User'
 *          400:
 *              description: The response code. Cannot find the user.
 */
router.get(
    '/user/:id',
    [
        param('id')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;
        
        // Find user
        const existingUser = await User.findById(id)
        if (!existingUser) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Remove sensitive fields
        SENSITIVE_FIELD_NAMES.map((fieldName) => delete existingUser[fieldName]);

        // Return filtered user
        res.status(200).json(existingUser);
    },
);

/**
 * @swagger
 * /user/{id}:
 *  delete:
 *      summary: Delete a user
 *      tags: [Users]
 *      parameters:
 *          - $ref: '#/parameters/userId'
 *      responses:
 *          200:
 *              description: The response code
 *              content:
 *                  text/plain:
 *                      type: string
 *          400:
 *              description: The response code. Cannot find the user.
 */
router.delete(
    '/user/:id',
    [
        param('id')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;
        
        // Delete user
        const result = await User.deleteOne({ id: id })
        if (result == 0){
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }
        
        // Return result
        res.status(200).json({ resultCode: ResultCode.UserUpdated });
    }
);


/**
 * @swagger
 * /user/{id}/profile:
 *  put:
 *      summary: Set a user's profile id
 *      tags: [Users]
 *      parameters:
 *          - $ref: '#/parameters/userId'
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      $ref: '#/definitions/Login'
 *      responses:
 *          200:
 *              description: The response code
 *              content:
 *                  text/plain:
 *                      type: string
 *          400:
 *              description: The response code. Cannot find the profile.
 */
router.put(
    '/user/:id/profile',
    [
        param('id')
            .isString()
            .isLength({ min: 1 })
            .custom(async value => {
                const results = User.findById(value)
                if (results.length == 0) {
                    throw new ResultError(`Failed login attempt for ${value}.`, ResultCode.InvalidCredentials);
                }
            }),
        body().isObject(),
        body('profileId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;
        const { profileId } = req.body;

        // Get profile (to ensure it exists)
        const profile = await Profile.findById(profileId)
        if (!profile) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Update user
        await User.updateOne({ id: id }, { profileId: profile.id })

        // Return result
        res.status(200).json({ resultCode: ResultCode.UserUpdated });
    }
);

/**
 * @swagger
 * /user/{id}/profile:
 *  get:
 *      summary: Get the profile set to the user by its profile id
 *      tags: [Users]
 *      parameters:
 *          - $ref: '#/parameters/userId'
 *      responses:
 *          200:
 *              description: The profile
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          $ref: '#/components/Profile'
 *          400:
 *              description: The response code. Cannot find the profile.
 */
router.get(
    '/user/:id/profile',
    [
        param('id')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;

        // Find user
        const existingUser = await User.findById(id)
        if (!existingUser) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Get profile
        const profile = await User.getProfile(existingUser)
        // Return profile
        res.status(200).json(profile);
    }
);

/**
 * @swagger
 * /user/{id}/preferences:
 *  get:
 *      summary: Get a user's profile preferences
 *      tags: [Users]
 *      parameters:
 *          - $ref: '#/parameters/userId'
 *      responses:
 *          200:
 *              description: The response code
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          $ref: '#/components/Preferences'
 *          400:
 *              description: The response code. Cannot find the profile.
 *              content:
 *                  text/plain:
 *                      type: string
 */
router.get(
    '/user/:id/preferences',
    [
        param('id')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;

        // Find user
        const existingUser = await User.findById(id)
        if (!existingUser) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Get preferences
        const preferences = await User.getPreferences(existingUser)
        // Return preferences
        res.status(200).json(preferences);
    }
);

/**
 * @swagger
 * parameters:
 *  userEmail:
 *      name: email
 *      description: User's email.
 *      in: path
 *      required: true
 *      type: string
 */

/**
 * @swagger
 * /user/email/{email}:
 *  get:
 *      summary: Get a user by email address
 *      tags: [Users]
 *      parameters:
 *          - $ref: '#/parameters/userEmail'
 *      responses:
 *          200:
 *              description: The user
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          $ref: '#/components/User'
 *          400:
 *              description: The response code. Cannot find the user.
 *              content:
 *                  text/plain:
 *                      type: string
 */
router.get(
    '/user/email/:email',
    [
        param('email')
            .isEmail(),
        reportValidationError,
    ],
    async (req, res) => {
        // Get parameters
        const { email } = req.params;

        // Get user
        const existingUser = await User.findOne({ email: email })
        if (!existingUser) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Remove sensitive fields
        SENSITIVE_FIELD_NAMES.map((fieldName) => delete existingUser[fieldName]);

        // Return filtered user
        res.status(200).json(existingUser);
    },
);

module.exports = router;