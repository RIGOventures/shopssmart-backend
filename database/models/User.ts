/**
 * @swagger
 * components:
 *  schemas:
 *      User:
 *          type: object
 *          required:
 *              - email
 *              - password
 *          properties:
 *              id:
 *                  type: string
 *                  description: The auto-generated id of the user
 *              username:
 *                  type: string
 *                  description: The username of the user
 *              email:
 *                  type: string
 *                  description: The email of the user
 *              password:
 *                  type: string
 *                  description: The password of the user
 *              profileId:
 *                  type: string
 *                  description: The foreign key of a profile
 *          example:
 *              id: 410544b2-4001-4271-9855-fec4b6a6442a
 *              email: user-family@test.com
 *              password: LongTestPassword
 */

// Get Redis functions
const { 
    getClient,  
    getKeyName 
} = require("@/redis");

// Get Redis client
const redis = getClient();

const bcrypt = require('bcrypt')

// Define key
const MODEL_KEY = "users"

// Define search schema. 
const SEARCH_SCHEMA = ['email', 'TAG', 'username', 'TEXT']

// Get base model
const Model = require("@/models/Model");

// Get Profile model
const Profile = require("@/models/Profile");

// Get Profile model
const { template } = require("@/models/Preference")
const PREFERENCE_TEMPLATE = template

// Define user class
class User extends Model {
    constructor(keyName: string) {
        super(keyName);
    }
}

// Create user
const create = async function(email: string, password: string) {
    // Encrypt password
    const saltRounds = 10; // Typically a value between 10 and 12
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Define object
    const user = {
        email,
        password: hashedPassword
    } 

    // Set object
    return await Model.prototype.create.call(this, user)
}
User.prototype.create = create

// Create many user
const createMany = async function(jsonArray: [ any ]) {
    // Hash the passwords...
    /* eslint-disable array-callback-return, no-param-reassign */
    const saltRounds = 10; // Typically a value between 10 and 12
    jsonArray.map((user) => {
        user.password = bcrypt.hashSync(user.password, saltRounds);
    });
    /* eslint-enable */

    return await Model.prototype.createMany.call(this, jsonArray)
}
User.prototype.createMany = createMany

const createSearchIndex = async function() {
    return Model.prototype.createSearchIndex.call(this, SEARCH_SCHEMA)
}
User.prototype.createSearchIndex = createSearchIndex

// Set a foreign record
const linkForeignRecord = async function(userId: string, index: string, record: { id: string }) {
    const pipeline = redis.pipeline()
    
    // Set foreign key
    const foreignKey = getKeyName(MODEL_KEY, index, userId)

    // Get the primary key
    const primaryKey = getKeyName(index, record.id)
    pipeline.zadd(foreignKey, Date.now(), primaryKey)

    await pipeline.exec()
}
User.prototype.linkForeignRecord = linkForeignRecord

// Get a foreign record
const getForeignRecord = async function(userId: string, index: string, id: string) {
    // Get the record
    const record = await Model.prototype.findById.call({ keyName: index }, id)

    // If empty list key does not exist. 
    if (record == undefined) {
        const foreignKey = getKeyName(index, id)
        throw new Error(`${foreignKey} does not exist`)
    }

    // Compare with session.userId
    if (record.userId != userId) {
        throw new Error('Unauthorized')
    }

    return record
}
User.prototype.getForeignRecord = getForeignRecord

// Delete a foreign record
const deleteForeignRecord = async (userId: string, index: string, id: string) => {
    // Get record
    const record = await getForeignRecord(userId, index, id)

    // Delete the record
    const primaryKey = getKeyName(index, record.id)
    await redis.del(primaryKey)

    // Remove the foreign key
    const foreignKey = getKeyName(MODEL_KEY, index, record.userId)
    await redis.zrem(foreignKey, primaryKey)
}
User.prototype.deleteForeignRecord = deleteForeignRecord

// Get foreign records
const getForeignRecords = async function(userId: string, index: string) {
    const pipeline = redis.pipeline()

    // Fetch all the records stored with the user in reverse order
    const foreignKey = getKeyName(MODEL_KEY, index, userId)
    const records: string[] = await redis.zrange(foreignKey, 0, -1, 'REV')

    // Get all records saved
    for (const record of records) {
        pipeline.hgetall(record)
    }

    const results = await pipeline.exec()
    
    // Flatten and filter results
    const filtered = results.flat().filter(function (el) { return el != null; });
    return filtered
}
User.prototype.getForeignRecords = getForeignRecords

// Delete foreign records
const deleteForeignRecords = async function(userId: string, index: string) {
    // Fetch all the records stored with the user
    const foreignKey = getKeyName(MODEL_KEY, index, userId)
    const records: string[] = await redis.zrange(foreignKey, 0, -1)
    if (!records.length) {
        return
    }

    // Start pipeline
    const pipeline = redis.pipeline()

    // Get all records
    for (const record of records) {
        pipeline.del(record)
        pipeline.zrem(foreignKey, record)
    }

    await pipeline.exec()
}
User.prototype.deleteForeignRecords = deleteForeignRecords

// Validate a password.
const validatePassword = async function(user: User, password: string) {
    // See if the correct password for this email was provided...
    const passwordCorrect = await bcrypt.compare(password, user.password);
    return passwordCorrect
}
User.prototype.validatePassword = validatePassword

// Get profile
const getProfile = async function(user: User) {
    // Get key
    const profileId = user.profileId
    if (!profileId) {
        return
    }

    // Get profile
    const profile = await Profile.findById(profileId)
    // Return result
    return profile
}   
User.prototype.getProfile = getProfile

// Get profile + preferences.
const getPreferences = async function(user: User) {
    // Get profile
    const profile = await getProfile(user)
    if (!profile) {
        return PREFERENCE_TEMPLATE
    }

    // Get preference
    const preference = await Profile.getPreferences(profile.id)
    // Return result
    return preference
}   
User.prototype.getPreferences = getPreferences

module.exports = new User(MODEL_KEY)