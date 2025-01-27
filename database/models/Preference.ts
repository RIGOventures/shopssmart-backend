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

// Define key
const MODEL_KEY = "preferences"

// Get default model
const Model = require("@/models/Model")

// Define default preferences
const DEFAULT = {
    lifestyle: "", 
    allergen: "", 
    other: "",  
}

// Define profile class
class Preference extends Model {
    constructor(keyName: string) {
        super(keyName);
    }
}

module.exports = new Preference(MODEL_KEY)

// Export constants
module.exports.key = MODEL_KEY
module.exports.template = DEFAULT