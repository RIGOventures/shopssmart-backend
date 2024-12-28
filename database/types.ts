// This file contains type definitions for data.
// It describes the shape of the data, and what data type each property should accept.

import { CoreMessage, CreateMessage } from 'ai'
import { ResultCode } from '@/lib/utils/result'

/**
type CoreMessage = {
    role: string;
    content: UserContent;
};
*/

export type Message = CoreMessage  & {
    id: string
} | CreateMessage

export interface Log extends Record<string, any> {
    id: string
    userId: string
}

export interface Chat extends Log {  
    title: string
    createdAt: Date
    path: string
    messages: Message[]
    sharePath?: string
}

export interface Profile extends Log {
    name: string
}

export interface Preferences {
    lifestyle?: string, 
    allergen?: string, 
    health?: string
}

export interface Session {
    user: {
        id: string
        email: string
    }
}

export interface User extends Record<string, any> {
    id: string
    email: string
    password: string
    profile?: string
}

export interface Result {
    type: string;
    message?: string;
    resultCode: ResultCode
}

export type ServerActionResult<Result> = Promise<Result | { error: string }>

