export * from './types-product';
export * from './types-location';

export type LocationIdParams = {
    "filter.locationId"?: string,
}

export type SearchParams = LocationIdParams & { 
    "filter.term": string,
    "filter.brand"?: string,
    "filter.fulfillment"?: string,
    "filter.start"?: number,
}

export type StoreLocationParams = {
    "filter.lat.near": number,
    "filter.lon.near": number,
    "filter.radiusInMiles": number,
}

export type ProductAvailability = {
    id?: string,
    quantity?: number,
    priceLower: number,
    priceUpper: number
}

export interface Product {
    // Identification
    upc?: string
    id: string
    // Description
    description: string
    category?: string
    price: number
    size?: number
    unit?: string
    brand: string
    // Preferences
    priority?: number
    hotness?: number
    availability: ProductAvailability[]
    availableOnline: boolean
    rating?: string
    // Links
    url: string
    imageUrl: string
}