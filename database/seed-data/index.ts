const bcrypt = require('bcrypt')

// Import environment variables
require('dotenv').config();

// Importing the class from the location of the file
const  { getClient, getKeyName } = require("../redis");

// Get Redis client
const redis = getClient();

const usage = () => {
    console.error('Usage: pnpm run seed users|all');
    process.exit(0);
};

const loadData = async (jsonArray, keyName) => {
    const pipeline = redis.pipeline();

    for (const obj of jsonArray) {
        pipeline.hset(getKeyName(keyName, obj.id), obj);
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
};

const loadUsers = async () => {
    console.log('Loading user data...');
    /* eslint-disable global-require */
    const usersJSON = require('./users.json');
    /* eslint-enable */

    // Hash the passwords...
    /* eslint-disable array-callback-return, no-param-reassign */
    const saltRounds = 10; // Typically a value between 10 and 12
    usersJSON.users.map((user) => {
        user.password = bcrypt.hashSync(user.password, saltRounds);
    });
    /* eslint-enable */

    const errorCount = await loadData(usersJSON.users, 'users');
    console.log(`User data loaded with ${errorCount} errors.`);
};

const createIndexes = async () => {
    console.log('Dropping any existing indexes, creating new indexes...');
  
    const usersIndexKey = getKeyName('users', 'idx');

    const pipeline = redis.pipeline();
    pipeline.call('FT.DROPINDEX', usersIndexKey);
    pipeline.call('FT.CREATE', usersIndexKey, 'ON', 'HASH', 'PREFIX', '1', getKeyName('users'), 'SCHEMA', 'email', 'TAG', 'numCheckins', 'NUMERIC', 'SORTABLE', 'lastSeenAt', 'NUMERIC', 'SORTABLE', 'lastCheckin', 'NUMERIC', 'SORTABLE', 'firstName', 'TEXT', 'lastName', 'TEXT');

    const responses = await pipeline.exec();
  
    if (responses.length === 2 && responses[1][1] === 'OK') {
        console.log('Created indexes.');
    } else {
        console.log('Unexpected error creating indexes :(');
        console.log(responses);
    }
};

export default async function seed(params) {
    //console.log(params)
    if (params.length !== 4) {
        usage();
    }

    const command = params[3];

    switch (command) {
        case 'users':
            await loadUsers();
            break;
        case 'all':
            await loadUsers();
            await createIndexes();
            break;
        default:
            usage();
    }

    redis.quit();
};

seed(process.argv);