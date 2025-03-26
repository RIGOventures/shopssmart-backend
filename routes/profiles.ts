/**
 * @swagger
 * tags:
 *  name: Profiles
 *  description: Profile administration
 */

import express from 'express';
const router = express.Router(); // create router

import { header, body, param } from 'express-validator';

import { ResultCode, ResultError } from '@/utils/result'

import { isAuthenticated, reportValidationError } from '@/utils/middleware'; 

import { createUser, getProfile, getPreferences, userRepository, profileRepository } from '@/types'

/**
 * @swagger
 * definitions:
 *  CreateProfile:
 *      required:
 *          - profileName
 *      properties:
 *          profileName: 
 *              type: string
 *      example:
 *          profileName: Family Dinner
 */

/**
 * @swagger
 * /profile:
 *  post:
 *      summary: Create a user profile
 *      tags: [Profiles]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      $ref: '#/definitions/CreateProfile'
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
    '/profile',
    [
        header()
            .custom(isAuthenticated),
        body().isObject(),
        body('profileName', "Profile name is required")
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { profileName } = req.body;

        // Get session
        const { userId } = req.session;

        // Create profile
        const [result, profile] = await Profile.create(profileName, userId)

        // Link profile
        await User.linkForeignRecord(userId, 'profiles', profile)

        // Return result
        res.status(201).json(profile);
    }
);

/**
 * @swagger
 * /profile:
 *  get:
 *      summary: Get all the user's profiles
 *      tags: [Profiles]
 *      responses:
 *          200:
 *              description: The response code
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          $ref: '#/components/Profile'
 */
router.get(
    '/profile',
    [
        header()
            .custom(isAuthenticated),
        reportValidationError,
    ],
    async (req, res) => {
        // Get session
        const { userId } = req.session;

        // Get profiles
        const profiles = await User.getForeignRecords(userId, 'profiles')

        // Return result
        res.status(200).json(profiles);
    }
);

/**
 * @swagger
 * parameters:
 *  profileId:
 *      name: id
 *      description: Profile's id.
 *      in: path
 *      required: true
 *      type: string
 */

/**
 * @swagger
 * /profile/{id}:
 *  get:
 *      summary: Get a profile by id
 *      tags: [Profiles]
 *      parameters:
 *          - $ref: '#/parameters/profileId'
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
    '/profile/:id',
    [
        header()
            .custom(isAuthenticated),
        param('id')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;

        // Get session
        const { userId } = req.session;

        // Get record
        const profile = await User.getForeignRecord(userId, 'profiles', id)
        if (!profile) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }
            
        // Return result
        res.status(200).json(profile);
    }
);

/**
 * @swagger
 * /profile/{id}:
 *  delete:
 *      summary: Delete a profile
 *      tags: [Profiles]
 *      parameters:
 *          - $ref: '#/parameters/profileId'
 *      responses:
 *          200:
 *              description: The response code
 *              content:
 *                  text/plain:
 *                      type: string
 *          400:
 *              description: The response code. Cannot find the profile.
 */
router.delete(
    '/profile/:id',
    [
        header()
            .custom(isAuthenticated),
        param('id')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;

        // Get session
        const { userId } = req.session;

        // Delete record
        const result = await User.deleteForeignRecord(userId, 'profiles', id)
        if (result == 0){
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Return result
        res.send("OK");
    }
);

/**
 * @swagger
 * /profile/{id}/preferences:
 *  put:
 *      summary: Set profile preference by id
 *      tags: [Profiles]
 *      parameters:
 *          - $ref: '#/parameters/profileId'
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
    '/profile/:id/preferences',
    [
        param('id')
            .isString()
            .isLength({ min: 1 }),
        body().isObject(),
        body('lifestyle') // TODO: Check as enum
            .isString(), 
        body('allergen') // TODO: Check as enum
            .isString(), 
        body('other')
            .isString(),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;
        const { lifestyle, allergen, other } = req.body;

        // Link preference
        const result = await Profile.setPreferences(id, lifestyle, allergen, other)
        if (result == 0){
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Return result
        res.status(200).json({ resultCode: ResultCode.ProfileUpdated });
    }
);

/**
 * @swagger
 * /profile/{id}/preferences:
 *  get:
 *      summary: Get profile preferences by id
 *      tags: [Profiles]
 *      parameters:
 *          - $ref: '#/parameters/profileId'
 *      responses:
 *          200:
 *              description: The response code
 *              content:
 *                  text/plain:
 *                      type: string
 *          400:
 *              description: The response code. Cannot find the profile.
 */
router.get(
    '/profile/:id/preferences',
    [
        param('id')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { id } = req.params;
        
        // Get preference
        const preferences = await Profile.getPreferences(id)
        if (!preferences){
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // Return result
        res.status(200).json(preferences);
    }
);

module.exports = router