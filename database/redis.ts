const Redis = require('ioredis');

// Create client & connect to Redis
const redis = new Redis({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!),
});

// Export functions
module.exports = {
    getClient: () => redis,
    getKeyName: (...args) => `${args.join(':')}`,
};