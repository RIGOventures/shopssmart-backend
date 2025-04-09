/**
 * @swagger
 * tags:
 *  name: Sample
 *  description: Sample chat interaction
 */

import express from 'express';
const router = express.Router(); // create router

import { body } from 'express-validator';

import { rateLimit, reportValidationError } from '@/utils/middleware';

import { pipeline } from "node:stream/promises";
import { submitPrompt } from "@/model/vertex";

/**
 * @swagger
 * /message:
 *  post:
 *      summary: Get a chat response
 *      tags: [Sample]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          content:
 *                              type: string
 *      responses:
 *          200:
 *              description: The response code
 *          400:
 *              description: The response code. Cannot find the chat.
 */
router.post(
    '/message',
    [
        rateLimit,
        body().isObject(),
        body('content')
            .isString()
            .isLength({ min: 1 }),
        reportValidationError,
    ],
    async (req, res) => {
        const { content } = req.body;

        // Handle on finish
        async function onFinish({ text }: { text: string }) {
            // End stream
            res.end(text)
        }

        // Submit message
        const streamResponse = await submitPrompt(content, {}, onFinish)

        // Pipe stream to response!
        await pipeline(streamResponse.body, res);
    }
)

/**
 * @swagger
 * /message/preferences:
 *  post:
 *      summary: Get a chat response with preferences
 *      tags: [Sample]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          content:
 *                              type: string
 *                          preferences:
 *                              type: object
 *                              $ref: '#/definitions/CreatePreferences'
 *      responses:
 *          200:
 *              description: The response message.
 *          400:
 *              description: Some error.
 */
router.post(
    '/message/preferences',
    [
        rateLimit,
        body().isObject(),
        body('content')
            .isString()
            .isLength({ min: 1 }),
        body('preferences')
            .isObject(),
        reportValidationError,
    ],
    async (req, res) => {
        const { content, preferences } = req.body;

        // Handle on finish
        async function onFinish({ text }: { text: string }) {
            // End stream
            res.end(text)
        }

        // Submit message
        const streamResponse = await submitPrompt(content, preferences, onFinish)

        // Pipe stream to response!
        await pipeline(streamResponse.body, res);
    }
)

module.exports = router
