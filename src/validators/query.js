
import joi from 'joi';
import _fp from 'lodash/fp';
import _ from 'lodash';
import {ValidationError} from '../errors';


export default function(db, modelName) {

    const schemas = {};
    const fn = {};

    schemas.validOperators = [
        '$eq',
        '$gt',
        '$lt',
        '$gte',
        '$lte',
        '$eq',
        '$ne',
        '$and',
        '$or',
        '$not',
        // '$nor',
        // '$nand',
        '$in',
        '$nin',
        '$all',
        '$nall',
        '$regex',
        '$iregex',
        '$exists',
        '$strlen',
        /** TODO **/
        // '$all',
        // '$nall'
    ];

    schemas.validAggregators = [
        'count',
        'avg',
        'sum',
        'min',
        'max',
        'array'
    ];

    schemas.fieldSchema = joi.object().pattern(/.+/, joi.string());

    schemas.filterSchema = joi.object().pattern(/.+/, joi.alternatives().try(
        joi.object().pattern(/^\$.+/, joi.alternatives().try(
            joi.array().items(joi.any()),
            joi.any()
        )),
        joi.any()
    ));

    schemas.aggregateSchema = joi.object().pattern(/.+/, joi.alternatives().try(
        joi.object().keys({
            $aggregator: joi.string().required(),
            $property: joi.string().optional(),
            $fields: joi.object().pattern(/.+/, joi.string()).optional(),
            distinct: joi.boolean().default(false)
        }),
        joi.object().pattern(/(^\$.+)|(distinct)/, joi.alternatives().try(
            joi.string(),
            joi.boolean()
        ))
    ));

    schemas.querySchema = joi.object().keys({
        field: schemas.fieldSchema,
        filter: schemas.filterSchema,
        aggregate: schemas.aggregateSchema,
        limit: joi.number().integer().positive().greater(-1),
        offset: joi.number().integer().greater(-1),
        distinct: joi.boolean().default(false),
        sort: joi.alternatives().try(
            joi.array().items(joi.string()),
            joi.string()
        )
    });

    fn.normalizePropertyName = function(propertyName) {
        propertyName = propertyName.split('?').join('');
        if (_fp.endsWith('._id', propertyName)) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }
        if (_fp.endsWith('._type', propertyName)) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }
        return propertyName;
    }

    fn.getProperty = (property) => db[modelName].schema.getProperty(property);

    fn.validateProperty = function(property) {
        if (_fp.includes(property, ['_id', '_type'])) {
            return false;
        }
        return !fn.getProperty(fn.normalizePropertyName(property));
    }

    fn.validateProperties = function(query) {

        const fieldProperties = _(query.field || {})
            .toPairs()
            .map(([field, prop]) => ({
                fieldName: field,
                propertyName: prop,
                context: 'field'
            }))
            .value();

        const filterProperties = _(query.filter || {})
            .keys()
            .map((o) => ({propertyName: o, context: 'filter'}))
            .value();

        const aggregationProperties = _(query.aggregate || {})
            .toPairs()
            .flatMap(([field, aggregation]) => {
                return fn.normalizeAggregation(aggregation)
                    .filter((o) => o.$property && o.$property !== true)
                    .map((o) => {
                        return {
                            fieldName: field,
                            propertyName: o.$property,
                            context: 'aggregate'
                        };
                    });
            })
            .value();


        const contextErrors = function(o) {
            return {
                field: {
                    message: `unknown property "${o.propertyName}" in field "${o.fieldName}"`,
                    path: `field.${o.fieldName}`
                },
                filter: {
                    message: `unknown property "${o.propertyName}" for model "${modelName}"`,
                    path: `filter`
                },
                aggregate: {
                    message: `unknown property "${o.propertyName}" in field "${o.fieldName}"`,
                    path: `aggregate.${o.fieldName}`
                }
            }[o.context];
        };

        return _.concat(fieldProperties, filterProperties, aggregationProperties)
            .filter((o) => fn.validateProperty(o.propertyName))
            .map(contextErrors);
    };

    fn.validateOperators = function(query) {

        const isValidOperator = _fp.includes(_fp, schemas.validOperators);

        return _(query.filter || {})
            .toPairs()
            .flatMap(([propertyName, operation]) => {
                return !_.isPlainObject(operation)
                    ? {propertyName, operator: '$eq'}
                    : _.toPairs(operation)
                        .map(([operator, value]) => ({ propertyName, operator }));
            })
            .filter((o) => !isValidOperator(o.operator))
            .map((o) => ({
                message: `unknown operator "${o.operator}" on property "${o.propertyName}"`,
                path: `filter.${o.propertyName}`
            }))
            .value();
    };

    fn.normalizeAggregation = function(aggregation) {
        if (aggregation.$aggregator) {
            return [aggregation];
        }

        let distinct = aggregation.distinct
        aggregation = _fp.omit('distinct', aggregation);
        return _.toPairs(aggregation).map(([aggregator, propertyName]) => ({
                $aggregator: aggregator.slice(1),
                $property: propertyName,
                distinct
            }));
    }

    fn.validateAggregators = function(query) {
        const isValidAggregator = _fp.includes(_fp, schemas.validAggregators);

        return _(query.aggregate || {})
            .toPairs()
            .flatMap(([fieldName, aggregation]) => {
                return fn.normalizeAggregation(aggregation)
                    .map((o) => Object.assign({}, o, {fieldName: fieldName}));
            })
            .filter((o) => !isValidAggregator(o.$aggregator))
            .map((o) => ({
                message: `unknown aggregator "${o.$aggregator}" in field "${o.fieldName}"`,
                path: `aggregate.${o.fieldName}`
            }))
            .value();
    };

    return {
        validate: function(query) {
            return new Promise((resolve, reject) => {
                const options = {};
                joi.validate(query, schemas.querySchema, options, (error, validatedQuery) => {

                    let errors = [];

                    if (error) {
                        if (error.name !== 'ValidationError') {
                            return reject(error);
                        }

                        errors = error.details
                            .map(_fp.pick(['message', 'path']));
                    }

                    errors = errors.length
                        ? errors
                        : [].concat(
                            fn.validateProperties(query),
                            fn.validateOperators(query),
                            fn.validateAggregators(query)
                        );


                    if (errors.length) {
                        return reject(
                            new ValidationError('Bad query', {
                                validationErrors: errors,
                                object: query
                            })
                        );
                    }

                    return resolve(query)
                });
            });
        }
    };
};
