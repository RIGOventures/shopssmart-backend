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

import { EntityId } from "redis-om";
import { createUser, getProfile, userRepository, profileRepository } from "@/database/types";

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
        let user = await createUser(email, password)

        // check User created
        let noOfUserKeys = Object.keys(user).length
        if (noOfUserKeys == 0) {
            // return success
            res.status(201).json({ resultCode: ResultCode.UserCreated })
            return 
        }
    
        // return fail
        res.status(500).json({ resultCode: ResultCode.UnknownError })
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
            .isLength({ min: 1 })
            .custom(async (value, { req }) => {
                // fetch User with id
                const existingUser = await userRepository.fetch(value)

                // check User exists
                let noOfUserKeys = Object.keys(existingUser).length
                if (noOfUserKeys == 0) {
                    throw new ResultError(`Failed login attempt for ${value}.`, ResultCode.InvalidCredentials);
                }
                
                // add User to request
                req.body.user = existingUser
            }),
        reportValidationError,
    ],
    async (req, res) => {
        const { user } = req.body;

        // Remove sensitive fields
        SENSITIVE_FIELD_NAMES.map((fieldName) => delete user[fieldName]);

        // Return filtered user
        res.status(200).json(user);
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
                const existingUser = await userRepository.fetch(value)

                // check User exists
                let noOfUserKeys = Object.keys(existingUser).length
                if (noOfUserKeys == 0) {
                    throw new ResultError(`Failed login attempt for ${value}.`, ResultCode.InvalidCredentials);
                }
                
                // add User to request
                req.body.user = existingUser
            }),
        body().isObject(),
        body('profileId')
            .isString()
            .isLength({ min: 1 })
            .custom(async (value, { req }) => {
                // fetch Profile with id
                const existingProfile = await profileRepository.fetch(value)

                // check Profile exists
                let noOfUserKeys = Object.keys(existingProfile).length
                if (noOfUserKeys == 0) {
                    throw new ResultError(`Profile ${value} does not exist.`, ResultCode.InvalidCredentials);
                }

                // add Profile to request
                req.body.profile = existingProfile
            }),
        reportValidationError,
    ],
    async (req, res) => {
        const { user, profile } = req.body;

        // update User with Profile id
        user.profileId = profile[EntityId]

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
            .isLength({ min: 1 })
            .custom(async (value, { req }) => {
                // fetch User with id
                const existingUser = await userRepository.fetch(value)

                // check User exists
                let noOfUserKeys = Object.keys(existingUser).length
                if (noOfUserKeys == 0) {
                    throw new ResultError(`Failed login attempt for ${value}.`, ResultCode.InvalidCredentials);
                }
                
                // add User to request
                req.body.user = existingUser
            }),
        reportValidationError,
    ],
    async (req, res) => {
        const { user } = req.body;

        // get Profile
        const profile = await getProfile(user)

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
            .isLength({ min: 1 })
            .custom(async (value, { req }) => {
                // fetch User with id
                const existingUser = await userRepository.fetch(value)

                // check User exists
                let noOfUserKeys = Object.keys(existingUser).length
                if (noOfUserKeys == 0) {
                    throw new ResultError(`Failed login attempt for ${value}.`, ResultCode.InvalidCredentials);
                }
                
                // add User to request
                req.body.user = existingUser
            }),
        reportValidationError,
    ],
    async (req, res) => {
        const { user } = req.body;

        // get Profile
        const profile = await getProfile(user)

        // check Profile exists
        let noOfUserKeys = Object.keys(profile).length
        if (noOfUserKeys == 0) {
            // return fail
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials })
            return
        }

        // return Preferences
        res.status(200).json(profile.preferences);
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
            .isEmail()
            .custom(async (value, { req }) => {
                // find all Users that match this email
                const results = await userRepository.search()
                    .where('email').equals(value)


                // check if this email was found
                let noOfResults = await results.count()
                if (noOfResults == 0) {
                    throw new ResultError(`Failed login attempt for ${value}.`, ResultCode.InvalidCredentials);
                }

                // add User to request
                req.body.user = await results.first()
            }),
        reportValidationError,
    ],
    async (req, res) => {
        const { user } = req.body;

        // Remove sensitive fields
        SENSITIVE_FIELD_NAMES.map((fieldName) => delete user[fieldName]);

        // Return filtered user
        res.status(200).json(user);
    },
);

module.exports = router