import axios from 'axios'

import { addSearchParams } from '@/utils/request'

// Configure API key authorization: apiKeyScheme
const apiKey = process.env['SPOONACULAR_API_KEY'] || ''

// Define base url
const baseUrl = "https://world.openfoodfacts.org"

// Define params we may use
type UrlParams = { 
    query?: string,
    apiKey: string, 
    addProductInformation?: boolean,
    number?: number
}

// https://wiki.openfoodfacts.org/API/Read/Search
export async function searchProduct(item: string, number = 10) { 

    // Create request url
    const requestUrl = `${baseUrl}/cgi/search.pl`

    // Create search params
    let params = {
        search_terms: item,
        action: "process",
        json: 1
    }

    // Call the api
    const queryUrl = addSearchParams(requestUrl, params)
    return await axios.get(queryUrl)

}

// https://world.openfoodfacts.org/data
export async function getProductInformation(id: number) { 

    // Create request url
    const requestUrl = `${baseUrl}/api/v3/product/${id}`

    // Call the api
    return await axios.get(requestUrl)

}
