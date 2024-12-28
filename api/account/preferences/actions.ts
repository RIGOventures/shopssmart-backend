'use server'

import type { Preferences, Result } from '@/lib/types';
import { ResultCode } from '@/lib/utils/result'

import { z } from 'zod'
import { kv } from '@vercel/kv'

const UpdateSchema = z.object({
    lifestyle: z.string().nullable(),
    allergen: z.string().nullable(),
    health: z.string().nullable(),
});

export async function updatePreferences(profileId: string, prevState: Result | undefined, formData: FormData) {
    const rawFormData = {
        lifestyle: formData.get('lifestyle'),
        allergen: formData.get('allergen') || 'None',
        health: formData.get('health'),
    };

    const validatedFields = UpdateSchema.safeParse(rawFormData);
    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            type: 'error',
            resultCode: ResultCode.InvalidSubmission
        };
    }

    const { lifestyle, allergen, health } = validatedFields.data;

    const preferences = {
        lifestyle: lifestyle,
        allergen: allergen,
        health: health,
    } 

    await kv.hset(`profile:${profileId}:preferences`, preferences)

    return {
        type: 'success',
        resultCode: ResultCode.UserUpdated
    };
}

export async function getPreferences(profileId?: string | null) 
: Promise<Preferences | null> 
{
	try {
		const pref = await kv.hgetall(`profile:${profileId}:preferences`)
  		return pref
	} catch (error) {
		console.error('Failed to fetch profile:', error);
		throw new Error('Failed to fetch profile.');
	}
}