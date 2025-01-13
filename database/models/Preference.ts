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