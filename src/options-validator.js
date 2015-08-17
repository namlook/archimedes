
import joi from 'joi';

var findOptionsSchemaValidator = {
    limit: joi.number().default(20),
    offset: joi.number(),
    sort: joi.alternatives().try(
        joi.array().items(joi.string()),
        joi.string()
    ),
    fields: joi.alternatives().try(
        joi.array().items(joi.string()),
        joi.string()
    )
};

export var findOptionsValidator = function(options) {
    return joi.validate(options, findOptionsSchemaValidator);
};