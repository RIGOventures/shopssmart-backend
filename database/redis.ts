const Redis = require('ioredis');

// Create client & connect to Redis
const redis = new Redis({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!),
});

// 
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
  
// Convert a list of indexes to an index key
const getKeyName = (...args) => `${args.join(':')}`

// Set a record and link to a user 
const createRelationalRecord = async (index: string, record: { id: string, userId: string }) => {
    try {
        const pipeline = redis.pipeline()
    
        // Set to the primary key
        const primaryKey = getKeyName(index, record.id)
        pipeline.hset(primaryKey, record)
        
        // Set to foreign key
        const foreignKey = getKeyName('users', index, record.userId)
        pipeline.zadd(foreignKey, {
            score: Date.now(), // Sort by date
            member: primaryKey // The actual value
        })

        await pipeline.exec()
    } catch (e) {
        // A malformed query or unknown index etc causes an exception type error.
        console.error(e);
    }
}

// Delete a record
const deleteRelationalRecord = async (index: string, id: string, userId: string) => {
    try {
        const primaryKey = getKeyName(index, id)

        // Compare with session.user.id
        const uid = String(await redis.hget(getKeyName(primaryKey, 'userId')))
        if (uid !== userId) {
            new Error('Unauthorized')
        }
    
        // Delete the record
        await redis.del(primaryKey)

        // Remove the foreign key
        const foreignKey = getKeyName('users', index, userId)
        await redis.zrem(foreignKey, primaryKey)
    } catch (e) {
        // A malformed query or unknown index etc causes an exception type error.
        console.error(e);
    }
}

const getRelationalRecord = async (index: string, id: string, userId: string) => {
    try {
        // Set to the primary key
        const primaryKey = getKeyName(index, id)

        // Get the record
        const record = await redis.hgetall(primaryKey)

        // Compare with session.user.id
        if (record.userId !== userId) {
            new Error('Unauthorized')
        }

        return record
    } catch (e) {
        // A malformed query or unknown index etc causes an exception type error.
        console.error(e);
        return [];
    }
}

const getRelationalRecords = async (index: string, userId: string) => {
    try {
        const pipeline = redis.pipeline()

        // Fetch all the records stored with the user in reverse order
        const foreignKey = getKeyName('users', index, userId)
        const records: string[] = await redis.zrange(foreignKey, 0, -1, {
            rev: true
        })

        // Get all records saved
        for (const record of records) {
            pipeline.hgetall(record)
        }

        const results = await pipeline.exec()
        return results
    } catch (e) {
       // A malformed query or unknown index etc causes an exception type error.
       console.error(e);
       return [];
    }
}

// Export functions
module.exports = {
    getClient: () => redis,
    performSearch,
    getKeyName,
    createRelationalRecord,
    deleteRelationalRecord, 
    getRelationalRecord,
    getRelationalRecords
};