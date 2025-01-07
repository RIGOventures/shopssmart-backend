'use server';

// Object to store the number of requests made by each user and their last request timestamp
interface UserRequestData {
	count: number;
	lastResetTime: number;
}

// Get Redis function
const { getClient } = require("@/database/redis");

// Get Redis client
const redis = getClient();

const MAX_REQUESTS = 5

async function getUserRequestData(userIP: string): Promise<UserRequestData | null> {
	try {
		const data = await redis.get(userIP);
		return data;
	} catch (error) {
		console.error('Error retrieving user request data:', error);
		throw error;
	}
}

async function setUserRequestData(userIP: string, data: UserRequestData) {
	try {
		await redis.set(userIP, data);
	} catch (error) {
		console.error('Error updating user request data:', error);
		throw error;
	}
}

// Middleware function to enforce rate limits
export async function rateLimit(userIP: string) {
	
	// Check if the user has made requests before
	const userRequests = await getUserRequestData(userIP);
	if (userRequests) {
		const { count, lastResetTime } = userRequests;
		
		// Check if it's a new day and reset the count
		const currentTime = Date.now();
		const currentDay = new Date(currentTime).toLocaleDateString();
		const lastResetDay = new Date(lastResetTime).toLocaleDateString();
		if (currentDay !== lastResetDay) {
			const newUserRequests: UserRequestData = {
				count: 1,
				lastResetTime: currentTime
			};
			await setUserRequestData(userIP, newUserRequests);
			return;
		}

		// Check if the user has exceeded the rate limit (5 requests per day)
		if (count >= MAX_REQUESTS) return true

		// Increment the request count for the user
		userRequests.count++;
		await setUserRequestData(userIP, userRequests);

	} else {
		// Create a new user entry with initial request count and timestamp
		const newUserRequests: UserRequestData = {
			count: 1,
			lastResetTime: Date.now()
		};
		await setUserRequestData(userIP, newUserRequests);
	}

	return;
}