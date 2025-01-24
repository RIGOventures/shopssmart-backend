// Location API, taken from https://developer.kroger.com/reference/api/location-api-public

export type Address = {
    addressLine1: string,
    addressLine2: string,
    city: string,
    county: string,
    state: string,
    zipCode: string,
}

export type DayHours = {
    open: string,
    close: number,
    open24: boolean
}

export type Hours = {
    Open24: boolean,
    monday: DayHours,
    tuesday: DayHours,
    wednesday: DayHours,
    thursday: DayHours,
    friday: DayHours,
    saturday: DayHours,
    sunday: DayHours
}

export type Department = {
    departmentId: string,
    name: string,
    phone: string,
    hours: Hours
}

export interface KrogerStore {
    address: Address
    chain: string
    phone: string
    departments: Department[],
    geolocation: {
        latLng: string
        latitude: number
        longitude: number
    },
    hours: Hours & {
        gmtOffset: string,
        timezone: string,
    },
    locationId: string
    storeNumber: string
    divisionNumber: string
    name: string
}