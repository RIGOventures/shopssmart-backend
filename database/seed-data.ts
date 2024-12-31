import bcrypt from 'bcrypt'

// Import environment variables
import 'dotenv/config';

// Importing the class from the location of the file
import { getClient, getKeyName } from "./redis";

// Get Redis client
const redisClient = getClient();

const usage = () => {
    console.error('Usage: pnpm run seed users|all');
    process.exit(0);
};

const loadData = async (jsonArray, keyName) => {
    const pipeline = redisClient.pipeline();

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
    const usersJSON = require('../data/users.json');
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

export default async function seed(params) {
    console.log(params)
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
            break;
        default:
            usage();
    }

    redisClient.quit();
};

seed(process.argv);