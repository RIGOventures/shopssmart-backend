import { getMissingExternalKeys } from '@/utils/env-auth';

const  { searchProduct } = require('./spoonacular/api')
const  { searchUPCItem, getUPCInformation } = require('./upc-database/api')


// Check environment keys
const missingKeys = await getMissingExternalKeys()
missingKeys.map(key => {
    console.error(`Missing ${key} environment variable!`)
})

// names is a list of keys you want to keep
function removeAllExcept(arr: [], names: string[]) { 
    arr.forEach(item => {
        Object.keys(item).forEach(key => {
            if (!names.includes(key)) {
                delete item[key]
            }
        })
    })
}

function getItemByValue(arr: [], key: string, value: any) {
    return arr.find(item => item[key] === value);
}

// Search the index with a textual query, returning either documents or just ids
const performSearch = async (query: string) => {
    try {
        // Get any items that match this item 
        const response = await searchUPCItem(query) // await searchProduct(value)

        // Get products from data
        let data = response.data
        let products = data.products || data.items

        // Keep certain fields
        let fields = [ "title", "badges", "description", "upc", "barcode" ]
        removeAllExcept(products, fields);

        // Generate list of available products
        let availableProducts = JSON.stringify(products)
        return availableProducts

    } catch (e) {
        // A malformed query or unknown index etc causes an exception type error.
        console.log(`Invalid search request for query: ${query}`);
        console.error(e);
        return [];
    }
};

// Export functions
module.exports = {
    performSearch
};