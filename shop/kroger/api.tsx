'use server'

// Define params we may use

export type Token = {
    expires_in: number,
    access_token: string,
    token_type: string,
    expiry?: number,
}

import { SearchParams, LocationIdParams, StoreLocationParams } from './types'

import axios from 'axios'
import { addSearchParams } from '@/utils/request'

// Production (https://api.kroger.com/v1/) - A live environment for production traffic.
// Certification (https://api-ce.kroger.com/v1/) - A certified environment for testing.

// Define base url
const baseUrl = "https://api.kroger.com/v1"

// https://developer.kroger.com/documentation#3-make-a-test-call
export async function requestToken(clientId: string, clientSecret: string) : Promise<Token> {

    // Create request url
    let requestUrl = `${baseUrl}/connect/oauth2/token`

    const apiKey = `${btoa(`${clientId}:${clientSecret}`)}`

    const headers = {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    }

    const body = {
        'grant_type': 'client_credentials',
        'scope': 'product.compact'
    }

    // Call the api
    const response = await axios.post(requestUrl, body, { headers: headers })

    // Get token
    const token = await response.data;
    token.expiry = parseInt(token.expires_in) + Date.now();
    return token;
    
}

// https://developer.kroger.com/reference/api/product-api-public#tag/Products/operation/productGet
export async function searchProducts(token: Token, 
    term: string, 
    locationId?: string, brand?: string, fulfillment?: string, start?: number, 
    limit = 10) 
{ 

    // Create request url
    let requestUrl = `${baseUrl}/products?filter.limit=${limit}`

    // Create search params
    let params = {
        "filter.term": term,
        "filter.locationId": locationId,
        "filter.brand": brand,
        "filter.fulfillment": fulfillment,
        "filter.start": start,
    }

    // Call the api
    const queryUrl = addSearchParams<SearchParams>(requestUrl, params)
    return await axios.get(queryUrl, { headers: {"Authorization" : `Bearer ${token.access_token}`} })

}

// https://developer.kroger.com/reference/api/product-api-public#tag/Products/operation/productGetID
export async function getProductDetails(token: Token, 
    id: number, locationId: string) { 

    // Create request url
    const requestUrl = `${baseUrl}/products/{${id}}`

    // Create search params
    let params = { "filter.locationId": locationId }

    // Call the api
    const queryUrl = addSearchParams<LocationIdParams>(requestUrl, params)
    return await axios.get(queryUrl, { headers: {"Authorization" : `Bearer ${token.access_token}`} })

}

// https://developer.kroger.com/reference/api/location-api-public
export async function getStoresNearMe(token: Token, 
    latitude: number, longitude: number, radiusInMiles = 10, limit = 15) {

    // Create request url
    const requestUrl = `${baseUrl}/locations?filter.limit=${limit}&filter.chain=Kroger`;

    // Create search params
    let params = { 
        "filter.lat.near": latitude,
        "filter.lon.near": longitude,
        "filter.radiusInMiles": radiusInMiles
    }

    // Call the api
    const queryUrl = addSearchParams<StoreLocationParams>(requestUrl, params)
    return await axios.get(queryUrl, { headers: {"Authorization" : `Bearer ${token.access_token}`} })
    
}