import { config } from 'dotenv'
config(); // fetch Environment variables

// get file service
import * as fs from 'fs';

// get User repository
import { createUsers, userRepository } from '@/types'

/* define process usage */
const usage = () => {
    console.error('Usage: pnpm run seed users|all');
    process.exit(0);
};

// get directory name
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* load Users from file */
const loadUsers = async () => {
    // load User data
    console.log('Loading User data...');
    const usersJSON = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'))

    // save User data
    let errorCount = await createUsers(usersJSON)
    console.log(`User data loaded with ${errorCount} errors.`);
};

/* create indexes for each repository */
const createIndexes = async () => {
    // dropping indexes
    console.log('Dropping any existing indexes, creating new indexes...');

    // drop the index for User
    await userRepository.dropIndex()

    // creating indexes
    console.log('Creating new indexes...');

    // create the index for User
    await userRepository.createIndex()
    console.log('Created User indexes.');
};

export const seed = async (params) => {
    // check usage
    if (params.length !== 4) {
        usage();
    }

    // run command
    const command = params[3];
    switch (command) {
        case 'users':
            await loadUsers();
            break;
        case 'indexes':
            await createIndexes();
        case 'all':
            await loadUsers();
            await createIndexes();
            break;
        default:
            usage();
    }

    // quit with success
    process.exit(0)
};

seed(process.argv);