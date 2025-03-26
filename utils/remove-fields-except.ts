// Delete all fields except the fields provided
export default function removeFieldsExcept (items: [], ...fields: string[]) {
    // Deep copy the items array... avoids creating a side-effect function.
    const newItems = JSON.parse(JSON.stringify(items));
    /* eslint-disable no-param-reassign */
    newItems.map((item) => fields.map((fieldName) => {
        if (!fields.includes(fieldName)) delete item[fieldName]
    }));
    /* eslint-enable */

    return newItems;
};