'use strict';

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _N3 = require('N3');

var _errors = require('../../errors');

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var classRdfUri = function classRdfUri(modelClass) {
    return modelClass.meta.classRdfUri;
};

exports.classRdfUri = classRdfUri;
var instanceRdfUri = function instanceRdfUri(modelClass, id) {
    return modelClass.meta.instanceRdfPrefix + '/' + id;
};

exports.instanceRdfUri = instanceRdfUri;
var propertyRdfUri = function propertyRdfUri(modelClass, propertyName) {
    if (!modelClass) {
        return new Error('propertyRdfUri require a modelClass');
    }

    if (!propertyName) {
        return new Error('propertyRdfUri require a propertyName');
    }

    if (propertyName === '_type') {
        return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
    }

    var property = modelClass.schema.getProperty(propertyName);

    if (!property) {
        throw new Error('unknown property "' + propertyName + '" on model "' + modelClass.name + '"');
    }

    if (_lodash2['default'].isArray(property)) {
        return property.map(function (o) {
            return o.meta.rdfUri;
        });
    } else {
        return property.meta.rdfUri;
    }
};

exports.propertyRdfUri = propertyRdfUri;
var propertyName2Sparson = function propertyName2Sparson(modelClass, propertyNames) {
    var modelSchema = modelClass.schema;
    var db = modelClass.db;

    var items = propertyNames.split('.').map(function (propertyName) {

        var property = modelSchema.getProperty(propertyName);

        if (property.isRelation()) {
            modelSchema = db[property.type].schema;
        }

        if (property.isInverseRelationship()) {

            property = property.getPropertyFromInverseRelationship();

            // let propertyUris = _.uniq(property.map((o) => o.meta.rdfUri));
            // if (propertyUris.length > 1) {
            //     propertyUris = {
            //         type: 'path',
            //         pathType: '|',
            //         items: propertyUris
            //     };
            // }

            var propertyUris = [property.meta.rdfUri];

            return {
                type: 'path',
                pathType: '^',
                items: propertyUris
            };
        } else {
            return property.meta.rdfUri;
        }
    });

    return {
        type: 'path',
        pathType: '/',
        items: items
    };
};

exports.propertyName2Sparson = propertyName2Sparson;
var buildRdfValue = function buildRdfValue(db, modelType, propertyName, value) {
    var modelClass = db[modelType];

    if (propertyName === '_type') {
        return classRdfUri(modelClass);
    }

    var rdfValue = undefined;
    if (_lodash2['default'].has(value, '_id') && _lodash2['default'].has(value, '_type')) {
        rdfValue = instanceRdfUri(db[value._type], value._id);
    } else {
        var propertyType = modelClass.schema.getProperty(propertyName).type;
        if (_lodash2['default'].contains(['date', 'datetime'], propertyType)) {
            rdfValue = _N3.Util.createLiteral((0, _moment2['default'])(value).toISOString(), 'http://www.w3.org/2001/XMLSchema#dateTime');
        } else {
            rdfValue = _N3.Util.createLiteral(value);
        }
    }

    return rdfValue;
};

exports.buildRdfValue = buildRdfValue;
var uri2id = function uri2id(modelClass, uri) {
    var id = uri.replace(modelClass.meta.instanceRdfPrefix, '');
    return _lodash2['default'].trim(id, '/');
};

exports.uri2id = uri2id;
var uri2property = function uri2property(modelClass, uri) {
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
        return '_type';
    }
    return modelClass.meta.propertyUrisMapping[uri];
};

exports.uri2property = uri2property;
var operation2triple = function operation2triple(db, modelType, uri, operation) {
    var modelClass = db[modelType];

    var property = operation.property;
    var value = operation.value;

    /*** if the value is undefined, this means that there is no previous
     * value set so we do nothing
     */
    if (value === undefined) {
        return undefined;
    }

    var propertyUri = propertyRdfUri(modelClass, property);
    var rdfValue = buildRdfValue(db, modelType, property, value);

    return {
        subject: uri,
        predicate: propertyUri,
        object: rdfValue
    };
};

