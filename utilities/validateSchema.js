const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const Sugar = require("sugar");
// Initialize AJV
const ajv = new Ajv({ allErrors: true });
addFormats(ajv); // Add extra format validations

/**
 * Validate the user schema against OpenAI function calling requirements.
 * @param {object} userSchema - The schema to validate.
 * @returns {object} { isValid: boolean, errorMsg: string }
 */
function validateOpenAISchema(userSchema) {
    // Ensure root schema type is "object"
    if (userSchema.type !== "object") {
        return { isValid: false, errorMsg: "OpenAI function calling requires `type: object` at the root level." };
    }

    // Ensure the schema has a "properties" field and it is an object
    if (!userSchema.properties || typeof userSchema.properties !== "object") {
        return { isValid: false, errorMsg: "OpenAI function calling requires a `properties` field with key-value pairs." };
    }

    // Validate each property inside the schema
    for (const [key, value] of Object.entries(userSchema.properties)) {
        if (typeof value !== "object") {
            return { isValid: false, errorMsg: `Property '${key}' must be an object with type definitions.` };
        }

        // Check if type is defined and valid
        const validTypes = ["string", "number", "integer", "boolean", "array", "object", "null"];
        const listedTypes = Array.isArray(value.type) ? value.type : [value.type].filter(Boolean)
        const intersection = Sugar.Array.intersect(listedTypes, validTypes)
        if (!listedTypes.length || intersection.length !== listedTypes.length) {
            return { isValid: false, errorMsg: `Property '${key}' must have a valid type (string, number, integer, boolean, array, object, null).` };
        }

        // If `enum` is present, ensure it is an array with at least one item
        if (value.enum) {
            if (!Array.isArray(value.enum) || value.enum.length === 0) {
                return { isValid: false, errorMsg: `Property '${key}' has an invalid "enum". It must be a non-empty array.` };
            }
        }
    }

    // If `required` is present, ensure it is an array of existing properties
    if (userSchema.required) {
        if (!Array.isArray(userSchema.required) || !userSchema.required.every((reqKey) => userSchema.properties.hasOwnProperty(reqKey))) {
            return { isValid: false, errorMsg: `"required" field must be an array of existing property keys.` };
        }
    }

    return { isValid: true, errorMsg: "" };
}




module.exports = {
    validateOpenAISchema
}