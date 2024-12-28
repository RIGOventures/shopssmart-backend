'use server'

import { Log, Chat, Profile, Result } from '@/lib/types'

import { generateId } from 'ai';

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { z } from 'zod'
import { kv } from '@vercel/kv'

import { auth } from '@/auth'
import { getUser } from './login/actions'
import { ResultCode } from '@/lib/utils/result'

async function createRecord(tag: string, record: Log) {
    const session = await auth()

    if (session && session.user) {
        const pipeline = kv.pipeline()

        pipeline.hset(`${tag}:${record.id}`, record)
        pipeline.zadd(`user:${tag}:${record.userId}`, {
            score: Date.now(), // Sort by date
            member: `${tag}:${record.id}` // The actual value
        })

        await pipeline.exec()
    } else {
        return
    }
}

async function deleteRecord(tag: string, id: string) {
    const session = await auth()

    if (!session) {
        return {
            error: 'Unauthorized'
        }
    }

    // Convert uid to string for consistent comparison with session.user.id
    const uid = String(await kv.hget(`${tag}:${id}`, 'userId'))

    if (uid !== session?.user?.id) {
        return {
            error: 'Unauthorized'
        }
    }

    await kv.del(`${tag}:${id}`)
    await kv.zrem(`user:${tag}:${session.user.id}`, `${tag}:${id}`)
}

async function getRecords<T extends Log>(tag: string, userId?: string | null) {
    const session = await auth()

    if (!userId) {
        return []
    }

    if (userId !== session?.user?.id) {
        return {
            error: 'Unauthorized'
        }
    }

    try {
        const pipeline = kv.pipeline()
        // Fetch all the records stored with the user in reverse order
        const records: string[] = await kv.zrange(`user:${tag}:${userId}`, 0, -1, {
            rev: true
        })

        // Get all records saved
        for (const record of records) {
            pipeline.hgetall(record)
        }

        const results = await pipeline.exec()

        return results as T[]
    } catch (error) {
        return []
    }
}

async function getRecord<T extends Log>(tag: string, id: string, userId: string) {
    const session = await auth()
    
    if (userId !== session?.user?.id) {
        return {
            error: 'Unauthorized'
        }
    }

    const record = await kv.hgetall<T>(`${tag}:${id}`)

    if (!record || (userId && record.userId !== userId)) {
        return null
    }

    return record
}

/**
 * Chat actions
 */

export async function getChats(userId?: string | null) {
    return getRecords<Chat>('chat', userId)
}

export async function getChat(id: string, userId: string) {
    return getRecord<Chat>('chat', id, userId)
}

export async function removeChat({ id, path }: { id: string; path: string }) {
    await deleteRecord('chat', id)

    revalidatePath('/')
    return revalidatePath(path)
}

export async function clearChats() {
    const session = await auth()

    if (!session?.user?.id) {
        return {
            error: 'Unauthorized'
        }
    }

    const chats: string[] = await kv.zrange(`user:chat:${session.user.id}`, 0, -1)
    if (!chats.length) {
        return redirect('/')
    }
    const pipeline = kv.pipeline()

    for (const chat of chats) {
        pipeline.del(chat)
        pipeline.zrem(`user:chat:${session.user.id}`, chat)
    }

    await pipeline.exec()

    revalidatePath('/')
    return redirect('/')
}

export async function getSharedChat(id: string) {
    const chat = await kv.hgetall<Chat>(`chat:${id}`)

    if (!chat || !chat.sharePath) {
        return null
    }

    return chat
}

export async function shareChat(id: string) {
    const session = await auth()

    if (!session?.user?.id) {
        return {
            error: 'Unauthorized'
        }
    }

    const chat = await kv.hgetall<Chat>(`chat:${id}`)

    if (!chat || chat.userId !== session.user.id) {
        return {
            error: 'Something went wrong'
        }
    }

    const payload = {
        ...chat,
        sharePath: `/share/${chat.id}`
    }

    await kv.hset(`chat:${chat.id}`, payload)

    return payload
}

export async function saveChat(chat: Chat) {
    return createRecord('chat', chat)
}

/**
 * Profile actions
 */

export async function getProfiles(userId?: string | null) {
    return getRecords<Profile>('profile', userId)
}

export async function getProfile(id: string, userId: string) {
    return getRecord<Profile>('profile', id, userId)
}

const ProfileSchema = z.object({
    name: z
        .string()
        .min(1, { message: "Profile name is required" })
});

export async function createProfile(userId: string, prevState: Result | undefined, formData: FormData) {
    const rawFormData = {
        name: formData.get('profileName')
    };

    const validatedFields = ProfileSchema.safeParse(rawFormData);
    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        const { issues } = validatedFields.error
        const currentIssue = issues.length && issues[0]
        const { path, message } = currentIssue || {}

        return {
            type: 'error',
            message: message,
            resultCode: ResultCode.InvalidSubmission
        };
    }

    const { name } = validatedFields.data;

    const profile: Profile = {
        id: generateId(),
        userId,
        name
    }

    await createRecord('profile', profile)

    return {
        type: 'success',
        resultCode: ResultCode.ProfileCreated
    };
}

export async function deleteProfile(id: string) {
    return deleteRecord('profile', id)
}

/**
 * Profile relational actions
 */

export async function setProfileForUser(email: string, profileId: string) {
    const existingUser = await getUser(email)

    if (existingUser) {
        const user = {
            ...existingUser,
            profile: profileId
        } 

        await kv.hset(`user:${email}`, user)

        return {
            type: 'success',
            resultCode: ResultCode.UserUpdated
        }
    } else {
        return {
            type: 'error',
            resultCode: ResultCode.InvalidCredentials
        }
    }
}

export async function getProfileForUser(email: string) {
    const existingUser = await getUser(email)
    return existingUser?.profile || 'default'
}
