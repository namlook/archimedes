
import _ from 'lodash';
import sparqlClient from './sparql-client';
import {
    deleteCascade,
    instanceRdfUri,
    query2whereClause,
    pojo2triples,
    rdfDoc2pojo,
    operation2triple,
    constructTriples,
    constructWhereTriples,
    classRdfUri,
    propertyRdfUri,
    uri2id,
    propertyName2Sparson} from './utils';
import {Generator as SparqlGenerator} from 'sparqljs';
import es from 'event-stream';
import JSONStream from 'JSONStream';

import sparqlQueryBuilder from './sparql-query-builder';
import sparqlResultsConverter from './sparql-results-converter';

const RDF_DATATYPES = {
    'http://www.w3.org/2001/XMLSchema#integer': 'number',
    'http://www.w3.org/2001/XMLSchema#decimal': 'number',
    'http://www.w3.org/2001/XMLSchema#float': 'number',
    'http://www.w3.org/2001/XMLSchema#double': 'number',
    'http://www.w3.org/2001/XMLSchema#boolean': 'boolean',
    'http://www.w3.org/2001/XMLSchema#dateTime': 'date'
};

import Promise from 'bluebird';


export default function(config) {
    config = config || {};

    if (!config.endpoint) {
        throw new Error('rdf adapter: endpoint is required');
    }

    return function(db) {

        let internals = {};
        internals.store = [];
        internals.sparqlClient = sparqlClient(config.endpoint, config);

        return {
            name: 'rdf',


            beforeRegister(models) {
                let graphUri = config.graphUri;
                let defaultClassRdfPrefix = `${graphUri}/classes`;
                let defaultInstanceRdfPrefix = `${graphUri}/instances`;
                let defaultPropertyRdfPrefix = `${graphUri}/properties`;


                _.forOwn(models, (modelConfig, modelName) => {
                    if (!_.get(modelConfig, 'meta.classRdfUri')) {
                        _.set(modelConfig, 'meta.classRdfUri', `${defaultClassRdfPrefix}/${modelName}`);
                    }

                    if (!_.get(modelConfig, 'meta.instanceRdfPrefix')) {
                        _.set(modelConfig, 'meta.instanceRdfPrefix', defaultInstanceRdfPrefix);
                    }

                    if (!_.get(modelConfig, 'meta.propertyRdfPrefix')) {
                        _.set(modelConfig, 'meta.propertyRdfPrefix', defaultPropertyRdfPrefix);
                    }

                    _.forOwn(modelConfig.properties, (propConfig, propertyName) => {
                        if (!_.get(propConfig, 'meta.rdfUri')) {
                            _.set(propConfig, 'meta.rdfUri', `${defaultPropertyRdfPrefix}/${propertyName}`);
                        }
                    });
                });

                return Promise.resolve(models);
            },


            afterRegister(passedDb) {
                return Promise.resolve().then(() => {
                    let rdfClasses2ModelNameMapping = {};
                    _.forOwn(passedDb.registeredModels, (model) => {

                        let propertyUrisMapping = {};
                        for (let property of model.schema.properties) {
                            let propertyUri = property.config.meta.rdfUri;
                            propertyUrisMapping[propertyUri] = property.name;
                        }
                        _.set(model, 'meta.propertyUrisMapping', propertyUrisMapping);

                        /*** build inverse modelRdfClasses ***/
                        rdfClasses2ModelNameMapping[model.meta.classRdfUri] = model.schema.name;
                    });

                    _.set(passedDb, 'rdfClasses2ModelNameMapping', rdfClasses2ModelNameMapping);

                    return passedDb;
                });
            },


            /**
             * Remove all triples from the graph
             *
             * @returns a promise
             */
            clear() {
                return this.execute(`CLEAR SILENT GRAPH <${config.graphUri}>`);
            },

            clearResource(modelType) {
                return Promise.resolve().then(() => {

                    let modelClassUri = classRdfUri(db[modelType]);

                    let sparson = {
                        type: 'update',
                        updates: [{
                            updateType: 'insertdelete',
                            graph: config.graphUri,
                            delete: [{
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
                                triples: [
                                    {
                                        subject: '?s',
                                        predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                                        object: modelClassUri
                                    },
                                    {
                                        subject: '?s',
                                        predicate: '?p',
                                        object: '?o'
                                    }
                                ]
                            }]
                        }]
                    };


                    /*** generate the sparql from the sparson ***/
                    let sparql = new SparqlGenerator().stringify(sparson);

                    return this.execute(sparql);
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
            find(modelType, query, options) {
                return Promise.resolve().then(() => {

                    /**
                     * if _id is present in the query, perform a `fetch()`
                     * which is faster
                     */
                    if (query._id) {
                        if (_.isObject(query._id)) {
                            let promises = query._id.$in.map((id) => {
                                return this.fetch(modelType, id, options);
                            });
                            return Promise.all(promises);
                        }

                        return this.fetch(modelType, query._id, options).then((pojo) => {
                            let results = [];
                            if (pojo) {
                                results.push(pojo);
                            }
                            return results;
                        });
                    }

                    let {orderBy, whereClause} = query2whereClause(db, modelType, query, options);

                    let sparson = {
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

                    sparson.order.push({expression: '?s'});

                    /*** generate the sparql from the sparson ***/
                    let sparql = new SparqlGenerator().stringify(sparson);
                    // console.log('.........', sparson);
                    // console.log(sparql);
                    // console.log('......');

                    return this.execute(sparql).then((data) => {
                        let uris = data.map(o => o.s.value);

                        if (uris.length === 1) {
                            return this.fetch(modelType, uris[0], options).then((pojo) => {
                                return [pojo];
                            });
                        } else {

                            const CONCURRENCY_LIMIT = 5;

                            return Promise.map(_.chunk(uris, 5), (chunkUris) => {
                                return this.describe(modelType, chunkUris, options);
                            }, {concurrency: CONCURRENCY_LIMIT}).then((results) => {
                                return _.flatten(results);
                            });
                        }
                    });

                });
            },


            stream(modelType, query, options) {
                let stream;
                let pauseStream = es.pause();

                let fetchDocTransform = es.map((uri, callback) => {
                    this.fetch(modelType, uri, options).then((doc) => {
                        if (doc) {
                            callback(null, doc);
                        } else {
                            callback(new Error(`${modelType}: ${uri} not found`));
                        }
                        pauseStream.resume();
                    }).catch((err) => {
                        callback(err);
                    });
                    pauseStream.pause();
                });

                /**
                 * if _id is present in the query, just use it
                 */
                if (query._id) {
                    let ids = [query._id];
                    if (_.isObject(query._id)) {
                        ids = query._id.$in;
                    }
                    stream = es.readArray(ids);
                    return stream.pipe(pauseStream).pipe(fetchDocTransform);
                }


                let {orderBy, whereClause} = query2whereClause(db, modelType, query, options);

                let sparson = {
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

                sparson.order.push({expression: '?s'});

                /*** generate the sparql from the sparson ***/
                let sparql = new SparqlGenerator().stringify(sparson);

                stream = internals.sparqlClient.stream(sparql);

                return stream
                    .pipe(JSONStream.parse('results.bindings.*.s.value'))
                    .pipe(pauseStream)
                    .pipe(fetchDocTransform);
            },


            describe(modelType, modelIdsOrUris, options) {
                let uris;
                return Promise.resolve().then(() => {
                    options.variableIndex = 0;

                    let modelClass = db[modelType];

                    if (!_.isArray(modelIdsOrUris)) {
                        modelIdsOrUris = [modelIdsOrUris];
                    }

                    uris = modelIdsOrUris.map((modelIdOrUri) => {
                        let uri = modelIdOrUri;
                        if (!_.startsWith(modelIdOrUri, 'http://')) {
                            uri = instanceRdfUri(modelClass, modelIdOrUri);
                        }
                        return uri;
                    });

                    let templates = [];
                    let reduceError = false;
                    let patterns = uris.reduce((_patterns, uri) => {
                        if (reduceError) {
                            return null;
                        }

                        let template = constructTriples(modelClass, uri, options);
                        let whereTriples = constructWhereTriples(modelClass, uri, options);
                        options.variableIndex++;

                        templates.push(template);
                        _patterns.push(whereTriples);
                        return _patterns;
                    }, []);

                    if (reduceError) {
                        throw reduceError;
                    }

                    let whereClause = patterns;
                    if (patterns.length > 1) {
                        whereClause = {
                            type: 'union',
                            patterns: patterns
                        };
                    }

                    let sparson = {
                        type: 'query',
                        queryType: 'CONSTRUCT',
                        from: {
                            'default': [config.graphUri]
                        },
                        template: templates,
                        where: whereClause
                    };

                    /*** generate the sparql from the sparson ***/
                    let sparql = new SparqlGenerator().stringify(sparson);
                    // console.log('')
                    // console.log('')
                    // console.log(sparql);
                    // console.log('')
                    // console.log('')
                    return this.execute(sparql);
                }).then((data) => {
                    if (!data.length) {
                        return [];
                    }

                    const rdfDocs = data.reduce((_rdfDocs, item) => {

                        let {subject, predicate, object} = item;
                        let doc = _rdfDocs[subject.value] || {};
                        doc._id = subject.value;
                        doc[predicate.value] = doc[predicate.value] || [];

                        if (object.datatype) {
                            const datatype = RDF_DATATYPES[object.datatype];
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

                    let pojos = uris.map((uri) => {
                        return rdfDoc2pojo(db, modelType, rdfDocs[uri]);
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
            fetch(modelType, modelIdOrUri, options) {
                return Promise.resolve().then(() => {

                    let uri = modelIdOrUri;
                    let modelClass = db[modelType];

                    if (!_.startsWith(modelIdOrUri, 'http://')) {
                        uri = instanceRdfUri(modelClass, modelIdOrUri);
                    }

                    let template = constructTriples(modelClass, uri, options);

                    let whereTriples = constructWhereTriples(modelClass, uri, options);

                    let sparson = {
                        type: 'query',
                        queryType: 'CONSTRUCT',
                        from: {
                            'default': [config.graphUri]
                        },
                        template: template,
                        where: whereTriples
                    };

                    /*** generate the sparql from the sparson ***/
                    let sparql = new SparqlGenerator().stringify(sparson);
                    // console.log('')
                    // console.log('')
                    // console.log(sparql);
                    // console.log('')
                    // console.log('')
                    return this.execute(sparql);
                }).then((data) => {
                    if (!data.length) {
                        return null;
                    }

                    const rdfDoc = data.reduce((doc, item) => {

                        let {subject, predicate, object} = item;
                        doc._id = subject.value;
                        doc[predicate.value] = doc[predicate.value] || [];

                        if (object.datatype) {
                            const datatype = RDF_DATATYPES[object.datatype];

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

                    return rdfDoc2pojo(db, modelType, rdfDoc);
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
            count(modelType, query, options) {
                return Promise.resolve().then(() => {

                    let {whereClause} = query2whereClause(db, modelType, query, options);
                    let sparson = {
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
                    let sparql = new SparqlGenerator().stringify(sparson);

                    return this.execute(sparql);
                }).then((data) => {
                    if (!data.length) {
                        return 0;
                    }
                    return parseInt(data[0].count.value, 10);
                });
            },

            query(modelName, query, options) {
                let graphUri = config.graphUri;
                let queryBuilder = sparqlQueryBuilder(db, modelName, graphUri);

                /** if the _type is not present, set it to the modelName **/
                query.filter = query.filter && query.filter || {};
                if (!_.has(query, 'filter._type')) {
                    _.set(query, 'filter._type', modelName);
                }

                let sparql = queryBuilder.build(query, options);

                // console.log(sparql);

                let converter = sparqlResultsConverter(db, modelName, query);

                let stream = internals.sparqlClient.queryStream(sparql);
                stream.on('response', function(response) {
                    if (response.statusCode !== 200) {
                        if (response.statusCode === 400) {
                            console.error(sparql);
                            throw new Error('bad sparql query');
                        } else {
                            throw new Error(`database error: ${response.statusCode}`);
                        }
                    }
                });


                return stream
                    .pipe(JSONStream.parse('results.bindings.*'))
                    .pipe(es.map((item, callback) => {
                        let doc;
                        try {
                            doc = converter.convert(item);
                        } catch(err) {
                            return callback(err);
                        }
                        return callback(null, doc);
                    }));

                // return this.execute(sparql).then((data) => {
                //     let results = [];
                //     for (let item of data) {
                //         console.log(converter.convert(item));
                //     }
                //     // console.log(data);
                // }).catch((error) => {
                //     console.log('xxx', error);
                //     console.log(error.stack);
                // });
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
            aggregate(modelType, aggregator, query, options) {
                let modelClass = db[modelType];
                options.sort = _.get(options, 'sort', []);

                let variablePropertyMap = {};
                return Promise.resolve().then(() => {

                    let {whereClause} = query2whereClause(db, modelType, query);


                    let variables = [];
                    let groupByExpressions = [];
                    let useGroupBy = false;

                    let aggregatorItems = [];
                    for (let field of Object.keys(aggregator)) {
                        let propertyName = aggregator[field];
                        let variable = field.split('.').join('___');

                        if (_.isObject(propertyName)) {
                            useGroupBy = true;
                            for (let operator of Object.keys(propertyName)) {
                                propertyName = propertyName[operator];

                                let isID = false;
                                if (_.endsWith(propertyName, '._id')) {
                                    propertyName = propertyName.replace(/\._id$/, '');
                                    isID = true;
                                }

                                operator = _.trimStart(operator, '$');
                                let postSorting = 0;
                                if (operator === 'concat') {
                                    operator = 'group_concat';

                                    // remove sorted variables that are group_concat
                                    let _sort = [];
                                    for (let _variable of options.sort) {
                                        let sortingVariable = _variable;
                                        let inversed = false;
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
                                    options.sort = _sort;
                                }
                                aggregatorItems.push({
                                    propertyName,
                                    operator,
                                    variable,
                                    field,
                                    isID,
                                    postSorting
                                });
                            }
                        } else {
                            let isID = false;
                            if (_.endsWith(propertyName, '._id')) {
                                propertyName = propertyName.replace(/\._id$/, '');
                                isID = true;
                            }

                            let aggregatorItem = {
                                propertyName,
                                variable,
                                field,
                                isID
                            };

                            aggregatorItems.push(aggregatorItem);
                        }
                    }

                    let orderBy = options.sort.map((variable) => {
                        let descending = false;
                        if (variable[0] === '-') {
                            descending = true;
                            variable = variable.slice(1);
                        }
                        variable = variable.split('.').join('___');
                        return {
                            expression: `?${variable}`,
                            descending: descending
                        };
                    });

                    for (let item of aggregatorItems) {

                        let {propertyName, operator, variable, isID, postSorting} = item;

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
                                variable: `?${variable}`
                            });

                        } else {

                            let predicate;
                            if (_.endsWith(propertyName, '._type')) {
                                predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
                            } else if (_.includes(propertyName, '.')) {
                                predicate = propertyName2Sparson(modelClass, propertyName);
                            } else if (propertyName !== true) {
                                predicate = propertyRdfUri(modelClass, propertyName);
                            }

                            if (operator) {

                                let propertyVariable;

                                if (operator === 'count' && propertyName === true) {
                                    propertyVariable = '?s';
                                } else {
                                    let triple;
                                    if (_.isObject(predicate)) {
                                        triple = _.find(whereClause[0].triples, 'predicate.items', predicate.items);
                                    } else {
                                        triple = _.find(whereClause[0].triples, 'predicate', predicate);
                                    }

                                    if (triple) {
                                        propertyVariable = triple.object;
                                    } else {
                                        propertyVariable = `?${_.camelCase(propertyName)}`;
                                        whereClause[0].triples.push({
                                            subject: '?s',
                                            predicate: predicate,
                                            object: propertyVariable
                                        });
                                    }
                                }

                                let expression = {
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
                                    variable: `?${variable}`
                                });
                            } else {
                                let triple;
                                if (_.isObject(predicate)) {
                                    triple = _.find(whereClause[0].triples, 'predicate.items', predicate.items);
                                } else {
                                    triple = _.find(whereClause[0].triples, 'predicate', predicate);
                                }

                                if (triple) {
                                    variables.push({
                                        expression: triple.object,
                                        variable: `?${variable}`
                                    });
                                    variable = triple.object;
                                } else {
                                    variable = `?${variable}`;
                                    whereClause[0].triples.push({
                                        subject: '?s',
                                        predicate: predicate,
                                        object: variable
                                    });
                                    variables.push(variable);
                                }
                                if (useGroupBy) {
                                    groupByExpressions.push({expression: variable});
                                }
                            }
                        }
                    }


                    let sparson = {
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
                    let sparql = new SparqlGenerator().stringify(sparson);

                    // console.log(sparql);

                    return this.execute(sparql);
                }).then((data) => {
                    let results = [];
                    for (let item of data) {
                        let resultItem = {};

                        for (let variable of Object.keys(item)) {

                            let {value, datatype, type} = item[variable];
                            let {propertyName, property, operator, isID, postSorting} = variablePropertyMap[variable];
                            let propertyType = property && property.type;
                            datatype = RDF_DATATYPES[datatype];
                            if (type === 'uri') {

                                if (propertyName === '_id') {
                                    value = uri2id(modelClass, value);
                                } else if (propertyName === '_type') {
                                    value = modelClass.name;
                                } else if (_.endsWith(propertyName, '._type')) {
                                    propertyName = propertyName.replace(/\._type$/, '');
                                    property = modelClass.schema.getProperty(propertyName);
                                    value = property.type;
                                } else {
                                    value = uri2id(db[propertyType], value);
                                }

                            } else if (operator) {
                                if (operator === 'group_concat') {
                                    value = value.split('|||****|||');
                                    if (isID) {
                                        let _values = [];
                                        for (let val of value) {
                                            _values.push(uri2id(db[propertyType], val));
                                        }
                                        value = _values;
                                    }
                                    if (postSorting) {
                                        value = _.sortBy(value);
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
                            _.set(resultItem, variable.split('___').join('.'), value);
                        }
                        results.push(resultItem);
                    }
                    return results;
                });
            },


            groupBy(modelType, aggregator, query, options) {
                return Promise.resolve().then(() => {

                    let {whereClause} = query2whereClause(db, modelType, query);

                    let {property: propertyNames, aggregation} = aggregator;

                    let variablesMap = {};
                    let variableNames = [];
                    /** construct the property value to perform the group by **/
                    let variableIdx = 0;
                    for (let propertyName of propertyNames) {
                        let propertyUri = propertyRdfUri(db[modelType], propertyName);
                        let predicate;
                        if (_.includes(propertyName, '.')) {
                            predicate = propertyName2Sparson(db[modelType], propertyName);
                        } else {
                            predicate = propertyUri;
                        }
                        let variable = `?aggregatedPropertyName${variableIdx}`;
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
                    let {target: targetName} = aggregation;
                    let targetPropertyUri = propertyRdfUri(db[modelType], targetName);
                    let aggregationPredicate;
                    if (_.includes(targetName, '.')) {
                        aggregationPredicate = propertyName2Sparson(db[modelType], targetName);
                    } else {
                        aggregationPredicate = targetPropertyUri;
                    }
                    whereClause.push({
                        subject: '?s',
                        predicate: aggregationPredicate,
                        object: '?aggregatedTargetName'
                    });

                    let orderBy = [];
                    let $valueUsed = false;
                    for (let propertyName of _.get(options, 'sort', [])) {
                        if (!propertyName) {
                            continue;
                        }

                        let descending = false;
                        if (propertyName[0] === '-') {
                            propertyName = _.trimStart(propertyName, '-');
                            descending = true;
                        }

                        let variable;
                        if (propertyName === '$value') {
                            $valueUsed = true;
                            variable = '?value';
                        } else {
                            variable = _.invert(variablesMap)[propertyName];
                            if (!variable) {
                                throw new Error(`cannot sort by the unknown property: "${propertyName}"`);
                            }
                        }

                        orderBy.push({
                            expression: variable,
                            descending: descending
                        });
                    }

                    if (!$valueUsed) {
                        orderBy.push({expression: '?value', descending: true});
                    }

                    /** build the sparson **/
                    let sparson = {
                        type: 'query',
                        queryType: 'SELECT',
                        variables: variableNames.concat([
                            {
                                expression: {
                                    expression: `?aggregatedTargetName`,
                                    type: 'aggregate',
                                    aggregation: aggregation.operator,
                                    distinct: false
                                },
                                variable: '?value'
                            }
                        ]),
                        from: {
                            'default': [config.graphUri]
                        },
                        where: whereClause,
                        group: variableNames.map((variable) => {
                            return {expression: variable};
                        }),
                        order: orderBy,
                        limit: 1000
                    };


                    /*** generate the sparql from the sparson ***/
                    let sparql = new SparqlGenerator().stringify(sparson);

                    return this.execute(sparql).then((data) => {

                        /** WARNING AWEFUL HACK !
                         * it works only with 1 or 2 properties.
                         * the following should be rewrited and use reccursion
                         */

                        let target = db[modelType].schema.getProperty(targetName);

                        let _compute = function(item, nameIdx, names) {
                            let variable = names[nameIdx];
                            let name = _.trimStart(variable, '?');
                            let label = item[name].value;

                            if (nameIdx + 2 >= names.length) {
                                let nextName = _.trimStart(names[nameIdx + 1], '?');

                                let value = parseFloat(item[nextName].value);
                                if (aggregation.operator !== 'count') {
                                    let {error, value: validatedValue} = target.validate(value);
                                    if (error) {
                                        throw error;
                                    } else {
                                        value = validatedValue;
                                    }
                                }

                                return {label: label, value: value};
                            }
                            return {label: label, values: _compute(item, nameIdx + 1, names)};
                        };

                        let computeResult = function(_data, variables) {

                            let _results = {};
                            for (let item of _data) {
                                let res = _compute(item, 0, variables);
                                _results[res.label] = _results[res.label] || [];
                                if (res.values) {
                                    _results[res.label].push(res.values);
                                } else {
                                    _results[res.label].push(res.value);
                                }
                            }

                            let results = [];
                            for (let key of Object.keys(_results)) {
                                /** Virtuoso hack: convert integer as boolean **/
                                let label = key;
                                if (['0', '1'].indexOf(label) > -1 && !isNaN(parseFloat(label))) {
                                    label = Boolean(parseFloat(label));
                                }
                                /***/

                                if (variables.length > 2) {
                                    results.push({label: `${label}`, values: _results[key]});
                                } else {
                                    results.push({label: `${label}`, value: _results[key][0]});
                                }
                            }

                            return results;
                        };

                        return computeResult(data, variableNames.concat(['value']));
                    });

                });
            },

            sync(modelType, pojo) {
                return Promise.resolve().then(() => {

                    let insertTriples = pojo2triples(db, modelType, pojo);

                    let deleteTriples = [{
                        subject: insertTriples[0].subject,
                        predicate: '?p',
                        object: '?o'
                    }];


                    let sparson = {
                        type: 'update',
                        updates: [
                            {
                                updateType: 'deletewhere',
                                delete: [
                                    {
                                        type: 'graph',
                                        name: config.graphUri,
                                        triples: deleteTriples
                                    }
                                ]
                                // insert: [],
                                // where: [
                                //     {
                                //         type: 'bgp',
                                //         triples: deleteTriples
                                //     }
                                // ]
                            },
                            {
                                updateType: 'insert',
                                insert: [
                                    {
                                        type: 'graph',
                                        name: config.graphUri,
                                        triples: insertTriples
                                    }
                                ]
                            }
                        ]
                    };

                    let sparql = new SparqlGenerator().stringify(sparson);

                    return this.execute(sparql);
                }).then(() => {
                    return pojo;
                });
            },


            batchSync(modelType, pojos) {
                return Promise.resolve().then(() => {

                    let insertTriples = _.flatten(pojos.map((item) => {
                        return pojo2triples(db, modelType, item);
                    }));

                    let uris = _.uniq(insertTriples.map((triple) => {
                        return triple.subject;
                    }));

                    let sparson = {
                        type: 'update',
                        updates: [
                            {
                                updateType: 'insertdelete',
                                // updateType: 'deletewhere',
                                delete: [
                                    {
                                        type: 'graph',
                                        name: config.graphUri,
                                        triples: [
                                            {
                                                subject: '?s',
                                                predicate: '?p',
                                                object: '?o'
                                            }
                                        ]
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
                                    }
                                ],
                                insert: [],
                                where: [
                                    {
                                        type: 'bgp',
                                        triples: [{
                                            subject: '?s',
                                            predicate: '?p',
                                            object: '?o'
                                        }]
                                    },
                                    {
                                        type: 'filter',
                                        expression: {
                                            type: 'operation',
                                            operator: 'in',
                                            args: ['?s', uris]
                                        }
                                    }
                                ]
                            },
                            {
                                updateType: 'insert',
                                insert: [
                                    {
                                        type: 'graph',
                                        name: config.graphUri,
                                        triples: insertTriples
                                    }
                                ]
                            }
                        ]
                    };

                    let sparql = new SparqlGenerator().stringify(sparson);

                    return this.execute(sparql);
                }).then(() => {
                    return pojos;
                });
            },


            update(modelType, modelIdOrUri, operations) {
                return Promise.resolve().then(() => {

                    let uri = modelIdOrUri;

                    if (!_.startsWith(modelIdOrUri, 'http://')) {
                        uri = instanceRdfUri(db[modelType], modelIdOrUri);
                    }

                    let deleteTriples = operations.map((operation) => {
                        if (_.includes(['unset', 'pull'], operation.operator)) {
                            return operation2triple(db, modelType, uri, operation);
                        }
                    });

                    deleteTriples = _.compact(deleteTriples);


                    let sparson = {
                        type: 'update',
                        updates: []
                    };

                    if (deleteTriples.length) {
                        sparson.updates.push({
                            // updateType: 'insertdelete',
                            updateType: 'deletewhere',
                            delete: [
                                {
                                    type: 'graph',
                                    name: config.graphUri,
                                    triples: deleteTriples
                                }
                            ]
                            // insert: [],
                            // where: [
                            //     {
                            //         type: 'bgp',
                            //         triples: deleteTriples
                            //     }
                            // ]
                        });
                    }


                    // var objectVariableIndex = 0;
                    // var deletewhereTriples = [];
                    let insertTriples = operations.map((operation) => {
                        if (_.includes(['set', 'push'], operation.operator)) {
                            let triple = operation2triple(db, modelType, uri, operation);
                            // deletewhereTriples.push([{
                            //     subject: uri,
                            //     predicate: triple.predicate,
                            //     object: `?o${objectVariableIndex++}`
                            // }]);
                            return triple;
                        }
                    });
                    insertTriples = _.compact(insertTriples);


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
                            insert: [
                                {
                                    type: 'graph',
                                    name: config.graphUri,
                                    triples: insertTriples
                                }
                            ]
                        });
                    }

                    // console.log(' ');
                    // console.log(' ');
                    // console.log(' ');
                    // console.dir(sparson, {depth: 10});
                    // console.log(' ');
                    // console.log(' ');
                    // console.log(' ');

                    let sparql = new SparqlGenerator().stringify(sparson);

                    // console.log(sparql);
                    // console.log(' ');
                    // console.log(' ');
                    // console.log(' ');

                    return this.execute(sparql);
                });
            },


            delete(modelType, modelIdOrUri) {
                return Promise.resolve().then(() => {

                    let uri = modelIdOrUri;

                    if (!_.startsWith(modelIdOrUri, 'http://')) {
                        uri = instanceRdfUri(db[modelType], modelIdOrUri);
                    }
                    let {deleteTriples, whereClause} = deleteCascade(db, modelType, uri);
                    let sparson = {
                        type: 'update',
                        updates: [
                            {
                                updateType: 'insertdelete',
                                // updateType: 'deletewhere',
                                delete: [
                                    {
                                        type: 'graph',
                                        name: config.graphUri,
                                        triples: deleteTriples
                                    }
                                ],
                                insert: [],
                                where: whereClause
                            }
                        ]
                    };

                    // console.log('');
                    // console.log('');
                    // console.dir(sparson, {depth: 10});
                    // console.log('');
                    // console.log('');

                    let sparql = new SparqlGenerator().stringify(sparson);

                    // console.log('');
                    // console.log('');
                    // console.log(sparql);
                    // console.log('');
                    // console.log('');

                    return this.execute(sparql);
                });
            },


            execute(sparql) {
                // console.log('');
                // console.log('');
                // console.log(sparql);
                // console.log('');
                // console.log('');
                return Promise.resolve().then(() => {
                    return internals.sparqlClient.execute(sparql);
                }).then((data) => {
                    let results;
                    if (data) {
                        results = data.results.bindings;
                    }

                    /** hack for virtuoso **/
                    if (results && _.includes(sparql.toLowerCase(), 'construct')) {
                        results = results.map((item) => {
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
}
