import { client } from "@/redis";

// Object to store the number of requests made by each user and their last request timestamp
interface UserRequestData {
	count: number;
	lastResetTime: number;
}

// define key prefix
const KEY_PREFIX = "user_ip"

// define maximum number for requests
const MAX_REQUESTS = 5

/* get the User request data */
export async function getUserRequestData(userIP: string): Promise<UserRequestData | null> {
	try {
		const data = await client.hGetAll(`${KEY_PREFIX}:${userIP}`);
		return data;
	} catch (error) {
		console.error('Error retrieving user request data:', error);
		throw error;
	}
}

/* set User request data */
export async function setUserRequestData(userIP: string, data: UserRequestData) {
	try {
		await client.hSet(`${KEY_PREFIX}:${userIP}`, [...Object.entries(data).flat()]);
	} catch (error) {
		console.error('Error updating user request data:', error);
		throw error;
	}
}

/* enforce rate limit */
export async function rateLimitUser(userIP: string) {
	
	// check if the User has made requests before
	const userRequests = await getUserRequestData(userIP);
	if (userRequests) {
		const { count, lastResetTime } = userRequests;

		// check if it's a new day and reset the count
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

		// check if the User has exceeded the rate limit (5 requests per day)
		if (count >= MAX_REQUESTS) return true

		// increment the request count for the user
		userRequests.count++;
		await setUserRequestData(userIP, userRequests);

	} else {
		// create a new User entry with initial request count and timestamp
		const newUserRequests: UserRequestData = {
			count: 1,
			lastResetTime: Date.now()
		};
		await setUserRequestData(userIP, newUserRequests);
	}

	return;
}