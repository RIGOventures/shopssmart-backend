/**
 * @swagger
 * tags:
 *  name: Sample
 *  description: Sample chat interaction
 */

import express from 'express';
const router = express.Router(); // create router

import { body } from 'express-validator';

import { pipeline } from "node:stream/promises";

import { rateLimit, reportValidationError } from '@/utils/middleware';

import { submitPrompt } from "@/model/vertex";

/**
 * @swagger
 * definitions:
 *  AddPreferences:
 *      properties:
 *          lifestyle: 
 *              type: string
 *          allergen:
 *              type: string
 *          other:
 *              type: string
 *      example:
 *          { "lifestyle": 'diabetes', "allergen": "Nuts", "other": "none" }
 */

/**
 * @swagger
 * /message/sample:
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
 *                          preferences:
 *                              type: object
 *                              $ref: '#/definitions/AddPreferences'
 *      responses:
 *          200:
 *              description: The response message.
 *          400:
 *              description: Some error.
 */
router.post(
    '/message/sample',
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
