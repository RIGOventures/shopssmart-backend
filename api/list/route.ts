import { LanguageModelV1 } from '@ai-sdk/provider';
import { JSONClient } from 'google-auth-library/build/src/auth/googleauth'
type Client = JSONClient & { scopes: string | [string] }
import { Chat, Message, Preferences } from '@/lib/types'

import { ResultCode } from '@/lib/utils/result'

import { AxiosError } from 'axios'

import { getGCPCredentials } from '@/lib/utils/env-auth';
import { auth as googleAuth } from 'google-auth-library';
import { auth } from '@/auth'

import { createVertex } from '@ai-sdk/google-vertex'
import { openai } from '@ai-sdk/openai';
import { createInstruction, createPrompt } from '@/lib/utils/ai-model'

import { rateLimit } from '@/lib/services/rate-limit'

import { streamText, convertToCoreMessages, generateId } from 'ai';

import { getProfileForUser } from '@/app/actions'
import { getPreferences } from '@/app/account/actions'
import { saveChat } from '@/app/actions'

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
export async function submitPrompt(content: string, preferences: Preferences, onFinish: ({ text }: { text: string}) => void) {

    // Create message with preferences
    let categories = (preferences.lifestyle ? preferences.lifestyle : '') + preferences.allergen
    const userPrompt = createPrompt(content, categories, preferences.health)

    // Generate stream
    const result = streamText({
        model: model,
        system: modelInstruction,
        prompt: userPrompt,
        onFinish: onFinish,
    });

    return result.toDataStreamResponse();

}

export async function POST(request: Request) {

    // Rate limit by middleware
	try {
        // Get header
        const headersList = request.headers

        // Get user ip
        const userIP =
            headersList.get('x-forwarded-for') || headersList.get('cf-connecting-ip') || '';

        // Apply rate limit middleware
        const rateLimitResult = await rateLimit(userIP);
        if (rateLimitResult) {
            //return rateLimitResult;
        }
    } catch (error) {

        let message
        if (error instanceof Error) message = error.message
        else message = String(error)

		return {
            type: 'error',
            resultCode: ResultCode.UnknownError,
            message: message
        }
	}

    // Get chat generation request details
    const { chatId, messages } = await request.json();
    const coreMessages = convertToCoreMessages(messages);

    // Get user preferences
    const session = await auth()
    let preferences = {}
    if (session && session.user) {
        // Get the selected profile
        const profile = await getProfileForUser(session.user!.email!)
        // Get preferences on that profile
        preferences = await getPreferences(profile) || {}
    }

    // Get value
    const messageContent = coreMessages[coreMessages.length - 1].content as string;

    // Handle on finish
    async function onFinish({ text }: { text: string }) {

        try {

            if (session && session.user) {

                const createdAt = new Date();
                const userId = session.user.id as string;
                const path = `/list/${chatId}`;

                // Update messages
                const responseMessages = [ { role: 'assistant', content: text } ]
                const chatMessages = [...coreMessages, ...responseMessages];

                // Create title
                const firstMessageContent = messages[0].content as string;
                const title = firstMessageContent.substring(0, 100);
                
                const chat: Chat = {
                    id: chatId,
                    title,
                    userId,
                    createdAt,
                    messages: chatMessages,
                    path
                };

                await saveChat(chat);
            }

        } catch (error) {
            console.error('Failed to save chat');
            
            let message
            if (error instanceof Error) message = error.message
            else message = String(error)

            console.log(message)

            let resultCode 

            if (error instanceof AxiosError) {
                
                let statusCode = error.response?.status
                switch (statusCode) {
                    case 401:
                        resultCode = ResultCode.InvalidCredentials
                        break
                    case 402:
                    case 420:
                        resultCode = ResultCode.RateLimited
                        break
                    default:
                        resultCode = ResultCode.UnknownError
                }

            } else {
                resultCode = ResultCode.UnknownError
            }
            
            // TODO: Return as results stream to client
            return {
                type: 'error',
                resultCode: resultCode,
                message: message
            }

        }
    }

    // TODO: Catch and pass results stream to client
    // Submit message
    return submitPrompt(messageContent, preferences, onFinish)
}