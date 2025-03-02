const removeFields = (items: [], ...fields: string[]) => {
    // Deep copy the items array... avoids creating a side-effect function.
    const newItems = JSON.parse(JSON.stringify(items));
    /* eslint-disable no-param-reassign */
    newItems.map((item) => fields.map((fieldName) => delete item[fieldName]));
    /* eslint-enable */

    return newItems;
};

module.exports = removeFields;