exports.operation2triple = operation2triple;
var rdfDoc2pojo = function rdfDoc2pojo(db, modelType, rdfDoc) {
    var modelClass = db[modelType];

    var pojo = {};
    _lodash2['default'].forOwn(rdfDoc, function (rdfValues, rdfProperty) {

        if (rdfProperty === '_id') {
            pojo._id = uri2id(modelClass, rdfValues);
            return;
        }

        var propertyName = uri2property(modelClass, rdfProperty);

        if (propertyName == null) {
            // console.log(`WARNING ! ${rdfProperty} not found in ${modelType}'s schema`);
            return;
        }

        var property = modelClass.schema.getProperty(propertyName);

        if (propertyName === '_type') {
            pojo._type = modelClass.name;
            return;
        }

        var values = [];
        var isRelation = property.isRelation();
        rdfValues.forEach(function (rdfValue) {
            if (isRelation) {
                var relationType = property.type;
                var relationId = uri2id(db[relationType], rdfValue);
                values.push({ _id: relationId, _type: relationType });
            } else {
                values.push(rdfValue);
            }
        });

        // Virtuoso hack: convert integer as boolean
        if (property.type === 'boolean' && values.length) {
            values = values.map(function (value) {
                if (_lodash2['default'].isNumber(value)) {
                    return Boolean(value);
                }
                return value;
            });
        }

        var value = undefined;
        if (!property.isArray()) {
            value = values[0];
        } else {
            if (isRelation) {
                value = _lodash2['default'].sortBy(values, '_id');
            } else {
                value = _lodash2['default'].sortBy(values);
            }
        }

        pojo[propertyName] = value;
    });

    return pojo;
};

exports.rdfDoc2pojo = rdfDoc2pojo;
var pojo2triples = function pojo2triples(db, modelType, pojo) {
    var modelClass = db[modelType];

    var triples = [];

    var instanceUri = instanceRdfUri(modelClass, pojo._id);

    var classUri = classRdfUri(modelClass);
    triples.push({
        subject: instanceUri,
        predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        object: classUri
    });

    _lodash2['default'].forOwn(pojo, function (values, propertyName) {

        if (_lodash2['default'].contains(['_id', '_type'], propertyName)) {
            return;
        }

        if (!_lodash2['default'].isArray(values)) {
            values = [values];
        }

        for (var i = 0; i < values.length; i++) {
            var value = values[i];

            var propertyUri = propertyRdfUri(modelClass, propertyName);
            var rdfValue = buildRdfValue(db, modelType, propertyName, value);

            triples.push({
                subject: instanceUri,
                predicate: propertyUri,
                object: rdfValue
            });
        }
    });

    return triples;
};

exports.pojo2triples = pojo2triples;
var operatorsMapping = {
    $gt: '>',
    $lt: '<',
    $gte: '>=',
    $lte: '<=',
    $eq: '=',
    $ne: '!=',
    $in: 'in',
    $nin: 'notin',
    $regex: 'regex',
    $iregex: 'regex',
    $nexists: 'notexists',
    $exists: 'exists',
    $strlen: 'strlen'
};

