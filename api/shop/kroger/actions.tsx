'use server'

import { Product, KrogerProduct, KrogerItem, KrogerStore } from './types'

import { getStoresNearMe, searchProducts, requestToken, type Token } from './api';

// Get api key
const clientId = process.env['KROGER_CLIENT_ID'] || ''
const clientSecret = process.env['KROGER_CLIENT_SECRET'] || ''

// Store token
const validTokens: Token[] = []

// Get an available token
async function getToken(): Promise<Token> {

    if (validTokens.length > 1) {
        let headToken = validTokens[0]
        // Check if expired
        if (headToken.expiry! >= Date.now()){
            headToken = await requestToken(clientId, clientSecret);
            validTokens[0] = headToken
        }
        return headToken
    }

    // Create token
    let token = await requestToken(clientId, clientSecret)

    // Add to available tokens    
    validTokens.push(token)
    return validTokens[0]
}

// Create a product item standardised with other products
function createItem(product: KrogerProduct, item: KrogerItem) : Product
{

    let [, size, unit ] = item.size.match(/\s*([\d\s\/.]*)\s*(.*)/) || [];
    if (!unit) unit = item.soldBy

    return {
        upc: product.upc,
        id: `kroger.${product.productId}`,
        description: product.description,
        category: product.categories.length > 0 ? product.categories[0] : undefined,
        price: (item.price?.promo != null && item.price?.promo != 0) ? item.price?.promo: item.price?.regular,
        size: Number(size),
        unit: unit,
        brand: product.brand,
        priority: 0,
        hotness: 0,
        availability: [{ 
            priceLower: item.price?.promo? item.price?.promo : item.price?.regular,
            priceUpper: item.price?.regular
        }],
        availableOnline: item.fulfillment.delivery,
        url: `https://www.kroger.com${product.productPageURI}`,
        imageUrl: product.images?.[0]?.sizes?.[0]?.url
    }
}

export async function getProductsForStore(locationId: string, term: string, brand = 'Kroger') {
    
    // Get token
    let token = await getToken()

    // Search this location for a product
    let itemSearchResponse = await searchProducts(token, term, locationId, brand);
    let products = itemSearchResponse.data.data

    // Get all items in stock
    let items = products.filter((item: KrogerProduct) => item.items.length > 0)
        .flatMap((product: KrogerProduct) => {
            return product.items.map(item => createItem(product, item))
        })

    return items
}

export async function searchStores(stores: KrogerStore[], term: string) {

    // Search in these stores
    let storeProducts = await Promise.all(
        stores.flatMap(async (store) => await getProductsForStore(store.locationId, term)).flat()
    )

    // Flatten to all products
    let allProducts = storeProducts.flat()
    return allProducts

}

type Location = {
    latitude: number,
    longitude: number,
}

export async function searchKroger(term: string[], location: Location, maxDistance?: number) {
    
    let latitude = location.latitude
    let longitude = location.longitude

    if (location.longitude == null || location.latitude == null) {
        throw new Error("InvalidArgumentExcpetion - Need valid location address or coordinates");
    }

    // Get token
    let token = await getToken()

    // Get nearby stores
    let locations = await getStoresNearMe(token, latitude, longitude, maxDistance);
    let stores: KrogerStore[] = locations.data.data; // Axios returns a data field

    // TODO: Map by term
    return await searchStores(stores.slice(0, 3), term[0])

}