
import _ from 'lodash';
import sparqlClient from './sparql-client';
import {
    classRdfUri,
    propertyRdfUri,
    instanceRdfUri,
    query2whereClause,
    pojo2triples,
    rdfDoc2pojo,
    operation2triple,
    constructTriples,
    propertyRdfUri,
    propertyName2Sparson} from './utils';
import {Generator as SparqlGenerator} from 'sparqljs';

export default function(config) {
    config = config || {};

    if (!config.endpoint) {
        throw new Error('rdf adapter: endpoint is required');
    }

    return function(db) {

        var internals = {};
        internals.store = [];
        internals.sparqlClient = sparqlClient(config.endpoint);

        return {
            name: 'rdf',


            beforeRegister(models) {
                return new Promise((resolve) => {
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

                        _.forOwn(modelConfig.properties, (propConfig, propertyName) => {
                            if (!_.get(propConfig, 'meta.rdfUri')) {
                                _.set(propConfig, 'meta.rdfUri', `${defaultPropertyRdfPrefix}/${propertyName}`);
                            }
                        });
                    });
                    return resolve(models);
                });
            },


            afterRegister(passedDb) {
                return new Promise((resolve) => {
                    _.forOwn(passedDb.registeredModels, (model) => {

                        let propertyUrisMapping = {};
                        _.forOwn(model.properties, (propConfig, propertyName) => {
                            let propertyUri = propConfig.meta.rdfUri;
                            propertyUrisMapping[propertyUri] = propertyName;
                        });
                        _.set(model, 'meta.propertyUrisMapping', propertyUrisMapping);
                    });

                    return resolve(passedDb);
                });
            },


            /**
             * Remove all triples from the graph
             *
             * @returns a promise
             */
            clear() {
                return this.execute(`CLEAR GRAPH <${config.graphUri}>`);
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
                return new Promise((resolve, reject) => {

                    /**
                     * if _id is present in the query, perform a `fetch()`
                     * which is faster
                     */
                    if (query._id) {
                        if (_.isObject(query._id)) {
                            let promises = query._id.$in.map((id) => {
                                return this.fetch(modelType, id, options);
                            });
                            return resolve(Promise.all(promises));
                        }

                        return this.fetch(modelType, query._id, options).then((pojo) => {
                            var results = [];
                            if (pojo) {
                                results.push(pojo);
                            }
                            resolve(results);
                        }).catch((error) => {
                            return reject(error);
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
                    let sparql;
                    try {
                        sparql = new SparqlGenerator().stringify(sparson);
                    } catch(generatorError) {
                        return reject(generatorError);
                    }

                    this.execute(sparql).then((data) => {
                        let uris = data.map(o => o.s.value);
                        let promises = uris.map((uri) => {
                            return this.fetch(modelType, uri, options);
                        });
                        resolve(Promise.all(promises));
                    }).catch((error) => {
                        reject(error);
                    });

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

                return new Promise((resolve, reject) => {

                    var uri = modelIdOrUri;
                    var modelClass = db[modelType];

                    if (!_.startsWith(modelIdOrUri, 'http://')) {
                        uri = instanceRdfUri(modelClass, modelIdOrUri);
                    }

                    let triples = constructTriples(modelClass, uri, options);

                    let sparson = {
                        type: 'query',
                        queryType: 'CONSTRUCT',
                        from: {
                            'default': [config.graphUri]
                        },
                        template: triples,
                        where: [
                            {
                              type: 'bgp',
                              triples: triples
                            }
                        ]
                    };

                    /*** generate the sparql from the sparson ***/
                    let sparql;
                    try {
                        sparql = new SparqlGenerator().stringify(sparson);
                    } catch(generatorError) {
                        return reject(generatorError);
                    }

                    this.execute(sparql).then((data) => {
                        if (!data.length) {
                            return resolve();
                            // return reject(new Error(`document ${uri} no found`));
                        }

                        let rdfDoc = {};
                        for(let i = 0; i < data.length; i++) {
                            let {subject, predicate, object} = data[i];
                            rdfDoc._id = subject.value;
                            rdfDoc[predicate.value] = rdfDoc[predicate.value] || [];
                            rdfDoc[predicate.value].push(object.value);
                        }

                        let pojo = rdfDoc2pojo(db, modelType, rdfDoc);
                        return resolve(pojo);
                    }).catch((error) => {
                        return reject(error);
                    });
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
                return new Promise((resolve, reject) => {

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
                    let sparql;
                    try {
                        sparql = new SparqlGenerator().stringify(sparson);
                    } catch(generatorError) {
                        return reject(generatorError);
                    }

                    this.execute(sparql).then((data) => {
                        return resolve(parseInt(data[0].count.value, 10));
                    }).catch((error) => {
                        reject(error);
                    });

                });
            },


            groupBy(modelType, aggregator, query, options) {
                return new Promise((resolve, reject) => {
                    let {whereClause} = query2whereClause(db, modelType, query, options);

                    let {property, aggregation} = aggregator;

                    /** construct the property value to perform the group by **/
                    var propertyUri = propertyRdfUri(db[modelType], property);
                    let predicate;
                    if (_.contains(property, '.')) {
                        predicate = propertyName2Sparson(db[modelType], property);
                    } else {
                        predicate = propertyUri;
                    }
                    whereClause.push({
                        subject: '?s',
                        predicate: predicate,
                        object: '?aggregatedPropertyName'
                    });


                    /** construct the aggregation value **/
                    let {target} = aggregation;
                    let targetPropertyUri = propertyRdfUri(db[modelType], target);
                    let aggregationPredicate;
                    if (_.contains(target, '.')) {
                        aggregationPredicate = propertyName2Sparson(db[modelType], target);
                    } else {
                        aggregationPredicate = targetPropertyUri;
                    }
                    whereClause.push({
                        subject: '?s',
                        predicate: aggregationPredicate,
                        object: '?aggregatedTargetName'
                    });


                    /** build the sparson **/
                    let sparson = {
                        type: 'query',
                        queryType: 'SELECT',
                        variables: [
                            `?aggregatedPropertyName`,
                            {
                            expression: {
                                expression: `?aggregatedTargetName`,
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
                        group: [
                            {expression: `?aggregatedPropertyName`}
                        ],
                        order: [
                            {expression: '?value', descending: true},
                            {expression: '?aggregatedPropertyName'}
                        ],
                        limit: 50
                    };


                    /*** generate the sparql from the sparson ***/
                    let sparql;
                    try {
                        sparql = new SparqlGenerator().stringify(sparson);
                    } catch(generatorError) {
                        return reject(generatorError);
                    }

                    // console.log(sparql);

                    this.execute(sparql).then((data) => {
                        let results = [];
                        data.forEach((item) => {
                            results.push({
                                label: item.aggregatedPropertyName.value,
                                value: parseFloat(item.value.value)
                            });
                        });
                        return resolve(results);
                    }).catch((error) => {
                        reject(error);
                    });

                });
            },

            sync(modelType, pojo) {
                return new Promise((resolve, reject) => {

                    try {
                        var insertTriples = pojo2triples(db, modelType, pojo);
                    } catch (pojo2triplesError) {
                        return reject(pojo2triplesError);
                    }

                    var deleteTriples = [{
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

                    try {
                        var sparql = new SparqlGenerator().stringify(sparson);
                    } catch(sparqlGeneratorError) {
                        return reject(sparqlGeneratorError);
                    }


                    this.execute(sparql).then(() => {
                        return resolve(pojo);
                    }).catch((error) => {
                        return reject(error);
                    });
                });
            },


            batchSync(modelType, pojos) {

                return new Promise((resolve, reject) => {

                    var insertTriples = _.flatten(pojos.map((item) => {
                        try {
                            return pojo2triples(db, modelType, item);
                        } catch (pojo2triplesError) {
                            return reject(pojo2triplesError);
                        }
                    }));

                    var uris = _.uniq(insertTriples.map((triple) => {
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

                    try {
                        var sparql = new SparqlGenerator().stringify(sparson);
                    } catch(sparqlGeneratorError) {
                        return reject(sparqlGeneratorError);
                    }

                    this.execute(sparql).then(() => {
                        return resolve(pojos);
                    }).catch((error) => {
                        return reject(error);
                    });
                });
            },


            update(modelType, modelIdOrUri, operations) {
                return new Promise((resolve, reject) => {

                    var uri = modelIdOrUri;

                    if (!_.startsWith(modelIdOrUri, 'http://')) {
                        uri = instanceRdfUri(db[modelType], modelIdOrUri);
                    }

                    var deleteTriples = operations.map((operation) => {
                        if (_.contains(['unset', 'pull'], operation.operator)) {
                            return operation2triple(db, modelType, uri, operation);
                        }
                    });

                    deleteTriples = _.compact(deleteTriples);


                    var sparson = {
                        type: 'update',
                        updates: []
                    };

                    if (deleteTriples.length) {
                        sparson.updates.push({
                            updateType: 'insertdelete',
                            delete: [
                                {
                                    type: 'graph',
                                    name: config.graphUri,
                                    triples: deleteTriples
                                }
                            ],
                            insert: [],
                            where: [
                                {
                                    type: 'bgp',
                                    triples: deleteTriples
                                }
                            ]
                        });
                    }


                    // var objectVariableIndex = 0;
                    // var deletewhereTriples = [];
                    var insertTriples = operations.map((operation) => {
                        if (_.contains(['set', 'push'], operation.operator)) {
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

                    try {
                        var sparql = new SparqlGenerator().stringify(sparson);
                    } catch(sparqlGeneratorError) {
                        return reject(sparqlGeneratorError);
                    }

                    // console.log(sparql);
                    // console.log(' ');
                    // console.log(' ');
                    // console.log(' ');

                    this.execute(sparql).then(() => {
                        return resolve();
                    }).catch((error) => {
                        return reject(error);
                    });

                });
            },


            delete(modelType, modelIdOrUri) {

                let deleteCascade = function(_modelType, uri) {
                    let deleteProps = db[_modelType].schema.propagateDeletionProperties;

                    let deleteTriples = [];
                    let whereClause = [];

                    if( !_.startsWith(uri, '?')) {
                        deleteTriples.push({
                            subject: uri,
                            predicate: '?s',
                            object: '?o'
                        });

                        whereClause.push({
                            type: 'optional',
                            patterns: [
                                {
                                    type: 'bgp',
                                    triples: [{
                                        subject: uri,
                                        predicate: '?s',
                                        object: '?o'
                                    }]
                                }
                            ]
                        });
                    }


                    deleteProps.forEach((prop) => {

                        let variable;
                        let predictate;
                        let type;
                        let whereOptionalTriples = [];
                        let propagateDeletionProperty = prop.propagateDeletion();
                        let propagateDeletionType = prop.type;

                        let recusive = false;
                        let variablePrefix = '';
                        if (propagateDeletionType === _modelType) {
                            recusive = true;
                            variablePrefix = uri.slice(1); // strip the '?'
                        }

                        if (prop.isReversed()) {
                            let props = prop.fromReversedProperties();
                            prop = props[0]; // Check this !
                            variable = `?${variablePrefix}${prop.modelSchema.name}_via_${prop.name}`;
                            predictate = propertyRdfUri(db[prop.modelSchema.name], prop.name);
                            type = classRdfUri(db[prop.modelSchema.name]);
                            whereOptionalTriples.push({
                                subject: variable,
                                predicate: predictate,
                                object: uri
                            });
                        } else {

                            predictate = propertyRdfUri(db[_modelType], prop.name);

                            variable = `?${variablePrefix}${prop.type}_via_${prop.name}`;
                            type = classRdfUri(db[prop.type]);
                            whereOptionalTriples.push({
                                subject: uri,
                                predicate: predictate,
                                object: variable
                            });
                        }


                        let variablePredicate = `${variable}Predicate`;
                        if (propagateDeletionProperty !== true) {
                            variablePredicate = propertyRdfUri(db[propagateDeletionType], propagateDeletionProperty);
                        }

                        let statement = {
                            subject: variable,
                            predicate: variablePredicate,
                            object: `${variable}Object`
                        };

                        deleteTriples.push(statement);
                        whereOptionalTriples.push(statement);

                        whereOptionalTriples.push({
                            subject: variable,
                            predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                            object: type
                        });

                        let _inner;
                        if (db[propagateDeletionType].schema.propagateDeletionProperties.length && !recusive) {
                            _inner = deleteCascade(propagateDeletionType, variable);
                            deleteTriples = deleteTriples.concat(_inner.deleteTriples);
                        }

                        let patterns = [{
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

                    });

                    return {deleteTriples, whereClause};
                };


                return new Promise((resolve, reject) => {

                    var uri = modelIdOrUri;

                    if (!_.startsWith(modelIdOrUri, 'http://')) {
                        uri = instanceRdfUri(db[modelType], modelIdOrUri);
                    }

                    let {deleteTriples, whereClause} = deleteCascade(modelType, uri);

                    let sparson = {
                        type: 'update',
                        updates: [
                            {
                                updateType: 'insertdelete',
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

                    try {
                        var sparql = new SparqlGenerator().stringify(sparson);
                    } catch(sparqlGeneratorError) {
                        return reject(sparqlGeneratorError);
                    }

                    // console.log('');
                    // console.log('');
                    // console.log(sparql);
                    // console.log('');
                    // console.log('');

                    this.execute(sparql).then(() => {
                        return resolve();
                    }).catch((error) => {
                        return reject(error);
                    });

                });
            },


            execute(sparql) {
                return new Promise((resolve, reject) => {
                    internals.sparqlClient.execute(sparql).then((data) => {
                        var results;
                        if (data) {
                            results = data.results.bindings;
                        }

                        /** hack for virtuoso **/
                        if (results && _.contains(sparql.toLowerCase(), 'construct')) {
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
                        return resolve(results);
                    }).catch((error) => {
                        return reject(error);
                    });
                });
            }

        };
    };
}