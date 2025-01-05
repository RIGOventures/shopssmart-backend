import { LanguageModelV1 } from '@ai-sdk/provider';
import { JSONClient } from 'google-auth-library/build/src/auth/googleauth'
type Client = JSONClient & { scopes: string | [string] }

import { getGCPCredentials } from '@/utils/env-auth';
import { auth as googleAuth } from 'google-auth-library';

import { createVertex } from '@ai-sdk/google-vertex'
import { createInstruction, createPrompt } from '@/utils/ai-model'

import { streamText } from 'ai';

// Create Google gemini model
let model: any //: LanguageModelV1;

getGCPCredentials().then((credentials: any) => {
    // Create client
    const client = googleAuth.fromJSON(credentials) as Client;
    client.scopes = ['https://www.googleapis.com/auth/cloud-platform']
    // Authenticate from credentials
    const vertex = createVertex({ googleAuthOptions: { authClient: client } });

    // Create model
    model = vertex('gemini-1.5-flash', {
        useSearchGrounding: true,
        safetySettings: [
            { category: 'HARM_CATEGORY_UNSPECIFIED', threshold: 'BLOCK_ONLY_HIGH' },
        ],
    });
})

// Create instruction
const modelInstruction = createInstruction();

// Submit a prompt to a model
type Preferences = { lifestyle: string, allergen: string, other: string }
export async function submitPrompt(content: string, preferences: Preferences, onFinish: ({ text }: { text: string}) => void) {

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

// Export functions
module.exports = {
    submitPrompt
};