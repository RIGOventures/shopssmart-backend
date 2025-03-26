import { Entity, EntityId, Schema, Repository } from 'redis-om'
import { client } from "@/redis";

/**
 * Define user class
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

/* define User entity */
export interface User extends Entity {
    /* add identification for User */
    username?: string,
    name?: string,
    email: string,

    /* add password for User */
    password: string

    /* add foreign key for User's Profile */
    profileId?: string
}

/* create a Schema for User */
export const userSchema = new Schema<User>('user', {
    username: { type: 'text' }, 
    name: { type: 'string' }, 
    email: { type: 'string' }, 
    password: { type: 'string', indexed: false }, 
    profileId: { type: 'string' },
})

/* define User repository */
export const userRepository = new Repository(userSchema, client)

import { compare, hash } from 'bcryptjs';
const saltRounds = 10; // typically a value between 10 and 12

/* create User */
export const createUser = async (email: string, password: string) => {
    // encrypt password
    const hashedPassword = await hash(password, saltRounds);

    // define user
    const user = {
        email,
        password: hashedPassword
    } 

    // save user
    return await userRepository.save(user)
}

/* create multiple User */
export const createUsers = async (array: User[]) => {
    // hash the User's password
    await Promise.all(array.map(user => {
        // update id
        if (user.id) {
            // match id to entityId
            user[EntityId] = `${user.id}`
            // remove id
            delete user['id'] 
        }

        // hash the password
        return hash(user.password, saltRounds).then(function(newPassword: string) {
            user.password = newPassword
        });
    }));

    // save the Users
    // TODO: Stream? https://stackoverflow.com/questions/74162550/how-to-store-data-in-redis-om-for-node-js
    const results = await Promise.all(array.map(user => {
        // save to the repository
        return userRepository.save(user);
    }));

    // count errors
    let errorCount = 0;
    for (const result of results) { 
        // TODO: Count errors from results
        //console.log(result); 
    }
    return errorCount
};

/* validate a password */
export const validatePassword = async (user: User, password: string) => {
    // See if the correct password for this email was provided...
    const passwordCorrect = await compare(password, user.password);
    return passwordCorrect
}

/* get User Profile */
export const getProfile = async (user: User) => {
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

/* get Profile + Preferences */
export const getPreferences = async (user: User) => {
    // Get preference
    const preference = await Profile.getPreferences(user.profileId)
    // Return result
    return preference
} 

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

// Get a foreign record
const getForeignRecord = async function(userId: string, index: string, id: string)  {
    // Get the record
    const record = await Model.prototype.findById.call({ keyName: index }, id)

    // If empty list key does not exist. 
    if (record == undefined) {
        const foreignKey = getKeyName(index, id)
        throw new Error(`${foreignKey} does not exist`)
    }

    // Compare with session.userId
    if (record.userId != userId) {
        const foreignKey = getKeyName(index, id)
        throw new Error(`User ${userId} cannot access ${foreignKey}`)
    }

    // Change based on index
    if (index == "chat") {
        record['messages'] = JSON.parse(record['messages'])
    }

    return record
}

// Delete a foreign record
const deleteForeignRecord = async (userId: string, index: string, id: string) => {
    // Get record
    const record = await getForeignRecord(userId, index, id)

    // Remove the foreign key
    const foreignKey = getKeyName(MODEL_KEY, index, record.userId)
    const primaryKey = getKeyName(index, record.id)
    await redis.zrem(foreignKey, primaryKey)

    // Delete the record
    return await redis.del(primaryKey)
}

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

    // Change based on index
    if (index == "chat") {
        filtered.map((chat) => {
            chat['messages'] = JSON.parse(chat['messages'])
        });
    }

    return filtered
}

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