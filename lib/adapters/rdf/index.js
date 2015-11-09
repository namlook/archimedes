'use strict';

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

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

            /**
             * Returns documents that match the query
             *
             * @params {string} modelType
             * @params {?object} query
             * @params {?object} options
             * @returns a promise which resolve an array of documents
             */
            find: function find(modelType, query, options) {
                var _this = this;

                return _bluebird2['default'].resolve().then(function () {

                    /**
                     * if _id is present in the query, perform a `fetch()`
                     * which is faster
                     */
                    if (query._id) {
                        if (_lodash2['default'].isObject(query._id)) {
                            var promises = query._id.$in.map(function (id) {
                                return _this.fetch(modelType, id, options);
                            });
                            return _bluebird2['default'].all(promises);
                        }

                        return _this.fetch(modelType, query._id, options).then(function (pojo) {
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

                    return _this.execute(sparql).then(function (data) {
                        var uris = data.map(function (o) {
                            return o.s.value;
                        });

                        if (uris.length === 1) {
                            return _this.fetch(modelType, uris[0], options).then(function (pojo) {
                                return [pojo];
                            });
                        } else {

                            var CONCURRENCY_LIMIT = 5;

                            return _bluebird2['default'].map(_lodash2['default'].chunk(uris, 5), function (chunkUris) {
                                return _this.describe(modelType, chunkUris, options);
                            }, { concurrency: CONCURRENCY_LIMIT }).then(function (results) {
                                return _lodash2['default'].flatten(results);
                            });
                        }
                    });
                });
            },

            stream: function stream(modelType, query, options) {
                var _this2 = this;

                var stream = undefined;
                var pauseStream = _eventStream2['default'].pause();

                var fetchDocTransform = _eventStream2['default'].map(function (uri, callback) {
                    _this2.fetch(modelType, uri, options).then(function (doc) {
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
                var _this3 = this;

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
                    return _this3.execute(sparql);
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
                var _this4 = this;

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
                    return _this4.execute(sparql);
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
                var _this5 = this;

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

                    return _this5.execute(sparql);
                }).then(function (data) {
                    return parseInt(data[0].count.value, 10);
                });
            },

            groupBy: function groupBy(modelType, aggregator, query, options) {
                var _this6 = this;

                return _bluebird2['default'].resolve().then(function () {
                    var _query2whereClause4 = (0, _utils.query2whereClause)(db, modelType, query, options);

                    var whereClause = _query2whereClause4.whereClause;
                    var property = aggregator.property;
                    var aggregation = aggregator.aggregation;

                    /** construct the property value to perform the group by **/
                    var propertyUri = (0, _utils.propertyRdfUri)(db[modelType], property);
                    var predicate = undefined;
                    if (_lodash2['default'].contains(property, '.')) {
                        predicate = (0, _utils.propertyName2Sparson)(db[modelType], property);
                    } else {
                        predicate = propertyUri;
                    }
                    whereClause.push({
                        subject: '?s',
                        predicate: predicate,
                        object: '?aggregatedPropertyName'
                    });

                    /** construct the aggregation value **/
                    var target = aggregation.target;

                    var targetPropertyUri = (0, _utils.propertyRdfUri)(db[modelType], target);
                    var aggregationPredicate = undefined;
                    if (_lodash2['default'].contains(target, '.')) {
                        aggregationPredicate = (0, _utils.propertyName2Sparson)(db[modelType], target);
                    } else {
                        aggregationPredicate = targetPropertyUri;
                    }
                    whereClause.push({
                        subject: '?s',
                        predicate: aggregationPredicate,
                        object: '?aggregatedTargetName'
                    });

                    /** build the sparson **/
                    var sparson = {
                        type: 'query',
                        queryType: 'SELECT',
                        variables: ['?aggregatedPropertyName', {
                            expression: {
                                expression: '?aggregatedTargetName',
                                type: 'aggregate',
                                aggregation: aggregation.operator,
                                distinct: false
                            },
                            variable: '?value'
                        }],
                        from: {
                            'default': [config.graphUri]
                        },
                        where: whereClause,
                        group: [{ expression: '?aggregatedPropertyName' }],
                        order: [{ expression: '?value', descending: true }, { expression: '?aggregatedPropertyName' }],
                        limit: 50
                    };

                    /*** generate the sparql from the sparson ***/
                    var sparql = new _sparqljs.Generator().stringify(sparson);

                    return _this6.execute(sparql).then(function (data) {
                        var results = [];

                        var isLabelBoolean = db[modelType].schema.getProperty(property).type === 'boolean';

                        data.forEach(function (item) {
                            /** Virtuoso hack: convert integer as boolean **/
                            var label = item.aggregatedPropertyName.value;
                            if (isLabelBoolean) {
                                if (!isNaN(parseFloat(label))) {
                                    label = Boolean(parseFloat(label));
                                }
                            }
                            /*****/
                            results.push({
                                label: '' + label,
                                value: parseFloat(item.value.value)
                            });
                        });
                        return results;
                    });
                });
            },

            sync: function sync(modelType, pojo) {
                var _this7 = this;

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

                    return _this7.execute(sparql);
                }).then(function () {
                    return pojo;
                });
            },

            batchSync: function batchSync(modelType, pojos) {
                var _this8 = this;

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

                    return _this8.execute(sparql);
                }).then(function () {
                    return pojos;
                });
            },

            update: function update(modelType, modelIdOrUri, operations) {
                var _this9 = this;

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

                    return _this9.execute(sparql);
                });
            },

            'delete': function _delete(modelType, modelIdOrUri) {
                var _this10 = this;

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

                    return _this10.execute(sparql);
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