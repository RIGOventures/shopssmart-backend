// Import environment variables
require('dotenv').config();

// Get Redis client
const  { getClient } = require("@/redis");
const redis = getClient();

// Get User model
const User = require("@/models/User");

const usage = () => {
    console.error('Usage: pnpm run seed users|all');
    process.exit(0);
};

const loadUsers = async () => {
    console.log('Loading user data...');
    /* eslint-disable global-require */
    const usersJSON = require('./users.json');
    /* eslint-enable */

    const errorCount = await User.createMany(usersJSON.users);
    console.log(`User data loaded with ${errorCount} errors.`);
};

const createIndexes = async () => {
    console.log('Dropping any existing indexes, creating new indexes...');

    const dropResponse = await User.dropSearchIndex()
    if (dropResponse === 'OK') {
        console.log('Created indexes.');
    } else {
        console.log('Unexpected error creating indexes :(');
        console.log(dropResponse);
    } 

    console.log('Creating new indexes...');

    const response = await User.createSearchIndex()
    if (response === 'OK') {
        console.log('Created indexes.');
    } else {
        console.log('Unexpected error creating indexes :(');
        console.log(response);
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
