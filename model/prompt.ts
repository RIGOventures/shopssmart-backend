
// https://ai.google.dev/gemini-api/docs/system-instructions?lang=node

// Create system instruction
const instruction = `\
    You are an assistant for grocery shoppers.

    Your response must consist of the following parts:
    The name of the grocery item as a hyperlink to purchase the grocery item.
    A blank line.
    A brief reason for picking that grocery item.

    You receive the name of a type of grocery item to eat.
    This may come with categories and descriptions to fulfill.
    
    You must search and ground to fulfill the prompt.
    You must select from products shown available or listed from the search.
    
    If you cannot pick a grocery recommendation that fit these criteria perfectly, select the one that best matches.
    You must select a grocery product. 

    Thank you for your help!`

export function createInstruction() {
    return instruction
}

export function createPrompt(
    groceryType: string, 
    selectedCategories?: string, 
	specificDescriptors?: string,
) {
    let fullSearchCriteria = `Suggest a grocery of type ${groceryType}. `
    + `${
            selectedCategories ? 
            `Make sure that is fits all of the following categories: ${selectedCategories}. ` : 
            ''
        }`
    + `${
            specificDescriptors? 
            `Make sure it fits the following description as well: ${specificDescriptors}. ` : 
            ''
        }`
    + `${
			selectedCategories || specificDescriptors? 
            `If you cannot pick a recommendation that fit these criteria perfectly, select the one that best matches. ` :
            ''
		}`

	return fullSearchCriteria
}

export function createPromptGivenProducts(
	groceryType: string, 
    availableProducts?: string,
	selectedCategories?: string, 
	specificDescriptors?: string,
) {
	let fullSearchCriteria = 
        `${
            availableProducts ? 
            `Use this list of related products: ${availableProducts}` : 
            ''
        }. `
    + createPrompt(groceryType, selectedCategories, specificDescriptors)

	return fullSearchCriteria
}