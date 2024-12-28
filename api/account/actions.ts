'use server'

import type { Result, User } from '@/lib/types'
import { ResultCode } from '@/lib/utils/result'
import { AuthError } from 'next-auth'

import { z } from 'zod'
import { kv } from '@vercel/kv'
import bcrypt from 'bcrypt'
import { signIn } from '@/auth'
import { getUser } from '../login/actions'

const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
});

const CreateUser = UserSchema.omit({ id: true });

export async function createUser(
    email: string,
    hashedPassword: string
) 
    : Promise<Result> 
{
    const existingUser = await getUser(email)

    if (existingUser) {
        return {
            type: 'error',
            resultCode: ResultCode.UserAlreadyExists
        }
    } else {
        const user : User = {
            id: crypto.randomUUID(),
            email,
            password: hashedPassword
        } 

        await kv.hset(`user:${email}`, user)

        return {
            type: 'success',
            resultCode: ResultCode.UserCreated
        }
    }
}

export async function signup(
    prevState: Result | undefined,
    formData: FormData
) 
    : Promise<Result | undefined> 
{
    const rawFormData = {
        email: formData.get('email'),
        password: formData.get('password'),
    };

	const validatedFields = CreateUser.safeParse(rawFormData);
    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            type: 'error',
			resultCode: ResultCode.InvalidCredentials
        };
    }

    // Prepare data for insertion into the database
	const { email, password } = validatedFields.data;

    // Encrypt the password
    const saltRounds = 10; // Typically a value between 10 and 12
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
        const result = await createUser(email, hashedPassword)

        if (result.resultCode === ResultCode.UserCreated) {
            await signIn('credentials', {
                redirectTo: '/',
                email,
                password,
                redirect: false
            })
        }

        return result
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
        } else {
            return {
                type: 'error',
                resultCode: ResultCode.UnknownError
            }
        }
    }
}