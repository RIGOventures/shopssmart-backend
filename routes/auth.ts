/**
 * @swagger
 * tags:
 *  name: Auth
 *  description: User authentication and login
 */

import express from 'express';
const router = express.Router(); // create router

import { body, param } from 'express-validator';

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

import { ResultCode, ResultError } from '@/utils/result';

import { reportValidationError } from '@/utils/middleware'; 

import { EntityId } from "redis-om";

import { createUser, validatePassword, userRepository } from "@/database/types";

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
                // find all Users that match this email
                const results = await userRepository.search()
                    .where('email').equals(value)

                // check if this email was found
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
        await createUser(email, password)
    
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
            .custom(async (value, { req }) => {
                // find all Users that match this email
                const results = await userRepository.search()
                    .where('email').equals(value)

                // check if this email was found
                if (results.length == 0) {
                    throw new ResultError(`Failed login attempt for ${value}.`, ResultCode.InvalidCredentials);
                }

                // add User to request
                req.body.user = results[1]
            }),
        body('password')
            .isString()
            .trim()
            .isLength({ min: 6 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { email, password, user } = req.body;

        // TODO: Get specific field from a hash.
        // Check out the HMGET command... https://redis.io/commands/hmget

        // check if the correct password was provided...
        const passwordCorrect = await validatePassword(user, password);
        if (!passwordCorrect) {
            // destroy any existing session
            req.session.destroy();

            // return result
            console.log(`Failed login attempt for ${email}.`);
            res.status(401).json({ resultCode: ResultCode.InvalidCredentials })
            return 
        }

        // add session
        req.session.userId = user[EntityId];
        req.session.email = user.email;

        // return result
        console.log(`Login User ${email}.`);
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
        const session = req.session
        const { email } = session;
    
        // destroy session
        session.destroy((err) => {
            if (err) {
                console.error(err);
                return
            } 

            // log success
            if (email) {
                console.log(`Logout User ${email}.`);
            } else {
                console.log(`Failed logout attempt for ${email}`);
            }
        });

        // send OK
        res.send('OK');
    },
);

module.exports = router