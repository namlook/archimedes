
import joi from 'joi';

var groupByValidator = {
    property: joi.array().items(joi.string()),
    aggregation: joi.object().keys({
        operator: joi.string().only('count', 'sum', 'avg', 'min', 'max'),
        target: joi.string()
    })
};

export default function(groupBy) {
    return joi.validate(groupBy, groupByValidator);
}