
import joi from 'joi';

var findOptionsSchemaValidator = {
    limit: joi.number().integer().positive().greater(-1),
    offset: joi.number().integer().greater(-1),
    sort: joi.alternatives().try(
        joi.array().items(joi.string()),
        joi.string()
    ),
    fields: joi.alternatives().try(
        joi.array().items(joi.string()),
        joi.string()
    ),
    distinct: joi.boolean().default(false)
};

export var findOptionsValidator = function(options, db, modelType) {

    let {error, value} = joi.validate(options, findOptionsSchemaValidator);

    if (error) {
        return {error: error};
    }

    if (value.fields) {
        for (let property of value.fields) {
            if (!db[modelType].schema.getProperty(property)) {
                error = `fields: unknown property "${property}" on model "${modelType}"`;
            }
        }
    }

    if (value.sort) {
        for (let property of value.sort) {
            if (property[0] === '-') {
                property = property.slice(1);
            }
            if (!db[modelType].schema.getProperty(property)) {
                error = `sort: unknown property "${property}" on model "${modelType}"`;
            }
        }
    }

    if (error) {
        return {error: error};
    }

    return {value: value};
};