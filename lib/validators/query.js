'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = function (db, modelName) {

    var schemas = {};
    var fn = {};

    schemas.validOperators = ['$eq', '$gt', '$lt', '$gte', '$lte', '$eq', '$ne', '$and', '$or', '$not',
    // '$nor',
    // '$nand',
    '$in', '$nin', '$all', '$nall', '$regex', '$iregex', '$search', '$exists', '$strlen'
    /** TODO **/
    // '$all',
    // '$nall'
    ];

    schemas.validAggregators = ['count', 'avg', 'sum', 'min', 'max', 'array'];

    schemas.fieldSchema = _joi2.default.object().pattern(/.+/, _joi2.default.string());

    schemas.filterSchema = _joi2.default.object().pattern(/.+/, _joi2.default.alternatives().try(_joi2.default.object().pattern(/^\$.+/, _joi2.default.alternatives().try(_joi2.default.array().items(_joi2.default.any()), _joi2.default.any())), _joi2.default.any()));

    schemas.aggregateSchema = _joi2.default.object().pattern(/.+/, _joi2.default.alternatives().try(_joi2.default.object().keys({
        $aggregator: _joi2.default.string().required(),
        $property: _joi2.default.string().optional(),
        $fields: _joi2.default.object().pattern(/.+/, _joi2.default.string()).optional(),
        distinct: _joi2.default.boolean().default(false)
    }), _joi2.default.object().pattern(/(^\$.+)|(distinct)/, _joi2.default.alternatives().try(_joi2.default.string(), _joi2.default.boolean()))));

    schemas.querySchema = _joi2.default.object().keys({
        field: schemas.fieldSchema,
        filter: schemas.filterSchema,
        aggregate: schemas.aggregateSchema,
        limit: _joi2.default.number().integer().positive().greater(-1),
        offset: _joi2.default.number().integer().greater(-1),
        distinct: _joi2.default.boolean().default(false),
        sort: _joi2.default.alternatives().try(_joi2.default.array().items(_joi2.default.string()), _joi2.default.string())
    });

    fn.normalizePropertyName = function (propertyName) {
        propertyName = propertyName.split('?').join('');
        if (_fp3.default.endsWith('._id', propertyName)) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }
        if (_fp3.default.endsWith('._type', propertyName)) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }
        return propertyName;
    };

    fn.getProperty = function (property) {
        return db[modelName].schema.getProperty(property);
    };

    fn.validateProperty = function (property) {
        if (_fp3.default.includes(property, ['_id', '_type'])) {
            return false;
        }
        return !fn.getProperty(fn.normalizePropertyName(property));
    };

    fn.validateProperties = function (query) {

        var fieldProperties = (0, _lodash2.default)(query.field || {}).toPairs().map(function (_ref) {
            var _ref2 = _slicedToArray(_ref, 2);

            var field = _ref2[0];
            var prop = _ref2[1];
            return {
                fieldName: field,
                propertyName: prop,
                context: 'field'
            };
        }).value();

        var filterProperties = (0, _lodash2.default)(query.filter || {}).keys().map(function (o) {
            return { propertyName: o, context: 'filter' };
        }).value();

        var aggregationProperties = (0, _lodash2.default)(query.aggregate || {}).toPairs().flatMap(function (_ref3) {
            var _ref4 = _slicedToArray(_ref3, 2);

            var field = _ref4[0];
            var aggregation = _ref4[1];

            return fn.normalizeAggregation(aggregation).filter(function (o) {
                return o.$property && o.$property !== true;
            }).map(function (o) {
                return {
                    fieldName: field,
                    propertyName: o.$property,
                    context: 'aggregate'
                };
            });
        }).value();

        var contextErrors = function contextErrors(o) {
            return {
                field: {
                    message: 'unknown property "' + o.propertyName + '" in field "' + o.fieldName + '"',
                    path: 'field.' + o.fieldName
                },
                filter: {
                    message: 'unknown property "' + o.propertyName + '" for model "' + modelName + '"',
                    path: 'filter'
                },
                aggregate: {
                    message: 'unknown property "' + o.propertyName + '" in field "' + o.fieldName + '"',
                    path: 'aggregate.' + o.fieldName
                }
            }[o.context];
        };

        return _lodash2.default.concat(fieldProperties, filterProperties, aggregationProperties).filter(function (o) {
            return fn.validateProperty(o.propertyName);
        }).map(contextErrors);
    };

    fn.validateOperators = function (query) {
        var filterOperations = (0, _lodash2.default)(query.filter || {}).toPairs().flatMap(function (_ref5) {
            var _ref6 = _slicedToArray(_ref5, 2);

            var propertyName = _ref6[0];
            var operation = _ref6[1];

            return !_lodash2.default.isPlainObject(operation) ? { propertyName: propertyName, operator: '$eq' } : _lodash2.default.toPairs(operation).map(function (_ref7) {
                var _ref8 = _slicedToArray(_ref7, 2);

                var operator = _ref8[0];
                var value = _ref8[1];
                return { propertyName: propertyName, operator: operator, value: value };
            });
        });

        var arrayValues = filterOperations.filter(function (o) {
            return ['$in', '$all'].indexOf(o.operator) > -1 && !_lodash2.default.isArray(o.value);
        }).map(function (o) {
            return {
                message: 'the "' + o.operator + '" operator requires an array as value',
                path: 'filter.' + o.propertyName
            };
        }).value();

        var isValidOperator = _fp3.default.includes(_fp3.default, schemas.validOperators);

        var unknownOperators = filterOperations.filter(function (o) {
            return !isValidOperator(o.operator);
        }).map(function (o) {
            return {
                message: 'unknown operator "' + o.operator + '" on property "' + o.propertyName + '"',
                path: 'filter.' + o.propertyName
            };
        }).value();

        return [].concat(arrayValues, unknownOperators);
    };

    fn.normalizeAggregation = function (aggregation) {
        if (aggregation.$aggregator) {
            return [aggregation];
        }

        var distinct = aggregation.distinct;
        aggregation = _fp3.default.omit('distinct', aggregation);
        return _lodash2.default.toPairs(aggregation).map(function (_ref9) {
            var _ref10 = _slicedToArray(_ref9, 2);

            var aggregator = _ref10[0];
            var propertyName = _ref10[1];
            return {
                $aggregator: aggregator.slice(1),
                $property: propertyName,
                distinct: distinct
            };
        });
    };

    fn.validateAggregators = function (query) {
        var isValidAggregator = _fp3.default.includes(_fp3.default, schemas.validAggregators);

        return (0, _lodash2.default)(query.aggregate || {}).toPairs().flatMap(function (_ref11) {
            var _ref12 = _slicedToArray(_ref11, 2);

            var fieldName = _ref12[0];
            var aggregation = _ref12[1];

            return fn.normalizeAggregation(aggregation).map(function (o) {
                return Object.assign({}, o, { fieldName: fieldName });
            });
        }).filter(function (o) {
            return !isValidAggregator(o.$aggregator);
        }).map(function (o) {
            return {
                message: 'unknown aggregator "' + o.$aggregator + '" in field "' + o.fieldName + '"',
                path: 'aggregate.' + o.fieldName
            };
        }).value();
    };

    return {
        validate: function validate(query) {
            return new Promise(function (resolve, reject) {
                var options = {};
                _joi2.default.validate(query, schemas.querySchema, options, function (error, validatedQuery) {
                    var errors = [];

                    if (error) {
                        if (error.name !== 'ValidationError') {
                            return reject(error);
                        }

                        errors = error.details.map(_fp3.default.pick(['message', 'path']));
                    }

                    errors = errors.length ? errors : [].concat(fn.validateProperties(query), fn.validateOperators(query), fn.validateAggregators(query));

                    if (errors.length) {
                        return reject(new _errors.ValidationError('Bad query', {
                            validationErrors: errors,
                            object: query
                        }));
                    }

                    return resolve(query);
                });
            });
        }
    };
};

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _fp2 = require('lodash/fp');

var _fp3 = _interopRequireDefault(_fp2);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _errors = require('../errors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }