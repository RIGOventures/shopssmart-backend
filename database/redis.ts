import { createClient } from 'redis'
import { Repository } from 'redis-om'

// Define params
let port = Number(process.env.REDIS_PORT || 6379)

/* Create Redis client */
// https://redis.io/docs/latest/develop/clients/nodejs/connect/
export const client = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD, // use your password here
    socket: {
        host: process.env.REDIS_HOST,
        port: port
    }
});

client.on('error', (err) => console.log('Redis Client Error', err));
await client.connect();

/* Convert a list of indexes to an index key */
export const getKeyName = (...args) => `${args.join(':')}`

// Maximum number of search results to return
const MAX_SEARCH_RESULTS = 1000;

/**
 * Search the index with a textual query, returning either documents or just ids
 * Ref: https://redis.io/docs/latest/develop/interact/search-and-query/query/combined/
 * @param repository 
 * @param query 
 * @returns results
 */
export const performSearch = async (repository: Repository, ...query: string[]) => {
    try {
        

        // // Get all if there are not properties to match
        // const conditions = Object.keys(object)
        // switch(conditions.length) {
        //     case 0:
        //         return await getAll(this.keyName)
        //     case 1:
        //         // Check if we there is an id
        //         const id = object['id']
        //         if (id) return await this.findById(id)
        //     default:
        // } 
    
        // // Get query
        // const query: string[] = []
        // for (const key of conditions) {
        //     let value = object[key]
    
        //     // Check if this is an email property
        //     if (key == 'email') {
        //         // Escape special characters
        //         value = value.replace(/\./g, '\\.')
        //             .replace(/\@/g, '\\@')
        //             .replace(/\-/g, '\\-');
        //     }
    
        //     query.push(`@${key}:{ ${value} }` )
        // }

        // Define raw query
        let rawSearchQuery = query.join(" ")

        // Return the first MAX_SEARCH_RESULTS matching documents.
        const searchResults = await repository.searchRaw(rawSearchQuery).return.page(0, MAX_SEARCH_RESULTS)
    
        // Check for an empty search result
        const noOfResults = searchResults.length;
        if (noOfResults === 0) {
            return [];
        }
    
        // Actual results look like:
        /** 
        {
            total: 3, 
            documents: [
                {
                    id: 'hashKey', 
                    value: {
                        'fieldName': 'fieldValue'
                        ... 
                    }
                },
                {
                    id: 'hashKey', 
                    value: {
                        'fieldName': 'fieldValue'
                        ... 
                    }
                }
                ... 
            ]
         }
        */ 

        // Convert results to an array of dictionaries/objects
        const results: {}[] = [];
        for (let n = 1; n < noOfResults; n += 1) {
            const document = searchResults[n].value;
            results.push(document);
        }
    
        return results;

    } catch (e) {
        // A malformed query or unknown index etc causes an exception type error.
        console.log(`Invalid search request for index: ${repository}, query: ${query}`);
        console.error(e);
        return [];
    }
};