var query2whereClause = function query2whereClause(db, modelType, query, options) {
    var modelClass = db[modelType];

    var filters = [];
    var triples = [];
    var orderBy = [];
    var sorting = {};

    _lodash2['default'].get(options, 'sort', []).forEach(function (propertyName) {
        if (!propertyName) {
            return;
        }

        var descending = false;
        if (propertyName[0] === '-') {
            propertyName = _lodash2['default'].trim(propertyName, '-');
            descending = true;
        }
        sorting[propertyName] = {
            descending: descending
        };
    });

    _lodash2['default'].forOwn(query, function (object, propertyName) {

        var variableIdx = 0;
        var variable = undefined;

        if (propertyName === '_type') {
            variable = '?_type' + variableIdx++;
        } else {
            variable = '?' + _lodash2['default'].camelCase(propertyName) + variableIdx++;
        }

        if (sorting[propertyName]) {
            sorting[propertyName].expression = variable;
        }

        var idAsValue = false;
        var predicate = undefined,
            propertyUri = undefined;

        if (_lodash2['default'].contains(propertyName, '.')) {
            if (_lodash2['default'].endsWith(propertyName, '._id')) {
                propertyName = propertyName.split('.').slice(0, -1).join('.');
                var property = modelClass.schema.getProperty(propertyName);
                if (!property.isRelation()) {
                    throw new _errors.ValidationError('Bad query', propertyName + '._id not found on model ' + modelClass.name + ': ' + propertyName + ' is not a relation');
                }
                idAsValue = true;
            }
            propertyUri = propertyRdfUri(modelClass, propertyName);
            predicate = propertyName2Sparson(modelClass, propertyName);
        } else {
            propertyUri = propertyRdfUri(modelClass, propertyName);
            predicate = propertyUri;
        }

        var triple = {
            subject: '?s',
            predicate: predicate,
            object: variable
        };

        triples.push(triple);

        /**
         * if object is... well, an object, then there is operators
         */
        if (!_lodash2['default'].isObject(object) || _lodash2['default'].isDate(object)) {
            object = { $eq: object };
        }

        /**
         * build values filter
         */
        _lodash2['default'].forOwn(object, function (value, operator) {

            /** build the rdf value **/
            var rdfValue = undefined;
            var relationProperty = modelClass.schema.getProperty(propertyName);

            if (_lodash2['default'].isArray(value)) {

                if (idAsValue) {
                    rdfValue = value.map(function (item) {
                        return instanceRdfUri(db[relationProperty.type], item);
                    });
                } else {
                    rdfValue = value.map(function (item) {
                        return buildRdfValue(db, modelType, propertyName, item);
                    });
                }
            } else {

                if (idAsValue) {
                    rdfValue = instanceRdfUri(db[relationProperty.type], value);
                } else {
                    rdfValue = buildRdfValue(db, modelType, propertyName, value);
                }
            }

            var filter = {
                type: 'operation',
                operator: operatorsMapping[operator]
            };

            var property = db[modelType].schema.getProperty(propertyName);
            var isDate = false;
            if (property) {
                isDate = _lodash2['default'].contains(['date', 'datetime'], property.type);
            }

            if (operator === '$exists') {
                if (value === false) {
                    filter.operator = 'notexists';
                }

                filter.args = [{
                    type: 'bgp',
                    triples: [{
                        subject: '?s',
                        predicate: propertyUri,
                        object: variable
                    }]
                }];
            } else if (isDate && operator === '$eq') {

                value = (0, _moment2['default'])(value).toISOString();
                filter.args = [variable, {
                    type: 'functionCall',
                    'function': 'http://www.w3.org/2001/XMLSchema#dateTime',
                    args: ['"' + value + '"'],
                    distinct: false
                }];
            } else {

                filter.args = [variable, rdfValue];
            }

            if (operator === '$iregex') {
                filter.args.push('"i"');
            }

            filters.push(filter);
        });
    });

    _lodash2['default'].forOwn(sorting, function (order, propertyName) {
        if (!order.expression) {
            order.expression = '?' + propertyName + 'OrderBy';
            var propertyUri = undefined;
            try {
                propertyUri = propertyRdfUri(modelClass, propertyName);
            } catch (err) {
                throw new _errors.ValidationError('malformed options', err);
            }
            triples.push({
                subject: '?s',
                predicate: propertyUri,
                object: order.expression
            });
        }
        orderBy.push(order);
    });

    return {
        orderBy: orderBy,
        whereClause: [{
            type: 'bgp',
            triples: triples
        }, {
            type: 'filter',
            expression: {
                type: 'operation',
                operator: '&&',
                args: filters
            }
        }]
    };
};

exports.query2whereClause = query2whereClause;
var _constructTriple = function _constructTriple(modelClass, uri, options, useOptional) {
    if (options.variableIndex == null) {
        options.variableIndex = '';
    }
    options.fields = options.fields || [];
    if (typeof options.fields === 'string') {
        options.fields = options.fields.split(',');
    }

    var triples = [];
    if (options.fields.length) {
        (function () {
            var variableIdx = 0;

            triples = options.fields.map(function (propertyName) {

                var variable = '?' + _lodash2['default'].camelCase(propertyName) + options.variableIndex + 'o' + variableIdx++;

                var propertyUri = undefined;
                try {
                    propertyUri = propertyRdfUri(modelClass, propertyName);
                } catch (err) {
                    throw new _errors.ValidationError('malformed options', err);
                }

                var _triple = {
                    subject: uri,
                    predicate: propertyUri,
                    object: variable
                };

                if (useOptional) {
                    return {
                        type: 'optional',
                        patterns: [{
                            type: 'bgp',
                            triples: [_triple]
                        }]
                    };
                } else {
                    return _triple;
                }
            });

            var _typeTriple = {
                subject: uri,
                predicate: propertyRdfUri(modelClass, '_type'),
                object: '?_type'
            };

            if (useOptional) {
                triples.push({
                    type: 'bgp',
                    triples: [_typeTriple]
                });
            } else {
                triples.push(_typeTriple);
            }
        })();
    } else {
        var _triple = {
            subject: uri,
            predicate: '?p' + options.variableIndex,
            object: '?o' + options.variableIndex
        };

        if (useOptional) {
            triples.push({
                type: 'bgp',
                triples: [_triple]
            });
        } else {
            triples.push(_triple);
        }
    }

    // if (options.variableIndex !== '') {
    //     options.variableIndex++;
    // }

    return triples;
};

