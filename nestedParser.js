
function convertToNestedObject(flatObject) {
    const nestedObject = {};

    for (const key in flatObject) {
        const value = flatObject[key];
        const keyParts = key.split('.');
        let currentLevel = nestedObject;

        keyParts.forEach((part, index) => {
            if (!currentLevel[part]) {
                currentLevel[part] = (index === keyParts.length - 1) ? value : {};
            }
            currentLevel = currentLevel[part];
        });
    }

    return nestedObject;
}


function flattenObject(nestedObject, parentKey = '', result = {}) {
    for (const key in nestedObject) {
        const value = nestedObject[key];
        const newKey = parentKey ? `${parentKey}.${key}` : key;

        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            // Recursively flatten for nested objects
            flattenObject(value, newKey, result);
        } else {
            // Assign the value for non-object types
            result[newKey] = value;
        }
    }

    return result;
}
