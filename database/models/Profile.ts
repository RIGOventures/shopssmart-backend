import { Entity, Schema, Repository } from 'redis-om'
import { client } from "@/redis";

import { Preferences } from "@/models/Preferences";

/**
 * @swagger
 * components:
 *  schemas:
 *      Profile:
 *          type: object
 *          required:
 *              - name
 *              - userId
 *          properties:
 *              id:
 *                  type: string
 *                  description: The auto-generated id of the profile
 *              name:
 *                  type: string
 *                  description: The name of the profile
 *              userId:
 *                  type: string
 *                  description: The foreign key of a user
 *          example:
 *              id: 7d7a9092-666b-4a84-8aad-294d15a306f6
 *              name: Femi
 *              userId: 410544b2-4001-4271-9855-fec4b6a6442a
 */

/* define Profile entity */
export interface Profile extends Entity {
    /* add identification for Profile */
    name?: string,

    /* add Preferences for Profile */
    preferences?: Preferences,

    /* add foreign key for Profile */
    userId?: string
}

/* create a Schema for Profile */
export const profileSchema = new Schema<Profile>('profile', {
    name: { type: 'string' }, 
    userId: { type: 'string' },
})

/* define Profile repository */
export const profileRepository = new Repository(profileSchema, client)

/* create Profile */
export const createProfile = async (name: string, userId: string) => {
    // define Profile
    const profile = {
        name: name,
        userId,
    }

    // save Profile
    return await profileRepository.save(profile)
}