/**
 * @swagger
 * tags:
 *  name: Users
 *  description: User administration
 */

import express from 'express';
const router = express.Router(); // create router

import { body, param } from 'express-validator';

import { ResultCode, ResultError } from '@/utils/result';

import { reportValidationError } from '@/utils/middleware'; 

import { createUser, getProfile, getPreferences, userRepository, profileRepository } from "@/database/types";

// define sensitive User fields
const SENSITIVE_FIELD_NAMES = ['password'];

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
                // find all Users that match this email
                const results = await userRepository.search()
                    .where('email').equals(value)

                // check if this email was found
                let noOfResults = await results.count()
                if (noOfResults >= 1) {
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
        const { email, password } = req.body;
    
        // create User
        await createUser(email, password)
    
        // return success
        res.status(201).json({ resultCode: ResultCode.UserCreated })
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
        // get Users
        const results = await userRepository.search().return.all()

        // remove sensitive fields
        SENSITIVE_FIELD_NAMES.map((fieldName) =>
            results.forEach(function(existingUser){ delete existingUser[fieldName] }));

        // return filtered User
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
        
        // find User
        const existingUser = await userRepository.fetch(id)

        // check User exists
        let noOfUserKeys = Object.keys(existingUser).length
        if (noOfUserKeys < 1) {
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
        
        // delete User
        await userRepository.remove(id)
        
        // return result
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
            .custom(async (value, { req }) => {
                // fetch User with id
                const existingUser = userRepository.fetch(value)

                // check User exists
                let noOfUserKeys = Object.keys(existingUser).length
                if (noOfUserKeys < 1) {
                    throw new ResultError(`Failed login attempt for ${value}.`, ResultCode.InvalidCredentials);
                }
                
                // add User to request
                req.boy.user = existingUser
            }),
        body().isObject(),
        body('profileId')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;
        const { user, profileId } = req.body;

        // fetch Profile with id
        const existingProfile = profileRepository.fetch(profileId)

        // check Profile exists
        let noOfUserKeys = Object.keys(existingProfile).length
        if (noOfUserKeys < 1) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // update User with Profile id
        user.profileId = profileId

        // save User
        await userRepository.save(user)

        // return result
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

        // fetch User with id
        const existingUser = await userRepository.fetch(id)

        // check User exists
        let noOfUserKeys = Object.keys(existingUser).length
        if (noOfUserKeys < 1) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // get Profile
        const profile = await getProfile(existingUser)

        // return Profile
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

        // fetch User with id
        const existingUser = await userRepository.fetch(id)

        // check User exists
        let noOfUserKeys = Object.keys(existingUser).length
        if (noOfUserKeys < 1) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // get Preferences
        const preferences = await getPreferences(existingUser)

        // return Preferences
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
        const { email } = req.params;

        // find all Users that match this email
        const results = await userRepository.search()
            .where('email').equals(email)

        // get User
        const existingUser = results[1]
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

module.exports = router