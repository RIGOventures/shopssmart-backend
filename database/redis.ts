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

// Export functions
module.exports = {
    getClient: () => redis,
    getKeyName,
    performSearch
};