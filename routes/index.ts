// get file service
import { readdirSync } from 'fs';

// get directory name
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get files
const files = readdirSync(__dirname, { withFileTypes: true})
    .filter((dirent) => dirent.isFile()) // remove directories
    .filter((dirent) => dirent.name !== 'index.ts'); // remove index.ts

// read each file
let promiseRoutes = [];
files.forEach((dirent) => {
    // get file URL
    let direntPathURL = path.join(dirent.parentPath, dirent.name)
    let fileURL = pathToFileURL(direntPathURL).href

    // import file
    const module = import(fileURL)
    promiseRoutes.push(module)
});

// fetch Environment variables
import { config } from 'dotenv'
config(); 

// import each file at runtime
const modules = await Promise.all(promiseRoutes)

// get the routes
let routes = modules.map(module => module['default']);
export default routes