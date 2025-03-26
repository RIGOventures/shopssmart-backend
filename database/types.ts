// This file contains type definitions for data.
// It describes the shape of the data, and what data type each property should accept.
import { ResultCode } from '@/utils/result'

export * from './models/User';
export * from './models/Profile';
export * from './models/Preferences';
export * from './models/Chat';

export interface Session {
    userId: string,
    email: string
}

export interface Result {
    type: string;
    message?: string;
    resultCode: ResultCode
}