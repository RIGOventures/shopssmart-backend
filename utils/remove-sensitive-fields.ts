const removeSensitiveFields = (searchResults, ...fields) => {
    // Deep copy the searchResults array... avoids creating a side-effect function.
    const newSearchResults = JSON.parse(JSON.stringify(searchResults));
    /* eslint-disable no-param-reassign */
    newSearchResults.map((searchResult) => fields.map((fieldName) => delete searchResult[fieldName]));
    /* eslint-enable */

    return newSearchResults;
};

module.exports = removeSensitiveFields;