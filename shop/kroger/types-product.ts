// Product API, taken from https://developer.kroger.com/reference/api/product-api-public

export type AisleLocation = {
    bayNumber: string,
    description: string,
    number: string,
    numberOfFacings: string,
    sequenceNumber: string,
    side: string,
    shelfNumber: string,
    shelfPositionInBay: string
}

export type Price = {
    regular: number,
    promo: number,
    regularPerUnitEstimate: number,
    promoPerUnitEstimate: number
}

export type KrogerItem = {
    itemId: string,
    inventory: {
        stockLevel: string
    },
    favorite: boolean,
    fulfillment: {
        curbside: boolean,
        delivery: boolean,
        instore: boolean,
        shiptohome: boolean
    },
    price: Price,
    nationalPrice: Price,
    size: string,
    soldBy: string
}

export type ImageSize = {
    id: string,
    size: string,
    url: string
}

export type Image = {
    id: string,
    perspective: string,
    default: boolean,
    sizes: ImageSize[]
}

export interface KrogerProduct {
    productId: string
    productPageURI: string
    aisleLocations: AisleLocation[]
    brand: string
    categories: string[]
    countryOrigin: string
    description: string,
    items: KrogerItem[]
    itemInformation: {
        depth: number,
        height: number,
        width: number
    }
    temperature: {
        indicator: string
        heatSensitive: boolean
    }
    images: Image[]
    upc: string
}

