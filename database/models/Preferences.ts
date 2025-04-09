import { Entity } from 'redis-om'

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
 *              lifestyle: Keto
 *              allergen: Nuts
 *              other: I like Icecream
 */

/* define Preferences entity */
export interface Preferences extends Entity {
    /* add aspects of Preferences */
    lifestyle?: string
    allergen?: string, 
    other?: string
}

/* define default Preferences */
export const PREFERENCE_TEMPLATE = {
    lifestyle: "", 
    allergen: "", 
    other: "",  
}

/* create Preferences */
export const createPreferences = async (preferences: Preferences) => {
    // TODO: check the Preferences

    // save Preferences
    return preferences
}
