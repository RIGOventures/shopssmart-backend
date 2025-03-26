import { Entity, Schema, Repository } from 'redis-om'
import { client } from "@/redis";

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

// Create profile
export const createProfile = async function(profileName: string, userId: string) {
    // Define object
    const profile = {
        name: profileName,
        userId,
    }

    // Set object
    return await Model.prototype.create.call(this, profile)
}

// Save preferences
const setPreferences = async function(profileId: string, lifestyle: string, allergen: string, other?: string) {
    // Create preference
    const preference = {
        lifestyle: lifestyle,
        allergen: allergen,
        other: other
    } 

    // Get the key
    const key = getKeyName(MODEL_KEY, PREFERENCE_KEY, profileId)

    // Save record
    return await redis.hset(key, preference)
}

// Get preferences
const getPreferences = async function(profileId: string) {
    // Define key
    const key = getKeyName(PREFERENCE_KEY, profileId)

    // Get preferences
    const result = await Model.prototype.findById.call(this, key)
    if (!result) {
        return PREFERENCE_TEMPLATE
    }

    return result
}