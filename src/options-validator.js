
import joi from 'joi';

var findOptionsSchemaValidator = {
    limit: joi.number().default(20),
    sort: joi.string()

};

export var findOptionsValidator = function(options) {
    return joi.validate(options, findOptionsSchemaValidator);
};