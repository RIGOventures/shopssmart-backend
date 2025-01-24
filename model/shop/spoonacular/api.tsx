'use server'

import axios from 'axios'

import { addSearchParams } from '@/utils/request'

// Configure API key authorization: apiKeyScheme
const apiKey = process.env['SPOONACULAR_API_KEY'] || ''

// Define base url
const baseUrl = "https://api.spoonacular.com"

// Define params we may use
type UrlParams = { 
    query?: string,
    apiKey: string, 
    addProductInformation?: boolean,
    number?: number
}

// https://spoonacular.com/food-api/docs#Search-Grocery-Products
export async function searchProduct(item: string, number = 10) { 

    // Create request url
    const requestUrl = `${baseUrl}/food/products/search`

    // Create search params
    let params = {
        apiKey: apiKey,
        query: item, // String | The (natural language) search query.
        addProductInformation: false,
        number: number
    }

    // Call the api
    const queryUrl = addSearchParams<UrlParams>(requestUrl, params)
    return await axios.get(queryUrl)

}

// https://spoonacular.com/food-api/docs#Get-Product-Information
export async function getProductInformation(id: number) { 

    // Create request url
    const requestUrl = `${baseUrl}/food/products/${id}`

    // Create search params
    let params = { apiKey: apiKey }

    // Call the api
    const queryUrl = addSearchParams<UrlParams>(requestUrl, params)
    return await axios.get(queryUrl)

}
