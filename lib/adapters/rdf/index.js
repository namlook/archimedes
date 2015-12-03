'use strict';

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _sparqlClient = require('./sparql-client');

var _sparqlClient2 = _interopRequireDefault(_sparqlClient);

var _utils = require('./utils');

var _sparqljs = require('sparqljs');

var _eventStream = require('event-stream');

var _eventStream2 = _interopRequireDefault(_eventStream);

var _JSONStream = require('JSONStream');

var _JSONStream2 = _interopRequireDefault(_JSONStream);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var RDF_DATATYPES = {
    'http://www.w3.org/2001/XMLSchema#integer': 'number',
    'http://www.w3.org/2001/XMLSchema#decimal': 'number',
    'http://www.w3.org/2001/XMLSchema#float': 'number',
    'http://www.w3.org/2001/XMLSchema#double': 'number',
    'http://www.w3.org/2001/XMLSchema#boolean': 'boolean',
    'http://www.w3.org/2001/XMLSchema#dateTime': 'date'
};

exports['default'] = function (config) {
    config = config || {};

    if (!config.endpoint) {
        throw new Error('rdf adapter: endpoint is required');
    }

    return function (db) {

        var internals = {};
        internals.store = [];
        internals.sparqlClient = (0, _sparqlClient2['default'])(config.endpoint);

        return {
            name: 'rdf',

            beforeRegister: function beforeRegister(models) {
                var graphUri = config.graphUri;
                var defaultClassRdfPrefix = graphUri + '/classes';
                var defaultInstanceRdfPrefix = graphUri + '/instances';
                var defaultPropertyRdfPrefix = graphUri + '/properties';

                _lodash2['default'].forOwn(models, function (modelConfig, modelName) {
                    if (!_lodash2['default'].get(modelConfig, 'meta.classRdfUri')) {
                        _lodash2['default'].set(modelConfig, 'meta.classRdfUri', defaultClassRdfPrefix + '/' + modelName);
                    }

                    if (!_lodash2['default'].get(modelConfig, 'meta.instanceRdfPrefix')) {
                        _lodash2['default'].set(modelConfig, 'meta.instanceRdfPrefix', defaultInstanceRdfPrefix);
                    }

                    if (!_lodash2['default'].get(modelConfig, 'meta.propertyRdfPrefix')) {
                        _lodash2['default'].set(modelConfig, 'meta.propertyRdfPrefix', defaultPropertyRdfPrefix);
                    }

                    _lodash2['default'].forOwn(modelConfig.properties, function (propConfig, propertyName) {
                        if (!_lodash2['default'].get(propConfig, 'meta.rdfUri')) {
                            _lodash2['default'].set(propConfig, 'meta.rdfUri', defaultPropertyRdfPrefix + '/' + propertyName);
                        }
                    });
                });

                return _bluebird2['default'].resolve(models);
            },

            afterRegister: function afterRegister(passedDb) {
                return _bluebird2['default'].resolve().then(function () {
                    _lodash2['default'].forOwn(passedDb.registeredModels, function (model) {

                        var propertyUrisMapping = {};
                        var _iteratorNormalCompletion = true;
                        var _didIteratorError = false;
                        var _iteratorError = undefined;

                        try {
                            for (var _iterator = _getIterator(model.schema.properties), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                                var property = _step.value;

                                var propertyUri = property.config.meta.rdfUri;
                                propertyUrisMapping[propertyUri] = property.name;
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

                        _lodash2['default'].set(model, 'meta.propertyUrisMapping', propertyUrisMapping);
                    });

                    return passedDb;
                });
            },

            /**
             * Remove all triples from the graph
             *
             * @returns a promise
             */
            clear: function clear() {
                return this.execute('CLEAR GRAPH <' + config.graphUri + '>');
            },

            clearResource: function clearResource(modelType) {
                var _this = this;

                return _bluebird2['default'].resolve().then(function () {

                    var modelClassUri = (0, _utils.classRdfUri)(db[modelType]);

                    var sparson = {
                        type: 'update',
                        updates: [{
                            updateType: 'insertdelete',
                            graph: config.graphUri,
                            'delete': [{
                                type: 'bgp',
                                triples: [{
                                    subject: '?s',
                                    predicate: '?p',
                                    object: '?o'
                                }]
                            }],
                            insert: [],
                            where: [{
                                type: 'bgp',
                                triples: [{
                                    subject: '?s',
                                    predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                                    object: modelClassUri
                                }, {
                                    subject: '?s',
                                    predicate: '?p',
                                    object: '?o'
                                }]
                            }]
                        }]
                    };

                    /*** generate the sparql from the sparson ***/
                    var sparql = new _sparqljs.Generator().stringify(sparson);

                    return _this.execute(sparql);
                });
            },

            /**
             * Returns documents that match the query
             *
             * @params {string} modelType
             * @params {?object} query
             * @params {?object} options
             * @returns a promise which resolve an array of documents
             */
            find: function find(modelType, query, options) {
                var _this2 = this;

                return _bluebird2['default'].resolve().then(function () {

                    /**
                     * if _id is present in the query, perform a `fetch()`
                     * which is faster
                     */
                    if (query._id) {
                        if (_lodash2['default'].isObject(query._id)) {
                            var promises = query._id.$in.map(function (id) {
                                return _this2.fetch(modelType, id, options);
                            });
                            return _bluebird2['default'].all(promises);
                        }

                        return _this2.fetch(modelType, query._id, options).then(function (pojo) {
                            var results = [];
                            if (pojo) {
                                results.push(pojo);
                            }
                            return results;
                        });
                    }

                    var _query2whereClause = (0, _utils.query2whereClause)(db, modelType, query, options);

                    var orderBy = _query2whereClause.orderBy;
                    var whereClause = _query2whereClause.whereClause;

                    var sparson = {
                        type: 'query',
                        queryType: 'SELECT',
                        variables: ['?s'],
                        from: {
                            'default': [config.graphUri]
                        },
                        where: whereClause,
                        order: orderBy,
                        limit: options.limit,
                        distinct: options.distinct
                    };

                    /** options **/
                    if (options.offset) {
                        sparson.offset = options.offset;
                    }

                    sparson.order.push({ expression: '?s' });

                    /*** generate the sparql from the sparson ***/
                    var sparql = new _sparqljs.Generator().stringify(sparson);

                    return _this2.execute(sparql).then(function (data) {
                        var uris = data.map(function (o) {
                            return o.s.value;
                        });

                        if (uris.length === 1) {
                            return _this2.fetch(modelType, uris[0], options).then(function (pojo) {
                                return [pojo];
                            });
                        } else {

                            var CONCURRENCY_LIMIT = 5;

                            return _bluebird2['default'].map(_lodash2['default'].chunk(uris, 5), function (chunkUris) {
                                return _this2.describe(modelType, chunkUris, options);
                            }, { concurrency: CONCURRENCY_LIMIT }).then(function (results) {
                                return _lodash2['default'].flatten(results);
                            });
                        }
                    });
                });
            },

            stream: function stream(modelType, query, options) {
                var _this3 = this;

                var stream = undefined;
                var pauseStream = _eventStream2['default'].pause();

                var fetchDocTransform = _eventStream2['default'].map(function (uri, callback) {
                    _this3.fetch(modelType, uri, options).then(function (doc) {
                        if (doc) {
                            callback(null, doc);
                        } else {
                            callback(new Error(modelType + ': ' + uri + ' not found'));
                        }
                        pauseStream.resume();
                    })['catch'](function (err) {
                        callback(err);
                    });
                    pauseStream.pause();
                });

                /**
                 * if _id is present in the query, just use it
                 */
                if (query._id) {
                    var ids = [query._id];
                    if (_lodash2['default'].isObject(query._id)) {
                        ids = query._id.$in;
                    }
                    stream = _eventStream2['default'].readArray(ids);
                    return stream.pipe(pauseStream).pipe(fetchDocTransform);
                }

                var _query2whereClause2 = (0, _utils.query2whereClause)(db, modelType, query, options);

                var orderBy = _query2whereClause2.orderBy;
                var whereClause = _query2whereClause2.whereClause;

                var sparson = {
                    type: 'query',
                    queryType: 'SELECT',
                    variables: ['?s'],
                    from: {
                        'default': [config.graphUri]
                    },
                    where: whereClause,
                    order: orderBy,
                    limit: options.limit,
                    distinct: options.distinct
                };

                /** options **/
                if (options.offset) {
                    sparson.offset = options.offset;
                }

                sparson.order.push({ expression: '?s' });

                /*** generate the sparql from the sparson ***/
                var sparql = new _sparqljs.Generator().stringify(sparson);

                stream = internals.sparqlClient.stream(sparql);

                return stream.pipe(_JSONStream2['default'].parse('results.bindings.*.s.value')).pipe(pauseStream).pipe(fetchDocTransform);
            },

            describe: function describe(modelType, modelIdsOrUris, options) {
                var _this4 = this;

                var uris = undefined;
                return _bluebird2['default'].resolve().then(function () {
                    options.variableIndex = 0;

                    var modelClass = db[modelType];

                    if (!_lodash2['default'].isArray(modelIdsOrUris)) {
                        modelIdsOrUris = [modelIdsOrUris];
                    }

                    uris = modelIdsOrUris.map(function (modelIdOrUri) {
                        var uri = modelIdOrUri;
                        if (!_lodash2['default'].startsWith(modelIdOrUri, 'http://')) {
                            uri = (0, _utils.instanceRdfUri)(modelClass, modelIdOrUri);
                        }
                        return uri;
                    });

                    var templates = [];
                    var reduceError = false;
                    var patterns = uris.reduce(function (_patterns, uri) {
                        if (reduceError) {
                            return null;
                        }

                        var template = (0, _utils.constructTriples)(modelClass, uri, options);
                        var whereTriples = (0, _utils.constructWhereTriples)(modelClass, uri, options);
                        options.variableIndex++;

                        templates.push(template);
                        _patterns.push(whereTriples);
                        return _patterns;
                    }, []);

                    if (reduceError) {
                        throw reduceError;
                    }

                    var whereClause = patterns;
                    if (patterns.length > 1) {
                        whereClause = {
                            type: 'union',
                            patterns: patterns
                        };
                    }

                    var sparson = {
                        type: 'query',
                        queryType: 'CONSTRUCT',
                        from: {
                            'default': [config.graphUri]
                        },
                        template: templates,
                        where: whereClause
                    };

                    /*** generate the sparql from the sparson ***/
                    var sparql = new _sparqljs.Generator().stringify(sparson);
                    // console.log('')
                    // console.log('')
                    // console.log(sparql);
                    // console.log('')
                    // console.log('')
                    return _this4.execute(sparql);
                }).then(function (data) {
                    if (!data.length) {
                        return [];
                    }

                    var rdfDocs = data.reduce(function (_rdfDocs, item) {
                        var subject = item.subject;
                        var predicate = item.predicate;
                        var object = item.object;

                        var doc = _rdfDocs[subject.value] || {};
                        doc._id = subject.value;
                        doc[predicate.value] = doc[predicate.value] || [];

                        if (object.datatype) {
                            var datatype = RDF_DATATYPES[object.datatype];
                            if (datatype === 'number') {
                                object.value = parseFloat(object.value);
                            } else if (datatype === 'date') {
                                object.value = new Date(object.value);
                            } else if (datatype === 'boolean') {
                                if (['true', '1', 1, 'yes'].indexOf(object.value) > -1) {
                                    object.value = true;
                                } else {
                                    object.value = false;
                                }
                            } else {
                                console.log('UNKNOWN DATATYPE !!!', object.datatype);
                            }
                        }

                        doc[predicate.value].push(object.value);
                        _rdfDocs[subject.value] = doc;
                        return _rdfDocs;
                    }, {});

                    var pojos = uris.map(function (uri) {
                        return (0, _utils.rdfDoc2pojo)(db, modelType, rdfDocs[uri]);
                    });
                    return pojos;
                });
            },

            /**
             * Fetch an uri or a model id from the database
             *
             * @params {string} modelType - the model type
             * @params {string} modelIdOrUri - an uri or a model id
             * @returns a promise that resolve a pojo which contains
             *      all properties of the fetched document
             */
            fetch: function fetch(modelType, modelIdOrUri, options) {
                var _this5 = this;

                return _bluebird2['default'].resolve().then(function () {

                    var uri = modelIdOrUri;
                    var modelClass = db[modelType];

                    if (!_lodash2['default'].startsWith(modelIdOrUri, 'http://')) {
                        uri = (0, _utils.instanceRdfUri)(modelClass, modelIdOrUri);
                    }

                    var template = (0, _utils.constructTriples)(modelClass, uri, options);

                    var whereTriples = (0, _utils.constructWhereTriples)(modelClass, uri, options);

                    var sparson = {
                        type: 'query',
                        queryType: 'CONSTRUCT',
                        from: {
                            'default': [config.graphUri]
                        },
                        template: template,
                        where: whereTriples
                    };

                    /*** generate the sparql from the sparson ***/
                    var sparql = new _sparqljs.Generator().stringify(sparson);
                    // console.log('')
                    // console.log('')
                    // console.log(sparql);
                    // console.log('')
                    // console.log('')
                    return _this5.execute(sparql);
                }).then(function (data) {
                    if (!data.length) {
                        return null;
                    }

                    var rdfDoc = data.reduce(function (doc, item) {
                        var subject = item.subject;
                        var predicate = item.predicate;
                        var object = item.object;

                        doc._id = subject.value;
                        doc[predicate.value] = doc[predicate.value] || [];

                        if (object.datatype) {
                            var datatype = RDF_DATATYPES[object.datatype];

                            if (datatype === 'number') {
                                object.value = parseFloat(object.value);
                            } else if (datatype === 'date') {
                                object.value = new Date(object.value);
                            } else if (datatype === 'boolean') {
                                if (['true', '1', 1, 'yes'].indexOf(object.value) > -1) {
                                    object.value = true;
                                } else {
                                    object.value = false;
                                }
                            } else {
                                console.log('UNKNOWN DATATYPE !!!', object.datatype);
                            }
                        }

                        doc[predicate.value].push(object.value);
                        return doc;
                    }, {});

                    return (0, _utils.rdfDoc2pojo)(db, modelType, rdfDoc);
                });
            },

            /**
             * Count the number of document that match the query
             *
             * @params {string} modelType
             * @params {?object} query
             * @params {?options} options
             * @returns a promise which resolve into the number total
             *      of document that matches the query
             */
            count: function count(modelType, query, options) {
                var _this6 = this;

                return _bluebird2['default'].resolve().then(function () {
                    var _query2whereClause3 = (0, _utils.query2whereClause)(db, modelType, query, options);

                    var whereClause = _query2whereClause3.whereClause;

                    var sparson = {
                        type: 'query',
                        queryType: 'SELECT',
                        variables: [{
                            expression: {
                                expression: '?s',
                                type: 'aggregate',
                                aggregation: 'count',
                                distinct: false
                            },
                            variable: '?count'
                        }],
                        from: {
                            'default': [config.graphUri]
                        },
                        where: whereClause,
                        limit: 50
                    };

                    /*** generate the sparql from the sparson ***/
                    var sparql = new _sparqljs.Generator().stringify(sparson);

                    return _this6.execute(sparql);
                }).then(function (data) {
                    return parseInt(data[0].count.value, 10);
                });
            },

            /**
             * Aggregate the properties values that match the query
             *
             * @params {string} modelType
             * @params {?object} query
             * @params {?options} options
             * @returns a promise which resolve into the number total
             *      of document that matches the query
             */
            aggregate: function aggregate(modelType, aggregator, query, options) {
                var _this7 = this;

                var modelClass = db[modelType];
                options.sort = _lodash2['default'].get(options, 'sort', []);

                var variablePropertyMap = {};
                return _bluebird2['default'].resolve().then(function () {
                    var _query2whereClause4 = (0, _utils.query2whereClause)(db, modelType, query);

                    var whereClause = _query2whereClause4.whereClause;

                    var variables = [];
                    var groupByExpressions = [];
                    var useGroupBy = false;

                    var aggregatorItems = [];
                    var _iteratorNormalCompletion2 = true;
                    var _didIteratorError2 = false;
                    var _iteratorError2 = undefined;

                    try {
                        for (var _iterator2 = _getIterator(_Object$keys(aggregator)), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                            var field = _step2.value;

                            var propertyName = aggregator[field];
                            var variable = field.split('.').join('___');

                            if (_lodash2['default'].isObject(propertyName)) {
                                useGroupBy = true;
                                var _iteratorNormalCompletion4 = true;
                                var _didIteratorError4 = false;
                                var _iteratorError4 = undefined;

                                try {
                                    for (var _iterator4 = _getIterator(_Object$keys(propertyName)), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                                        var operator = _step4.value;

                                        propertyName = propertyName[operator];

                                        var isID = false;
                                        if (_lodash2['default'].endsWith(propertyName, '._id')) {
                                            propertyName = propertyName.replace(/\._id$/, '');
                                            isID = true;
                                        }

                                        operator = _lodash2['default'].trimLeft(operator, '$');
                                        var postSorting = 0;
                                        if (operator === 'concat') {
                                            operator = 'group_concat';

                                            // remove sorted variables that are group_concat
                                            var _sort = [];
                                            var _iteratorNormalCompletion5 = true;
                                            var _didIteratorError5 = false;
                                            var _iteratorError5 = undefined;

                                            try {
                                                for (var _iterator5 = _getIterator(options.sort), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                                                    var _variable = _step5.value;

                                                    var sortingVariable = _variable;
                                                    var inversed = false;
                                                    if (sortingVariable[0] === '-') {
                                                        sortingVariable = sortingVariable.slice(1);
                                                        inversed = true;
                                                    }
                                                    if (sortingVariable === variable) {
                                                        if (inversed) {
                                                            postSorting = -1;
                                                        } else {
                                                            postSorting = 1;
                                                        }
                                                    } else {
                                                        _sort.push(_variable);
                                                    }
                                                }
                                            } catch (err) {
                                                _didIteratorError5 = true;
                                                _iteratorError5 = err;
                                            } finally {
                                                try {
                                                    if (!_iteratorNormalCompletion5 && _iterator5['return']) {
                                                        _iterator5['return']();
                                                    }
                                                } finally {
                                                    if (_didIteratorError5) {
                                                        throw _iteratorError5;
                                                    }
                                                }
                                            }

                                            options.sort = _sort;
                                        }
                                        aggregatorItems.push({
                                            propertyName: propertyName,
                                            operator: operator,
                                            variable: variable,
                                            field: field,
                                            isID: isID,
                                            postSorting: postSorting
                                        });
                                    }
                                } catch (err) {
                                    _didIteratorError4 = true;
                                    _iteratorError4 = err;
                                } finally {
                                    try {
                                        if (!_iteratorNormalCompletion4 && _iterator4['return']) {
                                            _iterator4['return']();
                                        }
                                    } finally {
                                        if (_didIteratorError4) {
                                            throw _iteratorError4;
                                        }
                                    }
                                }
                            } else {
                                var isID = false;
                                if (_lodash2['default'].endsWith(propertyName, '._id')) {
                                    propertyName = propertyName.replace(/\._id$/, '');
                                    isID = true;
                                }

                                var aggregatorItem = {
                                    propertyName: propertyName,
                                    variable: variable,
                                    field: field,
                                    isID: isID
                                };

                                aggregatorItems.push(aggregatorItem);
                            }
                        }
                    } catch (err) {
                        _didIteratorError2 = true;
                        _iteratorError2 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                                _iterator2['return']();
                            }
                        } finally {
                            if (_didIteratorError2) {
                                throw _iteratorError2;
                            }
                        }
                    }

                    var orderBy = options.sort.map(function (variable) {
                        var descending = false;
                        if (variable[0] === '-') {
                            descending = true;
                            variable = variable.slice(1);
                        }
                        variable = variable.split('.').join('___');
                        return {
                            expression: '?' + variable,
                            descending: descending
                        };
                    });

                    var _iteratorNormalCompletion3 = true;
                    var _didIteratorError3 = false;
                    var _iteratorError3 = undefined;

                    try {
                        for (var _iterator3 = _getIterator(aggregatorItems), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                            var item = _step3.value;
                            var propertyName = item.propertyName;
                            var operator = item.operator;
                            var variable = item.variable;
                            var isID = item.isID;
                            var postSorting = item.postSorting;

                            // if (!operator) {
                            variablePropertyMap[variable] = {
                                propertyName: propertyName,
                                operator: operator,
                                property: modelClass.schema.getProperty(propertyName),
                                isID: isID,
                                postSorting: postSorting
                            };
                            // }

                            if (propertyName === '_id') {

                                variables.push({
                                    expression: '?s',
                                    variable: '?' + variable
                                });
                            } else {

                                var predicate = undefined;
                                if (_lodash2['default'].endsWith(propertyName, '._type')) {
                                    predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
                                } else if (_lodash2['default'].contains(propertyName, '.')) {
                                    predicate = (0, _utils.propertyName2Sparson)(modelClass, propertyName);
                                } else if (propertyName !== true) {
                                    predicate = (0, _utils.propertyRdfUri)(modelClass, propertyName);
                                }

                                if (operator) {

                                    var propertyVariable = undefined;

                                    if (operator === 'count' && propertyName === true) {
                                        propertyVariable = '?s';
                                    } else {
                                        var triple = undefined;
                                        if (_lodash2['default'].isObject(predicate)) {
                                            triple = _lodash2['default'].find(whereClause[0].triples, 'predicate.items', predicate.items);
                                        } else {
                                            triple = _lodash2['default'].find(whereClause[0].triples, 'predicate', predicate);
                                        }

                                        if (triple) {
                                            propertyVariable = triple.object;
                                        } else {
                                            propertyVariable = '?' + _lodash2['default'].camelCase(propertyName);
                                            whereClause[0].triples.push({
                                                subject: '?s',
                                                predicate: predicate,
                                                object: propertyVariable
                                            });
                                        }
                                    }

                                    var expression = {
                                        expression: propertyVariable,
                                        type: 'aggregate',
                                        aggregation: operator
                                    };

                                    if (operator === 'group_concat') {
                                        expression.separator = '|||****|||';
                                        expression.distinct = options.distinct;
                                    }

                                    variables.push({
                                        expression: expression,
                                        variable: '?' + variable
                                    });
                                } else {
                                    var triple = undefined;
                                    if (_lodash2['default'].isObject(predicate)) {
                                        triple = _lodash2['default'].find(whereClause[0].triples, 'predicate.items', predicate.items);
                                    } else {
                                        triple = _lodash2['default'].find(whereClause[0].triples, 'predicate', predicate);
                                    }

                                    if (triple) {
                                        variables.push({
                                            expression: triple.object,
                                            variable: '?' + variable
                                        });
                                        variable = triple.object;
                                    } else {
                                        variable = '?' + variable;
                                        whereClause[0].triples.push({
                                            subject: '?s',
                                            predicate: predicate,
                                            object: variable
                                        });
                                        variables.push(variable);
                                    }
                                    if (useGroupBy) {
                                        groupByExpressions.push({ expression: variable });
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        _didIteratorError3 = true;
                        _iteratorError3 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion3 && _iterator3['return']) {
                                _iterator3['return']();
                            }
                        } finally {
                            if (_didIteratorError3) {
                                throw _iteratorError3;
                            }
                        }
                    }

                    var sparson = {
                        type: 'query',
                        queryType: 'SELECT',
                        variables: variables,
                        from: {
                            'default': [config.graphUri]
                        },
                        where: whereClause,
                        distinct: options.distinct,
                        limit: options.limit
                    };

                    if (groupByExpressions.length) {
                        sparson.group = groupByExpressions;
                    }

                    if (orderBy.length) {
                        sparson.order = orderBy;
                    }
                    // console.dir(sparson, {depth: 10});

                    // /*** generate the sparql from the sparson ***/
                    var sparql = new _sparqljs.Generator().stringify(sparson);

                    // console.log(sparql);

                    return _this7.execute(sparql);
                }).then(function (data) {
                    var results = [];
                    var _iteratorNormalCompletion6 = true;
                    var _didIteratorError6 = false;
                    var _iteratorError6 = undefined;

                    try {
                        for (var _iterator6 = _getIterator(data), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                            var item = _step6.value;

                            var resultItem = {};

                            var _iteratorNormalCompletion7 = true;
                            var _didIteratorError7 = false;
                            var _iteratorError7 = undefined;

                            try {
                                for (var _iterator7 = _getIterator(_Object$keys(item)), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                                    var variable = _step7.value;
                                    var _item$variable = item[variable];
                                    var value = _item$variable.value;
                                    var datatype = _item$variable.datatype;
                                    var type = _item$variable.type;
                                    var _variablePropertyMap$variable = variablePropertyMap[variable];
                                    var propertyName = _variablePropertyMap$variable.propertyName;
                                    var property = _variablePropertyMap$variable.property;
                                    var operator = _variablePropertyMap$variable.operator;
                                    var isID = _variablePropertyMap$variable.isID;
                                    var postSorting = _variablePropertyMap$variable.postSorting;

                                    var propertyType = property && property.type;
                                    datatype = RDF_DATATYPES[datatype];
                                    if (type === 'uri') {

                                        if (propertyName === '_id') {
                                            value = (0, _utils.uri2id)(modelClass, value);
                                        } else if (propertyName === '_type') {
                                            value = modelClass.name;
                                        } else if (_lodash2['default'].endsWith(propertyName, '._type')) {
                                            propertyName = propertyName.replace(/\._type$/, '');
                                            property = modelClass.schema.getProperty(propertyName);
                                            value = property.type;
                                        } else {
                                            value = (0, _utils.uri2id)(db[propertyType], value);
                                        }
                                    } else if (operator) {
                                        if (operator === 'group_concat') {
                                            value = value.split('|||****|||');
                                            if (isID) {
                                                var _values = [];
                                                var _iteratorNormalCompletion8 = true;
                                                var _didIteratorError8 = false;
                                                var _iteratorError8 = undefined;

                                                try {
                                                    for (var _iterator8 = _getIterator(value), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                                                        var val = _step8.value;

                                                        _values.push((0, _utils.uri2id)(db[propertyType], val));
                                                    }
                                                } catch (err) {
                                                    _didIteratorError8 = true;
                                                    _iteratorError8 = err;
                                                } finally {
                                                    try {
                                                        if (!_iteratorNormalCompletion8 && _iterator8['return']) {
                                                            _iterator8['return']();
                                                        }
                                                    } finally {
                                                        if (_didIteratorError8) {
                                                            throw _iteratorError8;
                                                        }
                                                    }
                                                }

                                                value = _values;
                                            }
                                            if (postSorting) {
                                                value = _lodash2['default'].sortBy(value);
                                                if (postSorting === -1) {
                                                    value.reverse();
                                                }
                                            }
                                        } else {
                                            if (String(parseInt(value, 10)) === value) {
                                                value = parseInt(value, 10);
                                            } else {
                                                value = parseFloat(parseFloat(value).toFixed(2));
                                            }
                                        }
                                    } else if (datatype === 'boolean' || propertyType === 'boolean') {

                                        if (['true', '1', 'yes', 1].indexOf(value) > -1) {
                                            value = true;
                                        } else {
                                            value = false;
                                        }
                                    } else if (propertyType === 'number' || datatype === 'number') {

                                        if (String(parseInt(value, 10)) === value) {
                                            value = parseInt(value, 10);
                                        } else {
                                            value = parseFloat(parseFloat(value).toFixed(2));
                                        }
                                    }
                                    _lodash2['default'].set(resultItem, variable.split('___').join('.'), value);
                                }
                            } catch (err) {
                                _didIteratorError7 = true;
                                _iteratorError7 = err;
                            } finally {
                                try {
                                    if (!_iteratorNormalCompletion7 && _iterator7['return']) {
                                        _iterator7['return']();
                                    }
                                } finally {
                                    if (_didIteratorError7) {
                                        throw _iteratorError7;
                                    }
                                }
                            }

                            results.push(resultItem);
                        }
                    } catch (err) {
                        _didIteratorError6 = true;
                        _iteratorError6 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion6 && _iterator6['return']) {
                                _iterator6['return']();
                            }
                        } finally {
                            if (_didIteratorError6) {
                                throw _iteratorError6;
                            }
                        }
                    }

                    return results;
                });
            },

            groupBy: function groupBy(modelType, aggregator, query, options) {
                var _this8 = this;

                return _bluebird2['default'].resolve().then(function () {
                    var _query2whereClause5 = (0, _utils.query2whereClause)(db, modelType, query);

                    var whereClause = _query2whereClause5.whereClause;
                    var propertyNames = aggregator.property;
                    var aggregation = aggregator.aggregation;

                    var variablesMap = {};
                    var variableNames = [];
                    /** construct the property value to perform the group by **/
                    var variableIdx = 0;
                    var _iteratorNormalCompletion9 = true;
                    var _didIteratorError9 = false;
                    var _iteratorError9 = undefined;

                    try {
                        for (var _iterator9 = _getIterator(propertyNames), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                            var propertyName = _step9.value;

                            var propertyUri = (0, _utils.propertyRdfUri)(db[modelType], propertyName);
                            var predicate = undefined;
                            if (_lodash2['default'].contains(propertyName, '.')) {
                                predicate = (0, _utils.propertyName2Sparson)(db[modelType], propertyName);
                            } else {
                                predicate = propertyUri;
                            }
                            var variable = '?aggregatedPropertyName' + variableIdx;
                            whereClause.push({
                                subject: '?s',
                                predicate: predicate,
                                object: variable
                            });
                            variableNames.push(variable);
                            variablesMap[variable] = propertyName;
                            variableIdx++;
                        }

                        /** construct the aggregation value **/
                    } catch (err) {
                        _didIteratorError9 = true;
                        _iteratorError9 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion9 && _iterator9['return']) {
                                _iterator9['return']();
                            }
                        } finally {
                            if (_didIteratorError9) {
                                throw _iteratorError9;
                            }
                        }
                    }

                    var targetName = aggregation.target;

                    var targetPropertyUri = (0, _utils.propertyRdfUri)(db[modelType], targetName);
                    var aggregationPredicate = undefined;
                    if (_lodash2['default'].contains(targetName, '.')) {
                        aggregationPredicate = (0, _utils.propertyName2Sparson)(db[modelType], targetName);
                    } else {
                        aggregationPredicate = targetPropertyUri;
                    }
                    whereClause.push({
                        subject: '?s',
                        predicate: aggregationPredicate,
                        object: '?aggregatedTargetName'
                    });

                    var orderBy = [];
                    var $valueUsed = false;
                    var _iteratorNormalCompletion10 = true;
                    var _didIteratorError10 = false;
                    var _iteratorError10 = undefined;

                    try {
                        for (var _iterator10 = _getIterator(_lodash2['default'].get(options, 'sort', [])), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                            var propertyName = _step10.value;

                            if (!propertyName) {
                                continue;
                            }

                            var descending = false;
                            if (propertyName[0] === '-') {
                                propertyName = _lodash2['default'].trimLeft(propertyName, '-');
                                descending = true;
                            }

                            var variable = undefined;
                            if (propertyName === '$value') {
                                $valueUsed = true;
                                variable = '?value';
                            } else {
                                variable = _lodash2['default'].invert(variablesMap)[propertyName];
                                if (!variable) {
                                    throw new Error('cannot sort by the unknown property: "' + propertyName + '"');
                                }
                            }

                            orderBy.push({
                                expression: variable,
                                descending: descending
                            });
                        }
                    } catch (err) {
                        _didIteratorError10 = true;
                        _iteratorError10 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion10 && _iterator10['return']) {
                                _iterator10['return']();
                            }
                        } finally {
                            if (_didIteratorError10) {
                                throw _iteratorError10;
                            }
                        }
                    }

                    if (!$valueUsed) {
                        orderBy.push({ expression: '?value', descending: true });
                    }

                    /** build the sparson **/
                    var sparson = {
                        type: 'query',
                        queryType: 'SELECT',
                        variables: variableNames.concat([{
                            expression: {
                                expression: '?aggregatedTargetName',
                                type: 'aggregate',
                                aggregation: aggregation.operator,
                                distinct: false
                            },
                            variable: '?value'
                        }]),
                        from: {
                            'default': [config.graphUri]
                        },
                        where: whereClause,
                        group: variableNames.map(function (variable) {
                            return { expression: variable };
                        }),
                        order: orderBy,
                        limit: 1000
                    };

                    /*** generate the sparql from the sparson ***/
                    var sparql = new _sparqljs.Generator().stringify(sparson);

                    return _this8.execute(sparql).then(function (data) {

                        /** WARNING AWEFUL HACK !
                         * it works only with 1 or 2 properties.
                         * the following should be rewrited and use reccursion
                         */

                        var target = db[modelType].schema.getProperty(targetName);

                        var _compute = function _compute(item, nameIdx, names) {
                            var variable = names[nameIdx];
                            var name = _lodash2['default'].trimLeft(variable, '?');
                            var label = item[name].value;

                            if (nameIdx + 2 >= names.length) {
                                var nextName = _lodash2['default'].trimLeft(names[nameIdx + 1], '?');

                                var value = parseFloat(item[nextName].value);
                                if (aggregation.operator !== 'count') {
                                    var _target$validate = target.validate(value);

                                    var error = _target$validate.error;
                                    var validatedValue = _target$validate.value;

                                    if (error) {
                                        throw error;
                                    } else {
                                        value = validatedValue;
                                    }
                                }

                                return { label: label, value: value };
                            }
                            return { label: label, values: _compute(item, nameIdx + 1, names) };
                        };

                        var computeResult = function computeResult(_data, variables) {

                            var _results = {};
                            var _iteratorNormalCompletion11 = true;
                            var _didIteratorError11 = false;
                            var _iteratorError11 = undefined;

                            try {
                                for (var _iterator11 = _getIterator(_data), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
                                    var item = _step11.value;

                                    var res = _compute(item, 0, variables);
                                    _results[res.label] = _results[res.label] || [];
                                    if (res.values) {
                                        _results[res.label].push(res.values);
                                    } else {
                                        _results[res.label].push(res.value);
                                    }
                                }
                            } catch (err) {
                                _didIteratorError11 = true;
                                _iteratorError11 = err;
                            } finally {
                                try {
                                    if (!_iteratorNormalCompletion11 && _iterator11['return']) {
                                        _iterator11['return']();
                                    }
                                } finally {
                                    if (_didIteratorError11) {
                                        throw _iteratorError11;
                                    }
                                }
                            }

                            var results = [];
                            var _iteratorNormalCompletion12 = true;
                            var _didIteratorError12 = false;
                            var _iteratorError12 = undefined;

                            try {
                                for (var _iterator12 = _getIterator(_Object$keys(_results)), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
                                    var key = _step12.value;

                                    /** Virtuoso hack: convert integer as boolean **/
                                    var label = key;
                                    if (['0', '1'].indexOf(label) > -1 && !isNaN(parseFloat(label))) {
                                        label = Boolean(parseFloat(label));
                                    }
                                    /***/

                                    if (variables.length > 2) {
                                        results.push({ label: '' + label, values: _results[key] });
                                    } else {
                                        results.push({ label: '' + label, value: _results[key][0] });
                                    }
                                }
                            } catch (err) {
                                _didIteratorError12 = true;
                                _iteratorError12 = err;
                            } finally {
                                try {
                                    if (!_iteratorNormalCompletion12 && _iterator12['return']) {
                                        _iterator12['return']();
                                    }
                                } finally {
                                    if (_didIteratorError12) {
                                        throw _iteratorError12;
                                    }
                                }
                            }

                            return results;
                        };

                        return computeResult(data, variableNames.concat(['value']));
                    });
                });
            },

            sync: function sync(modelType, pojo) {
                var _this9 = this;

                return _bluebird2['default'].resolve().then(function () {

                    var insertTriples = (0, _utils.pojo2triples)(db, modelType, pojo);

                    var deleteTriples = [{
                        subject: insertTriples[0].subject,
                        predicate: '?p',
                        object: '?o'
                    }];

                    var sparson = {
                        type: 'update',
                        updates: [{
                            updateType: 'deletewhere',
                            'delete': [{
                                type: 'graph',
                                name: config.graphUri,
                                triples: deleteTriples
                            }]
                            // insert: [],
                            // where: [
                            //     {
                            //         type: 'bgp',
                            //         triples: deleteTriples
                            //     }
                            // ]
                        }, {
                            updateType: 'insert',
                            insert: [{
                                type: 'graph',
                                name: config.graphUri,
                                triples: insertTriples
                            }]
                        }]
                    };

                    var sparql = new _sparqljs.Generator().stringify(sparson);

                    return _this9.execute(sparql);
                }).then(function () {
                    return pojo;
                });
            },

            batchSync: function batchSync(modelType, pojos) {
                var _this10 = this;

                return _bluebird2['default'].resolve().then(function () {

                    var insertTriples = _lodash2['default'].flatten(pojos.map(function (item) {
                        return (0, _utils.pojo2triples)(db, modelType, item);
                    }));

                    var uris = _lodash2['default'].uniq(insertTriples.map(function (triple) {
                        return triple.subject;
                    }));

                    var sparson = {
                        type: 'update',
                        updates: [{
                            updateType: 'insertdelete',
                            // updateType: 'deletewhere',
                            'delete': [{
                                type: 'graph',
                                name: config.graphUri,
                                triples: [{
                                    subject: '?s',
                                    predicate: '?p',
                                    object: '?o'
                                }]
                                // triples: [
                                //     {
                                //         subject: '?s',
                                //         predicate: '?p',
                                //         object: '?o'
                                //     },
                                //     {
                                //         type: 'filter',
                                //         expression: {
                                //             type: 'operation',
                                //             operator: 'in',
                                //             args: ['?s', uris]
                                //         }
                                //     }
                                // ]
                            }],
                            insert: [],
                            where: [{
                                type: 'bgp',
                                triples: [{
                                    subject: '?s',
                                    predicate: '?p',
                                    object: '?o'
                                }]
                            }, {
                                type: 'filter',
                                expression: {
                                    type: 'operation',
                                    operator: 'in',
                                    args: ['?s', uris]
                                }
                            }]
                        }, {
                            updateType: 'insert',
                            insert: [{
                                type: 'graph',
                                name: config.graphUri,
                                triples: insertTriples
                            }]
                        }]
                    };

                    var sparql = new _sparqljs.Generator().stringify(sparson);

                    return _this10.execute(sparql);
                }).then(function () {
                    return pojos;
                });
            },

            update: function update(modelType, modelIdOrUri, operations) {
                var _this11 = this;

                return _bluebird2['default'].resolve().then(function () {

                    var uri = modelIdOrUri;

                    if (!_lodash2['default'].startsWith(modelIdOrUri, 'http://')) {
                        uri = (0, _utils.instanceRdfUri)(db[modelType], modelIdOrUri);
                    }

                    var deleteTriples = operations.map(function (operation) {
                        if (_lodash2['default'].contains(['unset', 'pull'], operation.operator)) {
                            return (0, _utils.operation2triple)(db, modelType, uri, operation);
                        }
                    });

                    deleteTriples = _lodash2['default'].compact(deleteTriples);

                    var sparson = {
                        type: 'update',
                        updates: []
                    };

                    if (deleteTriples.length) {
                        sparson.updates.push({
                            updateType: 'insertdelete',
                            'delete': [{
                                type: 'graph',
                                name: config.graphUri,
                                triples: deleteTriples
                            }],
                            insert: [],
                            where: [{
                                type: 'bgp',
                                triples: deleteTriples
                            }]
                        });
                    }

                    // var objectVariableIndex = 0;
                    // var deletewhereTriples = [];
                    var insertTriples = operations.map(function (operation) {
                        if (_lodash2['default'].contains(['set', 'push'], operation.operator)) {
                            var triple = (0, _utils.operation2triple)(db, modelType, uri, operation);
                            // deletewhereTriples.push([{
                            //     subject: uri,
                            //     predicate: triple.predicate,
                            //     object: `?o${objectVariableIndex++}`
                            // }]);
                            return triple;
                        }
                    });
                    insertTriples = _lodash2['default'].compact(insertTriples);

                    // if (deletewhereTriples.length) {
                    //     deletewhereTriples.forEach((dwTriples) => {
                    //         sparson.updates.push({
                    //             updateType: 'deletewhere',
                    //             delete: [
                    //                 {
                    //                     type: 'graph',
                    //                     name: config.graphUri,
                    //                     triples: dwTriples
                    //                 }
                    //             ]
                    //         });
                    //     });
                    // }

                    if (insertTriples.length) {
                        sparson.updates.push({
                            updateType: 'insert',
                            insert: [{
                                type: 'graph',
                                name: config.graphUri,
                                triples: insertTriples
                            }]
                        });
                    }

                    // console.log(' ');
                    // console.log(' ');
                    // console.log(' ');
                    // console.dir(sparson, {depth: 10});
                    // console.log(' ');
                    // console.log(' ');
                    // console.log(' ');

                    var sparql = new _sparqljs.Generator().stringify(sparson);

                    // console.log(sparql);
                    // console.log(' ');
                    // console.log(' ');
                    // console.log(' ');

                    return _this11.execute(sparql);
                });
            },

            'delete': function _delete(modelType, modelIdOrUri) {
                var _this12 = this;

                return _bluebird2['default'].resolve().then(function () {

                    var uri = modelIdOrUri;

                    if (!_lodash2['default'].startsWith(modelIdOrUri, 'http://')) {
                        uri = (0, _utils.instanceRdfUri)(db[modelType], modelIdOrUri);
                    }

                    var _deleteCascade = (0, _utils.deleteCascade)(db, modelType, uri);

                    var deleteTriples = _deleteCascade.deleteTriples;
                    var whereClause = _deleteCascade.whereClause;

                    var sparson = {
                        type: 'update',
                        updates: [{
                            updateType: 'insertdelete',
                            'delete': [{
                                type: 'graph',
                                name: config.graphUri,
                                triples: deleteTriples
                            }],
                            insert: [],
                            where: whereClause
                        }]
                    };

                    // console.log('');
                    // console.log('');
                    // console.dir(sparson, {depth: 10});
                    // console.log('');
                    // console.log('');

                    var sparql = new _sparqljs.Generator().stringify(sparson);

                    // console.log('');
                    // console.log('');
                    // console.log(sparql);
                    // console.log('');
                    // console.log('');

                    return _this12.execute(sparql);
                });
            },

            execute: function execute(sparql) {
                // console.log('');
                // console.log('');
                // console.log(sparql);
                // console.log('');
                // console.log('');
                return _bluebird2['default'].resolve().then(function () {
                    return internals.sparqlClient.execute(sparql);
                }).then(function (data) {
                    var results = undefined;
                    if (data) {
                        results = data.results.bindings;
                    }

                    /** hack for virtuoso **/
                    if (results && _lodash2['default'].contains(sparql.toLowerCase(), 'construct')) {
                        results = results.map(function (item) {
                            if (item.subject) {
                                return item;
                            }
                            return {
                                subject: item.s,
                                predicate: item.p,
                                object: item.o
                            };
                        });
                    }
                    return results;
                });
            }

        };
    };
};

module.exports = exports['default'];