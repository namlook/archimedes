'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _rdfUtils = require('./rdf-utils');

var _rdfUtils2 = _interopRequireDefault(_rdfUtils);

var _sparqljs = require('sparqljs');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var RDF_TYPE_URL = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

module.exports = function main(db, modelName, graphUri) {
    var rdfUtils = (0, _rdfUtils2.default)(db);
    var internals = {};

    /*
     * returns the sparson predicate from a propertyName
     * Note that if the parent is specified, the predicate used will be
     * build against the parent schema.
     */
    internals.buildPredicate = function buildPredicate(propertyName) {
        var modelClass = db[modelName];
        var modelSchema = modelClass.schema;

        // if (propertyName === '_type') {
        //     return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        // }

        if (propertyName === '_type' || _lodash2.default.endsWith(propertyName, '._type')) {
            return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }

        // if (parent) {
        //     let relationType = modelSchema.getProperty(parent).type;
        //     let relationModelSchema = db[relationType].schema;
        //     property = relationModelSchema.getProperty(propertyName);
        // } else {
        //     property = modelSchema.getProperty(propertyName);
        // }
        var property = modelSchema.getProperty(propertyName);

        if (property.isInverseRelationship()) {
            return {
                type: 'path',
                pathType: '^',
                items: [property.getPropertyFromInverseRelationship().meta.rdfUri]
            };
        }
        return property.meta.rdfUri;
    };

    /**
     * buid a predicate with a path:
     *   ?s (test:user/test/name) ?o
     */
    internals.buildPathPredicate = function (propertyName) {
        var modelClass = db[modelName];
        var modelSchema = modelClass.schema;

        if (_lodash2.default.endsWith(propertyName, '._id')) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }

        var items = propertyName.split('.').map(function (innerPropertyName) {

            if (innerPropertyName === '_type') {
                return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
            }

            var property = modelSchema.getProperty(innerPropertyName);

            if (property.isRelation()) {
                modelSchema = db[property.type].schema;
            }

            if (property.isInverseRelationship()) {
                // only for filter

                property = property.getPropertyFromInverseRelationship();

                var propertyUris = [property.meta.rdfUri];
                // let propertyUris = [
                // rdfInternals.buildPropertyRdfUri(modelSchema.name, property.name)
                // ];

                return {
                    type: 'path',
                    pathType: '^',
                    items: propertyUris
                };
            } else {
                // return rdfInternals.buildPropertyRdfUri(modelSchema.name, property.name);
                return property.meta.rdfUri;
            }
        });

        return {
            type: 'path',
            pathType: '/',
            items: items
        };
    };

    internals.buildInnerVariableName = function (propertyName) {
        if (_lodash2.default.endsWith(propertyName, '._id')) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }
        return propertyName.split('.').join(rdfUtils.RELATION_SEPARATOR);
    };

    internals.buildFinalVariableName = function (propertyName) {
        return propertyName.split('.').join(rdfUtils.RELATION_SEPARATOR);
    };

    internals.validateQuery = function (query) {

        /** validate order by **/
        var sortedVariables = query.sort || [];

        if (!_lodash2.default.isArray(sortedVariables)) {
            throw new Error('sortedVariable must be an array');
        }

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = sortedVariables[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var variable = _step.value;

                if (variable[0] === '-') {
                    variable = variable.slice(1);
                }

                // check if the variable is set in fields
                if (query.field[variable] == null && !query.aggregate[variable]) {
                    throw new Error('can\'t order by an unknown field: "' + variable + '"');
                }
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }
    };

    // query.field = {
    //     title: title,
    //     authorName: 'author?.name',
    //     tags: ['tags'],
    //     creditedAuthor: [{
    //         $property: 'credits',
    //         $fields: {
    //             name: 'credits.name',
    //             sex: 'credits.gender'
    //         }
    //     }]
    // }
    // [
    //     {fieldName: 'title', propertyName: 'title', sorted: 'asc', subject: '_id'},
    //     {fieldName: 'authorName', propertyName: 'author.name', subject: 'author', optional: true},
    //     {fieldName: 'tags', propertyName: 'tags', array: true, subject: '_id'},
    // {fieldName: 'creditedAuthor', propertyName: 'credits', array: true, subject: '_id', inner: true},
    //     {fieldName: null, propertyName: 'author', optional: true, inner: true},
    //     {fieldName: 'name', propertyName: 'credits.name', subject: 'credits'},
    //     {fieldName: 'sex', propertyName: 'credits.gender', subject: 'credits'}
    // ]
    internals._buildFieldProperties = function _buildFieldProperties(query) {
        var convertPair2property = function convertPair2property(_ref) {
            var _ref2 = _slicedToArray(_ref, 2);

            var fieldName = _ref2[0];
            var _fieldInfos = _ref2[1];

            var isArray = _lodash2.default.isArray(_fieldInfos);
            var fieldInfos = isArray ? _fieldInfos[0] : _fieldInfos;

            fieldInfos = _lodash2.default.isString(fieldInfos) ? { $property: fieldInfos } : fieldInfos;

            var propertyName = fieldInfos.$property;
            var propertyRaw = fieldInfos.$property;

            var optional = _lodash2.default.includes(propertyName, '?');
            propertyName = optional ? propertyName.split('?').join('') : propertyName;

            return {
                fieldName: fieldName,
                propertyName: propertyName,
                propertyRaw: propertyRaw,
                optional: optional,
                array: isArray,
                inner: false, // isInner,
                fields: fieldInfos.$fields
            };
        };

        return _lodash2.default.toPairs(query.field).map(convertPair2property);
    };

    internals._buildStatementProperties = function (fieldProperties, aggregationProperties, sortedFields) {
        var sortedField = function sortedField(fieldName) {
            return _lodash2.default.get(_lodash2.default.find(sortedFields, { fieldName: fieldName }), 'order');
        };

        var findParents = function findParents(propertyName) {
            var splitedPropertyName = propertyName.split('.');
            var value = void 0;
            if (splitedPropertyName.length > 1) {
                var x = splitedPropertyName.slice(0, -1).join('.');
                value = _lodash2.default.flatten(_lodash2.default.compact([x, findParents(x)]));
            }
            return value;
        };

        var stripEndingId = function stripEndingId(propertyName) {
            return _lodash2.default.endsWith(propertyName, '._id') ? propertyName.split('.').slice(0, -1).join('.') : propertyName;
        };

        var properties = (0, _lodash2.default)(fieldProperties).concat(aggregationProperties).map(function (o) {
            if (o.aggregator === 'array' && o.fields) {
                return (0, _lodash2.default)(o.fields).toPairs().map(function (_ref3) {
                    var _ref4 = _slicedToArray(_ref3, 2);

                    var embedFieldName = _ref4[0];
                    var embedPropertyName = _ref4[1];
                    return {
                        fieldName: embedFieldName,
                        propertyName: embedPropertyName,
                        inObject: o.fieldName,
                        inner: true
                    };
                }).concat([o]).value();
            }
            return o;
        }).flatten().map(function (o) {
            if (!o.propertyName) {
                return o;
            }
            o.propertyRaw = o.propertyRaw || o.propertyName;
            var optional = o.propertyRaw.split('?').length > 1;
            if (optional) {
                o.optional = true;
                o.propertyName = o.propertyName.split('?').join('');
            }
            o.propertyName = stripEndingId(o.propertyName);
            o.parent = o.propertyName.split('.').slice(0, -1).join('.');
            return o;
        }).map(function (o) {
            // add sortBy info
            o.sortBy = sortedField(o.fieldName);
            return o;
        }).value();

        var innerProperties = (0, _lodash2.default)(properties).filter(function (o) {
            return o.parent;
        }).map(function (o) {
            return o.propertyRaw;
        }).flatMap(findParents).uniq().map(function (propertyName) {
            var optional = propertyName.split('?').length > 1;
            var propertyRaw = propertyName;
            if (optional) {
                propertyName = propertyName.split('?').join('');
            }
            var parent = propertyName.split('.').slice(0, -1).join('.');
            return {
                propertyName: propertyName,
                optional: optional,
                parent: parent,
                inner: true,
                propertyRaw: propertyRaw
            };
        }).value();

        var statementProperties = [].concat(innerProperties, properties).map(function (o) {
            var property = db[modelName].schema.getProperty(o.propertyName);
            var isInverseRelationship = property && property.isInverseRelationship();
            return isInverseRelationship ? Object.assign({}, o, { inverseRelationship: property.type }) : o;
        });

        /** if there is only _id in field and no aggregation,
         * add a statement so we can retrieve the _id
         */
        if (!_lodash2.default.find(statementProperties, function (o) {
            return o.propertyName !== '_id';
        })) {
            statementProperties.push({
                propertyName: '_type',
                fieldName: '_type',
                propertyRaw: '_type',
                inner: true
            });
        }

        return statementProperties;
    };

    // query.filter = {
    //     title: {$startsWith: 'hello'},
    //     ratting: {$gt: 3, $lt: 5}
    //     tags: {$in: ['tag\"1', 'tag\"2']},
    //     'credits.name': 'user1'
    // }
    // [
    //     {propertyName: 'title', operator: 'startsWith', rdfValue: 'hello'},
    //     {propertyName: 'ratting', operator: 'gt', rdfValue: '3^^xsd:integer'},
    //     {propertyName: 'ratting', operator: 'lt', rdfValue: '5^^xsd:integer'},
    //     {propertyName: 'tags', operator: 'in', rdfValue: ['tag\"1', 'tag\"2']},
    //     {propertyName: 'credits.name', operator: 'eq', rdfValue: 'user1'}
    // ]
    internals._buildFilterProperties = function (query) {
        return (0, _lodash2.default)(query.filter).toPairs().map(function (_ref5) {
            var _ref6 = _slicedToArray(_ref5, 2);

            var propertyName = _ref6[0];
            var filterInfos = _ref6[1];
            return [propertyName, _lodash2.default.isPlainObject(filterInfos) ? filterInfos : { $eq: filterInfos }];
        }).map(function (_ref7) {
            var _ref8 = _slicedToArray(_ref7, 2);

            var propertyName = _ref8[0];
            var filterInfos = _ref8[1];

            var filterInfos2FilterProperties = function filterInfos2FilterProperties(_filterInfos) {
                return (0, _lodash2.default)(_filterInfos).toPairs(_filterInfos).map(function (_ref9) {
                    var _ref10 = _slicedToArray(_ref9, 2);

                    var operator = _ref10[0];
                    var value = _ref10[1];

                    var rdfValue = void 0;
                    if (operator === '$exists') {
                        if (value === false) {
                            operator = '$nexists';
                            value = true;
                        }
                    }

                    if (_lodash2.default.isArray(value)) {
                        if (['$and', '$or'].indexOf(operator) > -1) {
                            return {
                                propertyName: propertyName,
                                operator: operator,
                                rdfValue: value.map(filterInfos2FilterProperties)
                            };
                        } else {
                            rdfValue = value.map(function (v) {
                                return rdfUtils.buildRdfValue(modelName, propertyName, v);
                            });
                        }
                    } else if (operator === '$not') {
                        return {
                            propertyName: propertyName,
                            operator: operator,
                            rdfValue: filterInfos2FilterProperties(value)
                        };
                    } else if (operator === '$search') {

                        rdfValue = '"' + value + '*"';
                    } else {
                        rdfValue = rdfUtils.buildRdfValue(modelName, propertyName, value);
                    }
                    return { propertyName: propertyName, operator: operator, rdfValue: rdfValue };
                }).flatten().value();
            };

            return filterInfos2FilterProperties(filterInfos);
        }).flatten().value();
    };

    // query.aggregate = {
    //     avgRatting: {$avg: 'ratting', distinct: true},
    //     sumRatting: {$sum: 'ratting'},
    //     total: {$count: true}
    // }
    // [
    //     {fieldName: 'avgRatting', propertyName: 'ratting', aggregator: 'avg', distinct: true},
    //     {fieldName: 'sumRatting', propertyName: 'ratting', aggregator: 'sum'},
    //     {fieldName: 'total', propertyName: '_id', aggregator: 'count'},
    // ]
    internals._buildAggregationProperties = function (query) {
        return _lodash2.default.toPairs(query.aggregate).map(function (_ref11) {
            var _ref12 = _slicedToArray(_ref11, 2);

            var fieldName = _ref12[0];
            var aggregation = _ref12[1];


            var aggregator = void 0,
                aggregationInfos = void 0;
            if (_lodash2.default.has(aggregation, '$aggregator')) {
                aggregationInfos = aggregation;
                aggregator = aggregation.$aggregator;
                if (aggregator === 'count' && !aggregationInfos.$property) {
                    aggregationInfos.$property = '_id';
                }
            } else {
                var _distinct = aggregation.distinct;
                aggregation = _lodash2.default.omit(aggregation, 'distinct');

                var _$toPairs$ = _slicedToArray(_lodash2.default.toPairs(aggregation)[0], 2);

                var _aggregator = _$toPairs$[0];
                var propertyName = _$toPairs$[1];

                aggregator = _aggregator.slice(1);
                if (propertyName === true) {
                    propertyName = '_id';
                }
                aggregationInfos = {
                    $aggregator: aggregator,
                    $property: propertyName,
                    distinct: _distinct
                };
            }

            if (!_lodash2.default.isPlainObject(aggregationInfos)) {
                aggregationInfos = { $property: aggregationInfos };
            }

            aggregator = aggregator.toLowerCase();

            var distinct = aggregationInfos.distinct;
            distinct = aggregator === 'array' && distinct == null ? true : distinct;

            return {
                fieldName: fieldName,
                aggregator: aggregator,
                array: aggregator === 'array',
                propertyName: aggregationInfos.$property,
                distinct: distinct,
                fields: aggregationInfos.$fields,
                inner: true
            };
        });
    };

    internals._selectVariableSparson = function (properties) {
        var innerVariable = internals.buildInnerVariableName;
        var finalVariable = internals.buildFinalVariableName;
        /*** build select variables ***/
        return properties.filter(function (o) {
            return !o.aggregator && !o.array && !o.inner;
        }).map(function (o) {
            return {
                expression: '?_' + innerVariable(o.propertyName),
                variable: '?' + finalVariable(o.fieldName)
            };
        });
    };

    internals._selectArraySparson = function (properties) {
        var innerVariable = internals.buildInnerVariableName;
        var finalVariable = internals.buildFinalVariableName;
        return properties.filter(function (o) {
            return o.array && !o.inner;
        }).map(function (o) {
            var quote = o.fields ? '' : '\"';

            return {
                expression: {
                    type: 'operation',
                    operator: 'concat',
                    args: ['"[' + quote + '"', {
                        expression: '?_encoded_' + innerVariable(o.propertyName),
                        type: 'aggregate',
                        aggregation: 'group_concat',
                        distinct: true,
                        separator: quote + ', ' + quote
                    }, '"' + quote + ']"']
                },
                variable: '?' + finalVariable(o.fieldName)
            };
        });
    };

    internals._selectAggregationSparson = function (aggregationProperties) {
        var innerVariable = internals.buildInnerVariableName;
        var finalVariable = internals.buildFinalVariableName;

        return aggregationProperties.map(function (o) {
            if (o.array) {
                var quote = o.fields ? '' : '\"';

                var propertyName = o.propertyName || 'EMBED_' + o.fieldName;

                return {
                    expression: {
                        type: 'operation',
                        operator: 'concat',
                        args: ['"[' + quote + '"', {
                            expression: '?_encoded_' + innerVariable(propertyName),
                            type: 'aggregate',
                            aggregation: 'group_concat',
                            distinct: o.distinct,
                            separator: quote + ', ' + quote
                        }, '"' + quote + ']"']
                    },
                    variable: '?' + finalVariable(o.fieldName)
                };
            } else {
                return {
                    expression: {
                        expression: '?_' + innerVariable(o.propertyName),
                        type: 'aggregate',
                        aggregation: o.aggregator,
                        distinct: o.distinct
                    },
                    variable: '?' + finalVariable(o.fieldName)
                };
            }
        });
    };

    internals._requiredWhereSparson = function (properties) {
        var innerVariable = internals.buildInnerVariableName;
        var buildPredicate = internals.buildPredicate;
        /*** build field where statement ***/
        var triples = _lodash2.default.flatten(properties.filter(function (o) {
            return !o.filter && !o.fields && o.propertyName !== '_id' && !o.optional;
        }).map(function (o) {
            var _triples = [{
                subject: '?_' + innerVariable(o.parent || '_id'),
                predicate: buildPredicate(o.propertyName), //, o.parent),
                object: '?_' + innerVariable(o.propertyName)
            }];

            if (o.inverseRelationship) {
                _triples = [].concat(_toConsumableArray(_triples), [{
                    subject: '?_' + innerVariable(o.propertyName),
                    predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                    object: rdfUtils.buildRdfValue(o.inverseRelationship, '_type')
                }]);
            }

            var embedTriples = _lodash2.default.toPairs(o.fields).map(function (_ref13) {
                var _ref14 = _slicedToArray(_ref13, 2);

                var embedFieldName = _ref14[0];
                var embedPropertyName = _ref14[1];
                return {
                    subject: '?_' + innerVariable(o.propertyName),
                    predicate: buildPredicate(embedPropertyName), //, o.parent),
                    object: '?_' + innerVariable(embedPropertyName)
                };
            });

            return _triples.concat(embedTriples);
        }));

        return triples;
    };

    internals._optionalWhereSparson = function (properties) {
        var innerVariable = internals.buildInnerVariableName;
        var buildPredicate = internals.buildPredicate;
        return (0, _lodash2.default)(properties).filter(function (o) {
            return !o.filter && o.propertyName !== '_id' && o.optional;
        }).groupBy(function (o) {
            return o.propertyRaw.split('?')[0];
        }) // group by clauses
        .map(function (props) {
            return [{

                type: 'optional',
                patterns: (0, _lodash2.default)(props).map(function (prop) {
                    if (prop.inner) {
                        return {
                            subject: '?_' + innerVariable(prop.parent || '_id'),
                            predicate: buildPredicate(prop.propertyName), //, o.parent),
                            object: '?_' + innerVariable(prop.propertyName)
                        };
                    } else {
                        return {
                            subject: '?_' + innerVariable(prop.parent || '_id'),
                            predicate: buildPredicate(prop.propertyName), //, o.parent),
                            object: '?_optional_' + innerVariable(prop.propertyName)
                        };
                    }
                    // let embedTriples = _.toPairs(prop.fields)
                    //     .map(([embedFieldName, embedPropertyName]) => ({
                    //         subject: `?_${innerVariable(prop.propertyName)}`,
                    //         predicate: buildPredicate(embedPropertyName),//, o.parent),
                    //         object: `?_${innerVariable(embedPropertyName)}`
                    //     }));
                    //
                    // return [triples].concat(embedTriples);
                }).flatten()

            }].concat(props.filter(function (o) {
                return !o.inner;
            }).map(function (prop) {
                return {
                    type: 'bind',
                    variable: '?_' + innerVariable(prop.propertyName),
                    expression: {
                        type: 'operation',
                        operator: 'coalesce',
                        args: ['?_optional_' + innerVariable(prop.propertyName), '""']
                    }
                };
            }));
        }).value();
    };

    internals.__buildFilterTriplesSparson = function (propertyName) {
        var innerVariable = internals.buildInnerVariableName;
        var buildPredicate = internals.buildPredicate;

        var stripEndingId = function stripEndingId(propertyName) {
            return _lodash2.default.endsWith(propertyName, '._id') ? propertyName.split('.').slice(0, -1).join('.') : propertyName;
        };

        var findInnerProperties = function findInnerProperties(_propertyName) {
            var stripedPropertyName = stripEndingId(_propertyName);
            var variable = '?_filter_' + innerVariable(stripedPropertyName);
            var splitedPropertyName = stripedPropertyName.split('.');
            var value = void 0;
            if (splitedPropertyName.length > 1) {
                var parentName = splitedPropertyName.slice(0, -1).join('.');
                var parentVariable = '?_filter_' + innerVariable(parentName);
                value = _lodash2.default.flatten(_lodash2.default.compact([{ parentVariable: parentVariable, name: stripedPropertyName, parentName: parentName, variable: variable }, findInnerProperties(parentName)]));
            } else {
                value = [{
                    variable: variable,
                    name: stripedPropertyName,
                    parentName: '_id',
                    parentVariable: '?__id'
                }];
            }
            return value;
        };

        return (0, _lodash2.default)(_lodash2.default.reverse(findInnerProperties(propertyName))).map(function (o) {
            var property = db[modelName].schema.getProperty(o.name);
            var inverseRelationship = property && property.isInverseRelationship() ? property.type : null;
            return Object.assign({}, o, { inverseRelationship: inverseRelationship });
        }).flatMap(function (o) {
            var triples = [{
                subject: o.parentVariable,
                predicate: buildPredicate(o.name),
                object: o.variable
            }];

            if (o.inverseRelationship) {
                triples = [].concat(_toConsumableArray(triples), [{
                    subject: o.variable,
                    predicate: RDF_TYPE_URL,
                    object: rdfUtils.buildRdfValue(o.inverseRelationship, '_type')
                }]);
            }

            return triples;
        }).value();
    };

    internals.__filterPropertySparson = function (filterProperty, filterExistance) {
        var innerVariable = internals.buildInnerVariableName;
        var buildPathPredicate = internals.buildPathPredicate;

        var operator = filterProperty.operator;
        var rdfValue = filterProperty.rdfValue;
        var propertyName = filterProperty.propertyName;


        if (propertyName === '_id') {
            return {
                type: 'filter',
                expression: {
                    type: 'operation',
                    operator: rdfUtils.operatorMapping[operator],
                    args: ['?__id', rdfValue]
                }
            };
        }

        var filters = [];

        var patternTriples = internals.__buildFilterTriplesSparson(propertyName);

        //
        // let patternTriples = [{
        //     subject: '?__id',
        //     predicate: buildPathPredicate(propertyName),
        //     object: `?_filter_${innerVariable(propertyName)}`,
        // }];

        if (operator === '$not') {
            var childFilterProperties = rdfValue.map(function (cfp) {
                return Object.assign({}, cfp, {
                    operator: rdfUtils.inverseOperatorMapping[cfp.operator]
                });
            });
            return internals._filterWhereSparson(childFilterProperties);
        }

        if ((0, _lodash2.default)(['$exists', '$nexists']).includes(operator)) {

            filterExistance = rdfUtils.operatorMapping[operator];
        } else {

            if (filterExistance == null) {
                filterExistance = rdfUtils.filterExistanceOperatorMapping[operator];
                if (filterExistance === 'notexists') {
                    operator = rdfUtils.inverseOperatorMapping[operator];
                }
            }

            if (operator === '$all') {
                patternTriples = rdfValue.map(function (value) {
                    return {
                        subject: '?__id',
                        predicate: buildPathPredicate(propertyName),
                        object: value
                    };
                });
            } else if (operator === '$and') {

                return rdfValue.map(function (prop) {
                    return prop.map(function (p) {
                        return internals.__filterPropertySparson(p, filterExistance);
                    });
                });
            } else if (operator === '$or') {

                return {
                    type: 'union',
                    patterns: rdfValue.map(internals._filterWhereSparson)
                };
            } else if (operator === '$search') {
                var subjectVariable = '?_filter_' + innerVariable(propertyName);
                patternTriples = [].concat(_toConsumableArray(patternTriples), [{
                    subject: subjectVariable,
                    predicate: 'http://www.bigdata.com/rdf/search#search',
                    object: rdfValue
                }, {
                    subject: subjectVariable,
                    predicate: 'http://www.bigdata.com/rdf/search#matchAllTerms',
                    object: '"true"'
                }]);

                return {
                    type: 'group',
                    patterns: [{
                        type: 'bgp',
                        triples: patternTriples
                    }]
                };
            } else {
                var args = ['?_filter_' + innerVariable(propertyName), rdfValue];

                if (operator === '$iregex') {
                    args = [].concat(_toConsumableArray(args), ['"i"']);
                }

                filters = [].concat(_toConsumableArray(filters), [{
                    type: 'filter',
                    expression: {
                        args: args,
                        type: 'operation',
                        operator: rdfUtils.operatorMapping[operator]
                    }
                }]);
            }
        }

        return {
            type: 'filter',
            expression: {
                type: 'operation',
                operator: filterExistance,
                args: [{
                    type: 'group',
                    patterns: [{
                        type: 'bgp',
                        triples: patternTriples
                    }].concat(filters)
                }]
            }
        };
    };

    internals._filterWhereSparson = function _filterWhereSparson(filterProperties) {
        return filterProperties.map(function (o) {
            return internals.__filterPropertySparson(o, null);
        });
    };

    internals._bindingsSparson = function _bindingsSparson(properties) {
        var innerVariable = internals.buildInnerVariableName;
        /* encode_for_uri the value for object */
        var embedObjects = (0, _lodash2.default)(properties).filter(function (o) {
            return o.inObject;
        }).groupBy('inObject').value();

        var objectBindings = _lodash2.default.toPairs(embedObjects).map(function (_ref15) {
            var _ref16 = _slicedToArray(_ref15, 2);

            var fieldName = _ref16[0];
            var embedProperties = _ref16[1];


            var args = (0, _lodash2.default)(embedProperties).map(function (o) {
                return ['""' + innerVariable(o.fieldName) + '":""', {
                    type: 'operation',
                    operator: 'encode_for_uri',
                    args: [{
                        type: 'operation',
                        operator: 'str',
                        args: ['?_' + innerVariable(o.propertyName)] //?_credits____gender"
                    }]
                }, '"\","'];
            }).flatten().tap(function (array) {
                return array.pop();
            }) // remove last comma
            .value();

            var propertyName = 'EMBED_' + fieldName;
            return {
                type: 'bind',
                variable: '?_encoded_' + innerVariable(propertyName),
                expression: {
                    type: 'operation',
                    operator: 'concat',
                    args: _lodash2.default.concat(['"{"'], args, ['"\"}"'])
                }
            };
        });

        /* encode_for_uri the value for  object */
        var arrayBindings = properties.filter(function (o) {
            return o.array && !o.fields;
        }).map(function (o) {
            return {
                type: 'bind',
                variable: '?_encoded_' + innerVariable(o.propertyName),
                expression: {
                    type: 'operation',
                    operator: 'encode_for_uri',
                    args: [{
                        type: 'operation',
                        operator: 'str',
                        args: ['?_' + innerVariable(o.propertyName)]
                    }]
                }
            };
        });

        return objectBindings.concat(arrayBindings);
    };

    internals._groupBySparson = function _groupBySparson(properties) {
        var innerVariable = internals.buildInnerVariableName;
        var shouldGroupBy = _lodash2.default.find(properties, function (o) {
            return o.aggregator || o.array;
        });

        if (!shouldGroupBy) {
            return null;
        }

        return properties.filter(function (o) {
            return !o.aggregator && !o.array && !o.inner;
        }).map(function (o) {
            return { expression: '?_' + innerVariable(o.propertyName) };
        });
    };

    internals._orderBySparson = function _orderBySparson(sortedFields) {
        var innerVariable = internals.buildInnerVariableName;
        return sortedFields.map(function (o) {
            return {
                expression: '?' + innerVariable(o.fieldName),
                descending: o.order === 'desc'
            };
        });
    };

    internals.buildSparson = function buildSparson(query) {
        var sortedFields = query.sort || [];
        sortedFields = sortedFields.map(function (_fieldName) {
            var descOrder = _lodash2.default.startsWith(_fieldName, '-');
            var fieldName = descOrder ? _fieldName.slice(1) : _fieldName;
            var order = descOrder ? 'desc' : 'asc';
            return { fieldName: fieldName, order: order };
        });

        var filterProperties = internals._buildFilterProperties(query);
        // console.log('FILTER_PROPERTIES>', JSON.stringify(filterProperties, null, 2));

        var aggregationProperties = internals._buildAggregationProperties(query);
        // console.log('AGGREGATION_PROPERTIES>', aggregationProperties);;

        var fieldProperties = internals._buildFieldProperties(query, sortedFields);
        // console.log('FIELD_PROPERTIES>', fieldProperties);
        var statementProperties = internals._buildStatementProperties(fieldProperties, aggregationProperties, sortedFields);
        // console.log('WHERE_PROPERTIES>', statementProperties)

        var selectVariableSparson = internals._selectVariableSparson(statementProperties);
        var selectArraySparson = internals._selectArraySparson(statementProperties);
        var selectAggregationSparson = internals._selectAggregationSparson(aggregationProperties);

        var selectSparson = selectVariableSparson.concat(selectArraySparson).concat(selectAggregationSparson);

        /* build where statement ***/
        var requiredWhereSparson = internals._requiredWhereSparson(statementProperties);
        var optionalWhereSparson = internals._optionalWhereSparson(statementProperties);
        /* build bindings where statement */
        var bindingSparson = internals._bindingsSparson(statementProperties);
        /* build filter where statement */
        var filterWhereSparson = internals._filterWhereSparson(filterProperties);

        var whereSparson = requiredWhereSparson.concat(filterWhereSparson).concat(optionalWhereSparson).concat(bindingSparson);

        /* build group by variables ***/
        var groupBySparson = internals._groupBySparson(statementProperties);

        /* build order by variables ****/
        var orderBySparson = internals._orderBySparson(sortedFields);

        return {
            type: 'query',
            queryType: 'SELECT',
            variables: selectSparson,
            where: whereSparson,
            group: groupBySparson,
            order: orderBySparson.length ? orderBySparson : null,
            distinct: query.distinct,
            limit: query.limit,
            offset: query.offset
        };
    };

    return {
        build: function build(_query) {
            var query = _lodash2.default.cloneDeep(_query);
            // internals.validateQuery(query);
            var sparson = internals.buildSparson(query);
            sparson.from = {
                default: [graphUri]
            };
            // console.dir(sparson, {depth: 20});
            return new _sparqljs.Generator().stringify(sparson);
        }
    };
};