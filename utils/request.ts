/* add search parameters to a URL */
export function addSearchParams<T extends {}>(url: string, params: T): string {  
    // create url with parameters
    const urlWithSearchParams  = new URL(url)

    for (const [key, value] of Object.entries(params)) {
        let param = value || ''
        // append search parameter
        urlWithSearchParams.searchParams.append(key, param.toString());
    }

    return urlWithSearchParams.toString()
}