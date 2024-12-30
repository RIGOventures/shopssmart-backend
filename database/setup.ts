import { createClient } from 'redis';

// Define client connection parameters
const username = "default"
const password = "Ad_pAAIjcDFkNDVmYTA5YjkwNTE0MThkOGFkNTBlYWI1OWZhYWQ5N3AxMA"
const host = "localhost"
const port = "6379"

// Create client URL
// redis[s]://[[username][:password]@][host][:port][/db-number]
const clientUrl = `redis://${username}:${password}@${host}:${port}`

// Create client & connect to redis
const client = createClient({ url: clientUrl });

client.on('error', (err) => console.log('> Error Redis Client', err));

await client.connect();