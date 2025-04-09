import { Entity, EntityId, Schema, Repository } from 'redis-om'
import { client } from "@/redis";

import { profileRepository } from "@/models/Profile";

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

    // define User
    const user = {
        email,
        password: hashedPassword
    } 

    // save User
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
    // get Profile foreign key
    const profileId = user.profileId
    if (!profileId) return {}

    // get Profile
    const profile = await profileRepository.fetch(profileId)
    // return result
    return profile
} 