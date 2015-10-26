
import joi from 'joi';

import Promise from 'bluebird';

let operationSchema = joi.array().items(joi.object().keys({
    operator: joi.string().required(),
    property: joi.string().required(),
    value: joi.any()
}));

export default function(operations) {
    return new Promise((resolve, reject) => {
        joi.validate(operations, operationSchema, function(error) {
            if (error) {
                return reject(error);
            }
            return resolve();
        });
    });
}