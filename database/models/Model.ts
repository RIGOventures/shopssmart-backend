// Get Redis functions
const { 
    getClient, 
    performSearch, 
    getKeyName 
} = require("@/redis");

// Get Redis client
const redis = getClient();

// Define search index
const SEARCH_INDEX = "idx"

// Define model base class
const Model = function(keyName: string) {
    this.keyName = keyName;
}

// Create record
const create = async function(object: object, existingId?: string) {
    // Create id
    const id = existingId || crypto.randomUUID()

    // Create record
    const record = {
        ...object,
        id: id,
    } 

    // Get key
    const key = getKeyName(this.keyName, id)

    // Save record
    return [await redis.hset(key, record), record]
}
Model.prototype.create = create

// Create a search index. 
const createSearchIndex = async function(...schema) {
    const indexKey = getKeyName(this.keyName, SEARCH_INDEX);

    // Create full text index
    const responses = await redis.call('FT.CREATE', indexKey, 'ON', 'HASH', 'PREFIX', '1', getKeyName(this.keyName), 'SCHEMA', ...schema);
    return responses
}
Model.prototype.createSearchIndex = createSearchIndex
    
// Create many records
const createMany = async function(jsonArray: [ any ]) {
    const pipeline = redis.pipeline();

    for (const obj of jsonArray) {
        pipeline.hset(getKeyName(this.keyName, obj.id), obj);
    }

    const responses = await pipeline.exec();
    let errorCount = 0;

    // @ts-ignore: Object is possibly 'null'.
    for (const response of responses) {
        if (response[0] !== null) {
            errorCount += 1;
        }
    }

    return errorCount;
}
Model.prototype.createMany = createMany

const getAll = async function(keyName: string) {
    // Fetch all the keys that match the mask
    const mask = getKeyName(keyName, "*")
         
    // Store keys
    const keys: string[] = []

    let cursor = 0
    do {
        const result = await redis.scan(cursor, 'MATCH', mask)
        // Update cursor
        cursor = result[0]

        // Append user keys
        const resultKeys = result[1]
        keys.push(...resultKeys)
    } while (cursor != 0)

    // Start pipeline
    const pipeline = redis.pipeline()

    // Get all users saved
    for (const key of keys) {
        pipeline.hgetall(key)
    }

    const results = await pipeline.exec()

    // Flatten and filter results
    const filtered = results.flat()
        .filter(function (el) { return el != null; })
        .filter(function (el) { return el["command"] == null; });
    return filtered
}

// Find record(s). 
const find = async function(object?: object) {
    object = object || {}
    
    // Get all if there are not properties to match
    const conditions = Object.keys(object)
    switch(conditions.length) {
        case 0:
            return await getAll(this.keyName)
        case 1:
            // Check if we there is an id
            const id = object['id']
            if (id) return await this.findById(id)
        default:
    } 

    // Check if we there is an email property
    const email = object['email']
    if (email) {
        // Format email address usable by Redis (do not save this!)
        const emailAddress = email.replace(/\./g, '\\.').replace(/\@/g, '\\@');
        object['email'] = emailAddress
    }

    // Get search index
    const indexKey = getKeyName(this.keyName, 'idx');

    // Get query
    const query: string[] = []
    for (const [key, value] of Object.entries(object)) {
        query.push(`@${key}:{${value}}` )
    }

    // Search using the formatted email
    const searchResults = await performSearch(indexKey, ...query);

    // TODO: Filter for Id
    return searchResults
}
Model.prototype.find = find

// Find one record. 
const findOne = async function(object: object) {
    const results = await this.find(object)
    if (!results) return

    // Get first response
    const response = results.length > 0
        ? results[0]
        : results;
    // Return response
    return response
}
Model.prototype.findOne = findOne

// Find a record. 
const findById = async function(id: string) {
    // Get record
    const key = getKeyName(this.keyName, id);
    const record = await redis.hgetall(key);

    // Check this is a returned objected
    if (!record || Object.keys(record).length == 0) return

    // Return record
    return record
}
Model.prototype.findById = findById
    
// Delete one record.
const deleteOne = async function(object: object) {
    // Get a record
    const record = await this.findOne(object)
    if (!record) return 0

    // Delete the record
    const key = getKeyName(this.keyName, record.id);
    return await redis.del(key)
}
Model.prototype.deleteOne = deleteOne

// Delete many records.
const deleteMany = async function(object: object) {
    const records = await find(object)

    // Start pipeline
    const pipeline = redis.pipeline()

    // Get all records saved
    for (const record of records) {
        pipeline.del(record)
    }

    return await pipeline.exec()
}
Model.prototype.deleteMany = deleteMany

// Drop search index
const dropSearchIndex = async function() {
    const indexKey = getKeyName(this.keyName, SEARCH_INDEX);

    // Remove full text index
    const responses = await redis.call('FT.DROPINDEX', indexKey);
    return responses
}
Model.prototype.dropSearchIndex = dropSearchIndex

// Update one record.
const updateOne = async function(object: object, values: object) {
    // Get a record
    const record = await this.findOne(object)
    if (!record) return
    
    // Update the record
    const key = getKeyName(this.keyName, record.id)
    // https://redis.github.io/ioredis/classes/Redis.html#hmset
    // Set the values
    return await redis.hmset(key, values)
}
Model.prototype.updateOne = updateOne

// Update many records.
const updateMany = async function(object: object, values: object) {
    const records = await this.find(object)

    // Start pipeline
    const pipeline = redis.pipeline()

    // Get all records saved
    for (const obj of records) {
        pipeline.hmset(getKeyName(this.keyName, obj.id), values);
    }

    return await pipeline.exec()
}
Model.prototype.updateMany = updateMany

module.exports = Model