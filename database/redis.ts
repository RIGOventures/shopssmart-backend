const Redis = require('ioredis');

// Create client & connect to Redis
const redis = new Redis(
    // Port
    Number(process.env.REDIS_PORT || 6379), 
    // Host
    process.env.REDIS_HOST, 
    // Options
    {
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
    }
);

// Convert a list of indexes to an index key
const getKeyName = (...args) => `${args.join(':')}`

// Maximum number of search results to return
const MAX_SEARCH_RESULTS = 1000;

// Search the index with a textual query, returning either documents or just ids
const performSearch = async (index: string, ...query) => {
    try {
        // Return the first MAX_SEARCH_RESULTS matching documents.
        const searchResults = await redis.call('FT.SEARCH', index, query, 'LIMIT', '0', MAX_SEARCH_RESULTS);
    
        // An empty search result looks like [ 0 ].
        // First value is the number of search results
        const noOfResults = searchResults[1];
        if (noOfResults === 0) {
            return [];
        }
    
        // Actual results look like:
        //  [ 3, 
        //      'hashKey', ['fieldName', 'fieldValue', ...]
        //      'hashKey', ['fieldName, 'fieldValue', ...]
        //  ... ]
    
        // Convert results to an array of dictionaries/objects
        const results: {}[] = [];
        for (let n = 2; n < searchResults.length; n += 2) {
            const result = {};
            const fieldNamesAndValues = searchResults[n];
    
            for (let m = 0; m < fieldNamesAndValues.length; m += 2) {
                const k = fieldNamesAndValues[m];
                const v = fieldNamesAndValues[m + 1];
                result[k] = v;
            }
    
            results.push(result);
        }
    
        return results;

    } catch (e) {
        // A malformed query or unknown index etc causes an exception type error.
        console.log(`Invalid search request for index: ${index}, query: ${query}`);
        console.error(e);
        return [];
    }
};

// Set a record and link to a user 
const createRelationalRecord = async (index: string, record: { id: string, userId: string }) => {
    const pipeline = redis.pipeline()
    
    // Set to the primary key
    const primaryKey = getKeyName(index, record.id)
    pipeline.hset(primaryKey, record)
    
    // Set to foreign key
    const foreignKey = getKeyName('users', index, record.userId)
    pipeline.zadd(foreignKey, Date.now(), primaryKey)

    await pipeline.exec()
}

const getRelationalRecord = async (index: string, id: string, userId: string) => {
    // Set to the primary key
    const primaryKey = getKeyName(index, id)

    // Get the record
    const record = await redis.hgetall(primaryKey)

    // If empty list key does not exist. 
    if (record == undefined || Object.keys(record).length < 1) {
        throw new Error(`${primaryKey} does not exist`)
    }

    // Compare with session.userId
    if (record.userId != userId) {
        throw new Error('Unauthorized')
    }

    return record
}

// Delete a record
const deleteRelationalRecord = async (index: string, id: string, userId: string) => {
    // Get record
    const record = await getRelationalRecord(index, id, userId)

    // Delete the record
    const primaryKey = getKeyName(index, record.id)
    await redis.del(primaryKey)

    // Remove the foreign key
    const foreignKey = getKeyName('users', index, record.userId)
    await redis.zrem(foreignKey, primaryKey)
}

const getRelationalRecords = async (index: string, userId: string) => {
    const pipeline = redis.pipeline()

    // Fetch all the records stored with the user in reverse order
    const foreignKey = getKeyName('users', index, userId)
    const records: string[] = await redis.zrange(foreignKey, 0, -1, 'REV')

    // Get all records saved
    for (const record of records) {
        pipeline.hgetall(record)
    }

    const results = await pipeline.exec()
    
    // Flatten and filter results
    const filtered = results.flat().filter(function (el) { return el != null; });
    return filtered
}

// Export functions
module.exports = {
    getClient: () => redis,
    getKeyName,
    performSearch,
    createRelationalRecord,
    getRelationalRecord,
    deleteRelationalRecord, 
    getRelationalRecords
};