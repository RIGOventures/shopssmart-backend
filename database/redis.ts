import { createClient } from 'redis'
import { Entity, EntityId, Repository } from 'redis-om'

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

/* insert into a sorted set */
export const insertSortedRecord = async function(index: string, entityId: string, record: Entity) {
    // define set key
    const setKey = getKeyName(index, entityId)

    // get the primary key
    const primaryKey = record[EntityId]
    if (primaryKey) {
        // add to the sorted set
        await client.zAdd(setKey, { score: Date.now(), value: primaryKey })
    }
}

/* delete from a sorted set */
export const deleteSortedRecord = async (index: string, entityId: string, record: Entity) => {
    // define set key
    const setKey = getKeyName(index, entityId)
    
    // get the primary key
    const primaryKey = record[EntityId]
    if (primaryKey) {
        // remove from the sorted set
        await client.zRem(setKey, primaryKey)
    }
}

/* get a sorted set */
export const getSortedSet = async function(index: string, entityId: string, repository: Repository) {
    // define set key
    const setKey = getKeyName(index, entityId)

    // get set in reverse order
    const records: string[] = await client.zRange(setKey, '+inf', '-inf', { BY: 'SCORE', REV: true })

    // get all records saved
    const results = await Promise.all(
        records.map(async (recordId) => {
            return repository.fetch(recordId)
        }))

    // flatten and filter results
    const filtered = results.flat().filter(function (record) { 
        // check result exists
        let noOfUserKeys = Object.keys(record).length
        return noOfUserKeys > 0
    })
    return filtered
}

// Delete foreign records
export const deleteSortedSet = async function(index: string, entityId: string, repository: Repository) {
    // define set key
    const setKey = getKeyName(index, entityId)

    // get set in reverse order
    const records: string[] = await client.zRange(setKey, '+inf', '-inf', { BY: 'SCORE', REV: true })

    // get all records saved
    await Promise.all(
        records.map(async (recordId) => {
            repository.remove(recordId)
            client.zRem(setKey, recordId)
        }))
}