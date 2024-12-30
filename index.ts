import next from 'next'
 
import { createServer } from 'http'
import { parse } from 'url'

// (Optional) Whether or not to launch Next.js in dev mode. 
const dev = process.env.NODE_ENV !== 'production' 
// (Optional) The port the server is running behind
const port = parseInt(process.env.PORT || '3000', 10)

// Create server handler
const app = next({ dev, port })
const handle = app.getRequestHandler()
 
app.prepare().then(() => {
    // Create server
    createServer((req, res) => {
        // Be sure to pass `true` as the second argument to `url.parse`.
        // This tells it to parse the query portion of the URL.
        const parsedUrl = parse(req.url!, true)
        handle(req, res, parsedUrl)
    }).listen(port)
    
    // Log ready
    console.log(
        `> Started ${dev ? 'development' : process.env.NODE_ENV} server on http://localhost:${port}`
    )
})