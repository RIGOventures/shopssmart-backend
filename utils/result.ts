export enum ResultCode {
    InvalidCredentials  = 'INVALID_CREDENTIALS',
    InvalidSubmission   = 'INVALID_SUBMISSION',
    UnknownError        = 'UNKNOWN_ERROR',
    RateLimited         = "RATE_LIMIT_EXCEEDED",

    // User
    UserCreated         = 'USER_CREATED',
    UserAlreadyExists   = 'USER_ALREADY_EXISTS',
    UserLoggedIn        = 'USER_LOGGED_IN',
    UserUpdated         = 'USER_UPDATED',

    // Profile
    ProfileCreated      = 'PROFILE_CREATED',
    ProfileUpdated      = 'PROFILE_UPDATED',

    // Chat
    ChatCreated         = 'CHAT_CREATED',
    ChatUpdated         = 'CHAT_UPDATED',
}
  
export const getMessageFromCode = (resultCode: string) => {
    switch (resultCode) {
        case ResultCode.InvalidCredentials:
            return 'Invalid credentials!'
        case ResultCode.InvalidSubmission:
            return 'Invalid submission, please try again!'
        case ResultCode.UserAlreadyExists:
            return 'User already exists, please log in!'
        case ResultCode.UserCreated:
            return 'User created, welcome!'
        case ResultCode.UserUpdated:
            return 'User settings updated!'
        case ResultCode.ProfileCreated:
            return 'Profile created'
        case ResultCode.UnknownError:
            return 'Something went wrong, please try again!'
        case ResultCode.UserLoggedIn:
            return 'Logged in!'
        case ResultCode.RateLimited:
            return 'Rate limit exceeded, come back tomorrow!'
    }
}