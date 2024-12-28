'use server';

import type { Result, User } from '@/lib/types';
import { ResultCode } from '@/lib/utils/result'
import { AuthError } from 'next-auth'

import { z } from 'zod'
import { kv } from '@vercel/kv'
import { signIn, signOut } from '@/auth'

const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
});

const LoginUser = UserSchema.omit({ id: true });

export async function getUser(email: string): Promise<User | null> {
	try {
		const user = await kv.hgetall<User>(`user:${email}`)
  		return user
	} catch (error) {
		console.error('Failed to fetch user:', error);
		throw new Error('Failed to fetch user.');
	}
}

export async function authenticate(
	prevState: Result | undefined, 
	formData: FormData
) 
	: Promise<Result | undefined> 
{
	const rawFormData = {
        email: formData.get('email'),
        password: formData.get('password'),
    };

	const validatedFields = LoginUser.safeParse(rawFormData);
    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            type: 'error',
			resultCode: ResultCode.InvalidCredentials
        };
    }

	try {
		// Prepare data for insertion into the database
		const { email, password } = validatedFields.data;
	
		await signIn('credentials', {
			redirectTo: '/',
			email,
			password,
			redirect: false
		})

		return {
			type: 'success',
			resultCode: ResultCode.UserLoggedIn
		}

	} catch (error) {
		if (error instanceof AuthError) {
			switch (error.type) {
				case 'CredentialsSignin':
					return {
						type: 'error',
						resultCode: ResultCode.InvalidCredentials
					}
				default:
					return {
						type: 'error',
						resultCode: ResultCode.UnknownError
					}
			}
	  	}
	}
}

export async function deauthenticate() { 
	await signOut({ redirectTo: '/' }) 
}