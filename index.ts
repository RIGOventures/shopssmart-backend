// Import environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Create server handler
const app = express();
app.use(cors());

// Add api route
const routes = require('./routes');
app.use('/', routes); //sets up these routes on a base '/' route for your site

// (Optional) Whether or not to launch Next.js in dev mode. 
const dev = process.env.NODE_ENV !== 'production' 
// (Optional) The port the server is running behind
const port = parseInt(process.env.PORT || '3000', 10)

// Listen on server
app.listen(port, () => {
    // Log ready
    console.log(
        `> Started ${dev ? 'development' : process.env.NODE_ENV} server on http://localhost:${port}`
    )
})