import { auth, JWT } from 'google-auth-library';

import { getMissingKeys, getGCPCredentials } from '@/utils/env-auth';

import { createVertex } from '@ai-sdk/google-vertex'
import { createInstruction, createPrompt } from '@/model/prompt'

import { streamText } from 'ai';

// check environment keys
const missingKeys = await getMissingKeys()
missingKeys.map(key => {
    console.error(`Missing ${key} environment variable!`)
})

// get credentials
const credentials = await getGCPCredentials()

// create client
const client = auth.fromJSON(credentials) 
if (client instanceof JWT) {
    client.scopes = ['https://www.googleapis.com/auth/cloud-platform']
}

// authenticate from credentials
const vertex = createVertex({ googleAuthOptions: { authClient: client } });

// create Google gemini model
let model = vertex('gemini-1.5-flash', {
    useSearchGrounding: true,
    safetySettings: [
        { category: 'HARM_CATEGORY_UNSPECIFIED', threshold: 'BLOCK_ONLY_HIGH' },
    ],
});

// define fields to keep
const fieldsToKeep = [ "title", "description", "tags" ]

/* Keep certain fields */ 
import { default as removeFieldsExcept } from '@/utils/remove-fields-except';

// Find the first item that has a key-value pair
function getItemByValue(items: [], key: string, value: any) {
    return items.find(item => item[key] === value);
}

// create model instructions
const modelInstruction = createInstruction();

// get Preferences interface
import { Preferences } from "@/database/types";

/* submit a prompt to a model */
export async function submitPrompt(content: string, preferences: Preferences, onFinish: ({ text }: { text: string}) => void) {

    // Get list of available products
    // TODO: Get products from database
    //products = removeFieldsExcept(products, fields);
    //let availableProducts = JSON.stringify(products)

    // Create message with preferences
    let categories = (preferences.lifestyle ? preferences.lifestyle : '') + preferences.allergen
    const userPrompt = createPrompt(content, categories, preferences.other)

    // Generate stream
    const result = streamText({
        model: model,
        system: modelInstruction,
        prompt: userPrompt,
        onFinish: onFinish,
    });

    return result.toDataStreamResponse();

}