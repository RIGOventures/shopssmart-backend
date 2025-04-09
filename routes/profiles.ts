import _ from 'lodash'

/**
 * @swagger
 * tags:
 *  name: Profiles
 *  description: Profile administration
 */

import express from 'express';
const router = express.Router(); // create router

import { header, body, param } from 'express-validator';

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
 * definitions:
 *  CreatePreferences:
 *      properties:
 *          lifestyle: 
 *              type: string
 *          allergen:
 *              type: string
 *          other:
 *              type: string
 *      example:
 *          lifestyle: Diabetes
 *          allergen: Nuts
 *          other: N/A
 */

import { ResultCode, ResultError } from '@/utils/result'
import { isAuthenticated, reportValidationError } from '@/utils/middleware'; 

import { createProfile, userSchema, profileRepository, createPreferences } from '@/types'
import { getKeyName, insertSortedRecord, deleteSortedRecord, getSortedSet } from '@/database/redis';

/* define User Profile set key */
const USER_PROFILE_SET_KEY = getKeyName(userSchema.schemaName, 'profiles')

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

        // get Session
        const { userId } = req.session;

        // create Profile
        let profile = await createProfile(profileName, userId)

        // check Profile created
        let noOfUserKeys = Object.keys(profile).length
        if (noOfUserKeys == 0) {
            // return fail
            res.status(500).json({ resultCode: ResultCode.UnknownError })
            return 
        }

        // insert Profile to a sorted set
        await insertSortedRecord(USER_PROFILE_SET_KEY, userId, profile)

        // return success
        res.status(201).json({ resultCode: ResultCode.ProfileCreated });
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
        // get Session
        const { userId } = req.session;

        // get Profiles
        const profiles = await getSortedSet(USER_PROFILE_SET_KEY, userId, profileRepository)

        // return result
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
        const { profile } = req.body;

        // get Session
        const { userId } = req.session;

        // Compare with session.userId
        if (profile.userId != userId) {
            // return fail
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials })
            return
        }

        // return result
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
        const { id } = req.params;
        const { profile } = req.body;

        // get Session
        const { userId } = req.session;

        // Compare with session.userId
        if (profile.userId != userId) {
            // return fail
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials })
            return
        }

        // delete Profile from sorted set
        await deleteSortedRecord(USER_PROFILE_SET_KEY, userId, profile)

        // delete Profile
        await profileRepository.remove(id)

        // return result
        res.status(200).json({ resultCode: ResultCode.ProfileUpdated });
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
*      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      $ref: '#/definitions/CreatePreferences'
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
        const { profile, lifestyle, allergen, other } = req.body;

        // create Preferences
        let preferences = createPreferences({
            lifestyle, 
            allergen, 
            other
        })

        // add preferences to Profile
        profile.preferences = preferences

        // save Profile
        let savedProfile = await profileRepository.save(profile)
        
        // check Preferences
        if (!_.isEqual(savedProfile.preferences, preferences)) {
            res.status(400).json({ resultCode: ResultCode.InvalidCredentials });
            return
        }

        // return result
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
        const { profile } = req.body;

        // return result
        res.status(200).json(profile.preferences);
    }
);

module.exports = router