var constructTriples = function constructTriples(modelClass, uri, options) {
    return _constructTriple(modelClass, uri, options, false);
};

exports.constructTriples = constructTriples;
var constructWhereTriples = function constructWhereTriples(modelClass, uri, options) {
    return _constructTriple(modelClass, uri, options, true);
};

exports.constructWhereTriples = constructWhereTriples;
var deleteCascade = function deleteCascade(db, _modelType, uri) {
    var deleteProps = db[_modelType].schema.propagateDeletionProperties;

    var deleteTriples = [];
    var whereClause = [];

    if (!_lodash2['default'].startsWith(uri, '?')) {
        deleteTriples.push({
            subject: uri,
            predicate: '?s',
            object: '?o'
        });

        whereClause.push({
            type: 'optional',
            patterns: [{
                type: 'bgp',
                triples: [{
                    subject: uri,
                    predicate: '?s',
                    object: '?o'
                }]
            }]
        });
    }

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = _getIterator(deleteProps), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var prop = _step.value;

            var variable = undefined;
            var predictate = undefined;
            var type = undefined;
            var whereOptionalTriples = [];
            var propagateDeletionProperty = prop.propagateDeletion();
            var propagateDeletionType = prop.type;

            var recusive = false;
            var variablePrefix = '';
            if (propagateDeletionType === _modelType) {
                recusive = true;
                variablePrefix = uri.slice(1); // strip the '?'
            }

            if (prop.isInverseRelationship()) {
                prop = prop.getPropertyFromInverseRelationship();
                variable = '?' + variablePrefix + prop.modelSchema.name + '_via_' + prop.name;
                predictate = propertyRdfUri(db[prop.modelSchema.name], prop.name);
                type = classRdfUri(db[prop.modelSchema.name]);
                whereOptionalTriples.push({
                    subject: variable,
                    predicate: predictate,
                    object: uri
                });
            } else {

                predictate = propertyRdfUri(db[_modelType], prop.name);

                variable = '?' + variablePrefix + prop.type + '_via_' + prop.name;
                type = classRdfUri(db[prop.type]);
                whereOptionalTriples.push({
                    subject: uri,
                    predicate: predictate,
                    object: variable
                });
            }

            var variablePredicate = variable + 'Predicate';
            if (propagateDeletionProperty !== true) {
                variablePredicate = propertyRdfUri(db[propagateDeletionType], propagateDeletionProperty);
            }

            var statement = {
                subject: variable,
                predicate: variablePredicate,
                object: variable + 'Object'
            };

            deleteTriples.push(statement);
            whereOptionalTriples.push(statement);

            whereOptionalTriples.push({
                subject: variable,
                predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                object: type
            });

            var _inner = undefined;
            if (db[propagateDeletionType].schema.propagateDeletionProperties.length && !recusive) {
                _inner = deleteCascade(db, propagateDeletionType, variable);
                deleteTriples = deleteTriples.concat(_inner.deleteTriples);
            }

            var patterns = [{
                type: 'bgp',
                triples: whereOptionalTriples
            }];

            if (_inner) {
                patterns.push(_inner.whereClause);
            }

            whereClause.push({
                type: 'optional',
                patterns: patterns
            });
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator['return']) {
                _iterator['return']();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }

    return { deleteTriples: deleteTriples, whereClause: whereClause };
};

exports.deleteCascade = deleteCascade;
// export let query2sparql = function(db, modelType, query, options) {
//     let sparson = query2sparson(db, modelType, query);
//     let generator = new SparqlGenerator();
//     return generator.stringify(sparson);
// };