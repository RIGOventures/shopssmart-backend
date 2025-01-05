export function addSearchParams<T extends {}>(url: string, params: T): string {  
    // Create url with parameters
    const urlWithSearchParams  = new URL(url)

    for (const [key, value] of Object.entries(params)) {
        let param = value || ''
        // Append search parameter
        urlWithSearchParams.searchParams.append(key, param.toString());
    }

    return urlWithSearchParams.toString()
}