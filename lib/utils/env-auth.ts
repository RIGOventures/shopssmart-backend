'use server'

const keysRequired = [
    'GOOGLE_VERTEX_PROJECT',
    'GOOGLE_VERTEX_LOCATION',
    'GOOGLE_SERVICE_KEY',
    'KROGER_CLIENT_ID',
    'KROGER_CLIENT_SECRET',
    'WALGREENS_API_KEY', 
    'SPOONACULAR_API_KEY', 
    'UPC_DATABASE_API_KEY', 
]

export async function getMissingKeys() {
    return keysRequired
        .map(key => (process.env[key] ? '' : key))
        .filter(key => key !== '')
}

export const getGCPCredentials = () => {
    const credentials = JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_KEY || '', "base64").toString()
    );

    // https://github.com/orgs/vercel/discussions/219#discussioncomment-128702
    return credentials
}