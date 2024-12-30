# shopssmart-backend

This project uses the a self-managed Redix database and Google Vertex API (specfically, gemini-1.5-flash).
It manages accounts and user preferences, and generates grocery recommendations based on those preferences.

## Running Locally

After cloning the repo, create a `.env` file based on `.env.example`, following its instructions.
You can ignore adding any API Keys since they are not core to any functionality.

For example:

`AUTH_SECRET=...`

Then, run the server in the command line and it will be available at http://localhost:3000.

`pnpm run dev`

### Setup Redis

The docker run command below exposes redis-server on port 6379 and RedisInsight on port 8001.
You can use RedisInsight by pointing your browser to http://localhost:8001.

`docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest`

You can use redis-cli to connect to the server at localhost:6379. 
If you don’t have redis-cli installed locally, you can run it from the Docker container like below:

`docker exec -it redis-stack redis-cli`

## Testing

Create a `.env.test.local` file based on `.env` and change the keys based on the testing environment you are trying to create.
