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

// Get Redis functions
const { 
    getClient, 
    getKeyName 
} = require("@/redis");

// Get Redis client
const redis = getClient();

// Define key
const MODEL_KEY = "profiles"

// Get default model
const Model = require("@/models/Model")

// Get preference model
const { key } = require("@/models/Preference")
const PREFERENCE_KEY = key

// Define profile class
class Profile extends Model {
    constructor(keyName: string) {
        super(keyName);
    }
}

// Create profile
const create = async function(profileName: string, userId: string) {
    // Define object
    const profile = {
        name: profileName,
        userId,
    }

    // Set object
    return await Model.prototype.create.call(this, profile)
}
Profile.prototype.create = create

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
Profile.prototype.setPreferences = setPreferences

// Get preferences
const getPreferences = async function(profileId: string) {
    // Get the record
    const key = getKeyName(PREFERENCE_KEY, profileId)
    return await Model.prototype.findById.call(this, key)
}
Profile.prototype.getPreferences = getPreferences

module.exports = new Profile(MODEL_KEY)