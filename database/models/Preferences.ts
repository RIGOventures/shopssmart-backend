import { Entity, Schema, Repository } from 'redis-om'
import { client } from "@/redis";

/**
 * @swagger
 * components:
 *  schemas:
 *      Preferences:
 *          type: object
 *          required:
 *              - lifestyle
 *              - allergen
 *          properties:
 *              lifestyle:
 *                  type: string
 *                  description: Lifestyle choice
 *              allergen:
 *                  type: string
 *                  description: Allergy
 *              other:
 *                  type: string
 *                  description: Some other preference
 *          example:
 *              id: 7d7a9092-666b-4a84-8aad-294d15a306f6
 *              name: Femi
 *              userId: 410544b2-4001-4271-9855-fec4b6a6442a
 */

/* define Preferences entity */
export interface Preferences extends Entity {
    /* add aspects of Preferences */
    lifestyle: string
    allergen: string, 
    other?: string
}

/* create a Schema for Preferences */
export const preferencesSchema = new Schema<Preferences>('preferences', {
    lifestyle: { type: 'string' }, 
    allergen: { type: 'string' }, 
    other: { type: 'string' },
})

/* define Preferences repository */
export const preferencesRepository = new Repository(preferencesSchema, client)

// Define default preferences
const DEFAULT = {
    lifestyle: "", 
    allergen: "", 
    other: "",  
}