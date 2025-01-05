'use server';

// Object to store the number of requests made by each user and their last request timestamp
interface UserRequestData {
	count: number;
	lastResetTime: number;
}

const { ResultCode } = require('@/utils/result')

// Get Redis function
const { getClient } = require("@/database/redis");

// Get Redis client
const redis = getClient();

async function getUserRequestData(userIP: string): Promise<UserRequestData | null> {
	try {
		// <UserRequestData>
		const data = await redis.get(userIP);
		return data;
	} catch (error) {
		console.error('Error retrieving user request data:', error);
		throw error;
	}
}

async function updateUserRequestData(userIP: string, data: UserRequestData) {
	try {
		await redis.set(userIP, data);
	} catch (error) {
		console.error('Error updating user request data:', error);
		throw error;
	}
}

// Middleware function to enforce rate limits
export async function rateLimit(userIP: string) {
	
	const userRequests = await getUserRequestData(userIP);

	// Check if the user has made requests before
	if (userRequests) {
		const { count, lastResetTime } = userRequests;
		const currentTime = Date.now();

		// Check if it's a new day and reset the count
		const currentDay = new Date(currentTime).toLocaleDateString();
		const lastResetDay = new Date(lastResetTime).toLocaleDateString();
		if (currentDay !== lastResetDay) {
			userRequests.count = 1;
			userRequests.lastResetTime = currentTime;
			await updateUserRequestData(userIP, userRequests);
		} else {
			// Check if the user has exceeded the rate limit (5 requests per day)
			if (count >= 5) {
                return {
                    type: 'error',
                    resultCode: ResultCode.RateLimited
                }
			}

			// Increment the request count for the user
			userRequests.count++;
			await updateUserRequestData(userIP, userRequests);
		}
	} else {
		// Create a new user entry with initial request count and timestamp
		const newUserRequests: UserRequestData = {
			count: 1,
			lastResetTime: Date.now()
		};
		await updateUserRequestData(userIP, newUserRequests);
	}

	return null;
}