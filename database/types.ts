// This file contains type definitions for data.
// It describes the shape of the data, and what data type each property should accept.
import { ResultCode } from '@/utils/result'

export interface User {
    id: string
    username?: string
    email: string
    password: string
    profileId?: string
}

export interface Profile {
    id: string
    name: string
    userId: string
}

export interface Preferences {
    lifestyle: string, 
    allergen: string, 
    other?: string
}

export type Message = {
    role: string,
    content: string
}

export interface Chat {  
    id: string
    title: string
    createdAt: Date
    updatedAt: Date
    path?: string
    messages: Message[] // Is stored as a string!
    sharePath?: string
    userId: string
}

export interface Session {
    userId: string,
    email: string
}

export interface Result {
    type: string;
    message?: string;
    resultCode: ResultCode
}