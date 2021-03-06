
import _ from 'lodash';
import rdfUtilities from './rdf-utils';
import {Generator as SparqlGenerator} from 'sparqljs';

const RDF_TYPE_URL = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

module.exports = function main(db, modelName, graphUri) {
    const rdfUtils = rdfUtilities(db);
    const internals = {};

    /*
     * returns the sparson predicate from a propertyName
     * Note that if the parent is specified, the predicate used will be
     * build against the parent schema.
     */
    internals.buildPredicate = function buildPredicate(propertyName) {
        const modelClass = db[modelName];
        const modelSchema = modelClass.schema;

        // if (propertyName === '_type') {
        //     return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        // }

        if (propertyName === '_type' || _.endsWith(propertyName, '._type')) {
            return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }

        // if (parent) {
        //     let relationType = modelSchema.getProperty(parent).type;
        //     let relationModelSchema = db[relationType].schema;
        //     property = relationModelSchema.getProperty(propertyName);
        // } else {
        //     property = modelSchema.getProperty(propertyName);
        // }
        const property = modelSchema.getProperty(propertyName);

        if (property.isInverseRelationship()) {
            return {
                type: 'path',
                pathType: '^',
                items: [property.getPropertyFromInverseRelationship().meta.rdfUri],
            };
        }
        return property.meta.rdfUri;
    };

    /**
     * buid a predicate with a path:
     *   ?s (test:user/test/name) ?o
     */
    internals.buildPathPredicate = function(propertyName) {
        const modelClass = db[modelName];
        let modelSchema = modelClass.schema;

        if (_.endsWith(propertyName, '._id')) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }

        let items = propertyName.split('.').map((innerPropertyName) => {

            if (innerPropertyName === '_type') {
                return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
            }

            let property = modelSchema.getProperty(innerPropertyName);

            if (property.isRelation()) {
                modelSchema = db[property.type].schema;
            }

            if (property.isInverseRelationship()) { // only for filter

                property = property.getPropertyFromInverseRelationship();

                let propertyUris = [property.meta.rdfUri];
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


    internals.buildInnerVariableName = function(propertyName) {
        if (_.endsWith(propertyName, '._id')) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }
        return propertyName.split('.').join(rdfUtils.RELATION_SEPARATOR);
    };

    internals.buildFinalVariableName = function(propertyName) {
        return propertyName.split('.').join(rdfUtils.RELATION_SEPARATOR);
    };

    internals.validateQuery = function(query) {

        /** validate order by **/
        let sortedVariables = query.sort || [];

        if (!_.isArray(sortedVariables)) {
            throw new Error('sortedVariable must be an array');
        }

        for (let variable of sortedVariables) {
            if (variable[0] === '-') {
                variable = variable.slice(1);
            }

            // check if the variable is set in fields
            if (query.field[variable] == null && !query.aggregate[variable]) {
                throw new Error(`can't order by an unknown field: "${variable}"`);
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
        const convertPair2property = ([fieldName, _fieldInfos]) => {
            const isArray = _.isArray(_fieldInfos);
            let fieldInfos = isArray ? _fieldInfos[0] : _fieldInfos;

            fieldInfos = _.isString(fieldInfos) ? { $property: fieldInfos } : fieldInfos;

            let propertyName = fieldInfos.$property;
            const propertyRaw = fieldInfos.$property;

            const optional = _.includes(propertyName, '?');
            propertyName = optional ? propertyName.split('?').join('') : propertyName;

            return {
                fieldName,
                propertyName,
                propertyRaw,
                optional,
                array: isArray,
                inner: false, // isInner,
                fields: fieldInfos.$fields,
            };
        };

        return _.toPairs(query.field).map(convertPair2property);
    };

    internals._buildStatementProperties = function(
        fieldProperties,
        aggregationProperties,
        sortedFields
    ) {
        const sortedField = (fieldName) => _.get(_.find(sortedFields, { fieldName }), 'order');

        const findParents = (propertyName) => {
            const splitedPropertyName = propertyName.split('.');
            let value;
            if (splitedPropertyName.length > 1) {
                const x = splitedPropertyName.slice(0, -1).join('.');
                value = _.flatten(_.compact([x, findParents(x)]));
            }
            return value;
        };

        const stripEndingId = (propertyName) => (
            _.endsWith(propertyName, '._id')
                ? propertyName.split('.').slice(0, -1).join('.')
                : propertyName
        );


        const properties = _(fieldProperties)
            .concat(aggregationProperties)
            .map((o) => {
                if (o.aggregator === 'array' && o.fields) {
                    return _(o.fields)
                        .toPairs()
                        .map(([embedFieldName, embedPropertyName]) => ({
                            fieldName: embedFieldName,
                            propertyName: embedPropertyName,
                            inObject: o.fieldName,
                            inner: true,
                        }))
                        .concat([o])
                        .value();
                }
                return o;
            })
            .flatten()
            .map((o) => {
                if (!o.propertyName) {
                    return o;
                }
                o.propertyRaw = o.propertyRaw || o.propertyName;
                let optional = o.propertyRaw.split('?').length > 1;
                if (optional) {
                    o.optional = true;
                    o.propertyName = o.propertyName.split('?').join('');
                }
                o.propertyName = stripEndingId(o.propertyName);
                o.parent = o.propertyName.split('.').slice(0, -1).join('.');
                return o;
            })
            .map((o) => { // add sortBy info
                o.sortBy = sortedField(o.fieldName);
                return o;
            })
            .value();


        const innerProperties = _(properties)
            .filter((o) => o.parent)
            .map((o) => o.propertyRaw)
            .flatMap(findParents)
            .uniq()
            .map((propertyName) => {
                const optional = propertyName.split('?').length > 1;
                const propertyRaw = propertyName;
                if (optional) {
                    propertyName = propertyName.split('?').join('');
                }
                const parent = propertyName.split('.').slice(0, -1).join('.');
                return {
                    propertyName,
                    optional,
                    parent,
                    inner: true,
                    propertyRaw,
                };
            })
            .value();


        const statementProperties = [].concat(innerProperties, properties).map((o) => {
            const property = db[modelName].schema.getProperty(o.propertyName);
            const isInverseRelationship = property && property.isInverseRelationship();
            return isInverseRelationship
                ? Object.assign({}, o, { inverseRelationship: property.type })
                : o;
        });

        /** if there is only _id in field and no aggregation,
         * add a statement so we can retrieve the _id
         */
        if (!_.find(statementProperties, (o) => o.propertyName !== '_id')) {
            statementProperties.push({
                propertyName: '_type',
                fieldName: '_type',
                propertyRaw: '_type',
                inner: true,
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
    internals._buildFilterProperties = function(query) {
        return _(query.filter)
            .toPairs()
            .map(([propertyName, filterInfos]) => ([
                propertyName,
                _.isPlainObject(filterInfos) ? filterInfos : { $eq: filterInfos },
            ]))
            .map(([propertyName, filterInfos]) => {
                const filterInfos2FilterProperties = (_filterInfos) => {
                    return _(_filterInfos)
                        .toPairs(_filterInfos)
                        .map(([operator, value]) => {
                            let rdfValue;
                            if (operator === '$exists') {
                                if (value === false) {
                                    operator = '$nexists';
                                    value = true;
                                }
                            }

                            if (_.isArray(value)) {
                                if (['$and', '$or'].indexOf(operator) > -1) {
                                    return {
                                        propertyName,
                                        operator,
                                        rdfValue: value.map(filterInfos2FilterProperties)
                                    };
                                } else {
                                    rdfValue = value.map(
                                        (v) => rdfUtils.buildRdfValue(
                                            modelName, propertyName, v
                                        )
                                    );
                                }
                            } else if (operator === '$not') {
                                return {
                                    propertyName,
                                    operator,
                                    rdfValue: filterInfos2FilterProperties(value)
                                };
                            } else if (operator === '$search'){

                                rdfValue = `"${value}*"`;

                            } else {
                                rdfValue = rdfUtils.buildRdfValue(
                                    modelName,
                                    propertyName,
                                    value
                                );
                            }
                            return { propertyName, operator, rdfValue };
                        })
                        .flatten()
                        .value();
                };

                return filterInfos2FilterProperties(filterInfos);
            })
            .flatten()
            .value();
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
    internals._buildAggregationProperties = function(query) {
        return _.toPairs(query.aggregate)
            .map(([fieldName, aggregation]) => {

                let aggregator, aggregationInfos;
                if (_.has(aggregation, '$aggregator')) {
                    aggregationInfos = aggregation;
                    aggregator = aggregation.$aggregator;
                    if (aggregator === 'count' && !aggregationInfos.$property) {
                        aggregationInfos.$property = '_id';
                    }
                } else {
                    let distinct = aggregation.distinct;
                    aggregation = _.omit(aggregation, 'distinct');
                    let [_aggregator, propertyName] = _.toPairs(aggregation)[0];
                    aggregator = _aggregator.slice(1);
                    if (propertyName === true) {
                        propertyName = '_id';
                    }
                    aggregationInfos = {
                        $aggregator: aggregator,
                        $property: propertyName,
                        distinct
                    };
                }

                if (!_.isPlainObject(aggregationInfos)) {
                    aggregationInfos = {$property: aggregationInfos};
                }

                aggregator = aggregator.toLowerCase();

                let distinct = aggregationInfos.distinct;
                distinct = aggregator === 'array' && distinct == null
                    ? true
                    : distinct;

                return {
                    fieldName,
                    aggregator,
                    array: aggregator === 'array',
                    propertyName: aggregationInfos.$property,
                    distinct: distinct,
                    fields: aggregationInfos.$fields,
                    inner: true
                };
            });
    };

    internals._selectVariableSparson = function(properties) {
        const innerVariable = internals.buildInnerVariableName;
        const finalVariable = internals.buildFinalVariableName;
        /*** build select variables ***/
        return properties
            .filter((o) => !o.aggregator && !o.array && !o.inner)
            .map((o) => ({
                expression: `?_${innerVariable(o.propertyName)}`,
                variable: `?${finalVariable(o.fieldName)}`
            }));
    };

    internals._selectArraySparson = function(properties) {
        const innerVariable = internals.buildInnerVariableName;
        const finalVariable = internals.buildFinalVariableName;
        return properties
            .filter((o) => o.array && !o.inner)
            .map((o) => {
                let quote = o.fields ? '' : '\"';

                return {
                    expression: {
                        type: 'operation',
                        operator: 'concat',
                        args: [
                            `"[${quote}"`,
                            {
                                expression: `?_encoded_${innerVariable(o.propertyName)}`,
                                type: 'aggregate',
                                aggregation: 'group_concat',
                                distinct: true,
                                separator: `${quote}, ${quote}`
                            },
                            `"${quote}]"`
                        ]
                    },
                    variable: `?${finalVariable(o.fieldName)}`
                };
            });
    };

    internals._selectAggregationSparson = function(aggregationProperties) {
        const innerVariable = internals.buildInnerVariableName;
        const finalVariable = internals.buildFinalVariableName;

        return aggregationProperties
            .map((o) => {
                if (o.array) {
                    let quote = o.fields ? '' : '\"';

                    let propertyName = o.propertyName || `EMBED_${o.fieldName}`;

                    return {
                        expression: {
                            type: 'operation',
                            operator: 'concat',
                            args: [
                                `"[${quote}"`,
                                {
                                    expression: `?_encoded_${innerVariable(propertyName)}`,
                                    type: 'aggregate',
                                    aggregation: 'group_concat',
                                    distinct: o.distinct,
                                    separator: `${quote}, ${quote}`
                                },
                                `"${quote}]"`
                            ]
                        },
                        variable: `?${finalVariable(o.fieldName)}`
                    };
                } else {
                    return {
                        expression: {
                            expression: `?_${innerVariable(o.propertyName)}`,
                            type: 'aggregate',
                            aggregation: o.aggregator,
                            distinct: o.distinct
                        },
                        variable: `?${finalVariable(o.fieldName)}`
                    };
                }
            });
    };

    internals._requiredWhereSparson = function(properties) {
        const innerVariable = internals.buildInnerVariableName;
        const buildPredicate = internals.buildPredicate;
        /*** build field where statement ***/
        let triples = _.flatten(
            properties
                .filter((o) =>
                    !o.filter
                    && !o.fields
                    && o.propertyName !== '_id'
                    && !o.optional
                )
                .map((o) => {
                    let _triples = [{
                        subject: `?_${innerVariable(o.parent || '_id')}`,
                        predicate: buildPredicate(o.propertyName),//, o.parent),
                        object: `?_${innerVariable(o.propertyName)}`
                    }];

                    if (o.inverseRelationship) {
                        _triples = [..._triples, {
                            subject: `?_${innerVariable(o.propertyName)}`,
                            predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                            object: rdfUtils.buildRdfValue(o.inverseRelationship, '_type'),
                        }];
                    }

                    let embedTriples = _.toPairs(o.fields)
                        .map(([embedFieldName, embedPropertyName]) => ({
                            subject: `?_${innerVariable(o.propertyName)}`,
                            predicate: buildPredicate(embedPropertyName),//, o.parent),
                            object: `?_${innerVariable(embedPropertyName)}`
                        }));

                    return _triples.concat(embedTriples);
                })
        );

        return triples;
    };


    internals._optionalWhereSparson = function(properties) {
        const innerVariable = internals.buildInnerVariableName;
        const buildPredicate = internals.buildPredicate;
        return _(properties)
            .filter((o) => !o.filter && o.propertyName !== '_id' && o.optional)
            .groupBy((o) => o.propertyRaw.split('?')[0]) // group by clauses
            .map((props) => {
                return [{

                    type: 'optional',
                    patterns: _(props).map((prop) => {
                        if (prop.inner) {
                            return {
                                subject: `?_${innerVariable(prop.parent || '_id')}`,
                                predicate: buildPredicate(prop.propertyName),//, o.parent),
                                object: `?_${innerVariable(prop.propertyName)}`
                            };
                        } else {
                            return {
                                subject: `?_${innerVariable(prop.parent || '_id')}`,
                                predicate: buildPredicate(prop.propertyName),//, o.parent),
                                object: `?_optional_${innerVariable(prop.propertyName)}`
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

                }].concat(

                    props.filter((o) => !o.inner).map((prop) => ({
                        type: 'bind',
                        variable: `?_${innerVariable(prop.propertyName)}`,
                        expression: {
                            type: 'operation',
                            operator: 'coalesce',
                            args: [
                                `?_optional_${innerVariable(prop.propertyName)}`,
                                '""'
                            ]
                        }
                    }))
                );
            })
            .value();
    };

    internals.__buildFilterTriplesSparson = (propertyName) => {
        const innerVariable = internals.buildInnerVariableName;
        const buildPredicate = internals.buildPredicate;

        const stripEndingId = (propertyName) => (
            _.endsWith(propertyName, '._id')
                ? propertyName.split('.').slice(0, -1).join('.')
                : propertyName
        );

        const findInnerProperties = (_propertyName) => {
            const stripedPropertyName = stripEndingId(_propertyName);
            const variable = `?_filter_${innerVariable(stripedPropertyName)}`;
            const splitedPropertyName = stripedPropertyName.split('.');
            let value;
            if (splitedPropertyName.length > 1) {
                const parentName = splitedPropertyName.slice(0, -1).join('.');
                const parentVariable = `?_filter_${innerVariable(parentName)}`;
                value = _.flatten(_.compact([
                    { parentVariable, name: stripedPropertyName, parentName, variable },
                    findInnerProperties(parentName),
                ]));
            } else {
                value = [{
                    variable,
                    name: stripedPropertyName,
                    parentName: '_id',
                    parentVariable: '?__id',
                }];
            }
            return value;
        };


        return _(_.reverse(findInnerProperties(propertyName)))
            .map((o) => {
                const property = db[modelName].schema.getProperty(o.name);
                const inverseRelationship = property && property.isInverseRelationship()
                    ? property.type
                    : null;
                return Object.assign({}, o, { inverseRelationship });
            })
            .flatMap((o) => {
                let triples = [{
                    subject: o.parentVariable,
                    predicate: buildPredicate(o.name),
                    object: o.variable,
                }];

                if (o.inverseRelationship) {
                    triples = [...triples, {
                        subject: o.variable,
                        predicate: RDF_TYPE_URL,
                        object: rdfUtils.buildRdfValue(o.inverseRelationship, '_type'),
                    }];
                }

                return triples;
            })
            .value();
    };


    internals.__filterPropertySparson = function(filterProperty, filterExistance) {
        const innerVariable = internals.buildInnerVariableName;
        const buildPathPredicate = internals.buildPathPredicate;

        let { operator, rdfValue, propertyName } = filterProperty;

        if (propertyName === '_id') {
            return {
                type: 'filter',
                expression: {
                    type: 'operation',
                    operator: rdfUtils.operatorMapping[operator],
                    args: ['?__id', rdfValue],
                },
            };
        }

        let filters = [];

        let patternTriples = internals.__buildFilterTriplesSparson(propertyName);

        //
        // let patternTriples = [{
        //     subject: '?__id',
        //     predicate: buildPathPredicate(propertyName),
        //     object: `?_filter_${innerVariable(propertyName)}`,
        // }];

        if (operator === '$not') {
            let childFilterProperties = rdfValue.map((cfp) => {
                return Object.assign({}, cfp, {
                    operator: rdfUtils.inverseOperatorMapping[cfp.operator]
                });
            });
            return internals._filterWhereSparson(childFilterProperties);

        }


        if (_(['$exists', '$nexists']).includes(operator)) {

            filterExistance = rdfUtils.operatorMapping[operator];

        } else {

            if (filterExistance == null) {
                filterExistance = rdfUtils.filterExistanceOperatorMapping[operator];
                if (filterExistance === 'notexists') {
                    operator = rdfUtils.inverseOperatorMapping[operator];
                }
            }

            if (operator === '$all') {
                patternTriples = rdfValue.map((value) => {
                    return {
                        subject: '?__id',
                        predicate: buildPathPredicate(propertyName),
                        object: value
                    };
                });

            } else if (operator === '$and') {

                return rdfValue.map((prop) => {
                    return prop.map((p) =>
                        internals.__filterPropertySparson(p, filterExistance)
                    );
                });

            } else if (operator === '$or') {

                return {
                    type: 'union',
                    patterns: rdfValue.map(internals._filterWhereSparson)
                };

            } else if (operator === '$search') {
                const subjectVariable = `?_filter_${innerVariable(propertyName)}`;
                patternTriples = [
                    ...patternTriples,
                    {
                        subject: subjectVariable,
                        predicate: 'http://www.bigdata.com/rdf/search#search',
                        object: rdfValue
                    },
                    {
                        subject: subjectVariable,
                        predicate: 'http://www.bigdata.com/rdf/search#matchAllTerms',
                        object: '"true"'
                    }
                ];

                return {
                    type: 'group',
                    patterns: [{
                        type: 'bgp',
                        triples: patternTriples
                    }]
                };

            } else {
                let args = [
                    `?_filter_${innerVariable(propertyName)}`,
                    rdfValue
                ];

                if (operator === '$iregex') {
                    args = [...args, '"i"'];
                }

                filters = [
                    ...filters,
                    {
                        type: 'filter',
                        expression: {
                            args,
                            type: 'operation',
                            operator: rdfUtils.operatorMapping[operator],
                        },
                    },
                ];
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
                        triples: patternTriples,
                    }].concat(filters),
                }],
            },
        };
    };


    internals._filterWhereSparson = function _filterWhereSparson(filterProperties) {
        return filterProperties.map((o) => internals.__filterPropertySparson(o, null));
    };

    internals._bindingsSparson = function _bindingsSparson(properties) {
        const innerVariable = internals.buildInnerVariableName;
        /* encode_for_uri the value for object */
        const embedObjects = _(properties)
            .filter((o) => o.inObject)
            .groupBy('inObject')
            .value();

        const objectBindings = _.toPairs(embedObjects)
            .map(([fieldName, embedProperties]) => {

                let args = _(embedProperties).map((o) => [
                    `"\"${innerVariable(o.fieldName)}\":\""`,
                    {
                        type: 'operation',
                        operator: 'encode_for_uri',
                        args: [{
                            type: 'operation',
                            operator: 'str',
                            args: [`?_${innerVariable(o.propertyName)}`] //?_credits____gender"
                        }]
                    },
                    '"\","'
                ])
                .flatten()
                .tap((array) => array.pop()) // remove last comma
                .value();

                let propertyName = `EMBED_${fieldName}`;
                return {
                    type: 'bind',
                    variable: `?_encoded_${innerVariable(propertyName)}`,
                    expression: {
                        type: 'operation',
                        operator: 'concat',
                        args: _.concat(['"{"'], args, ['"\"}"'])
                    }
                };
            });

        /* encode_for_uri the value for  object */
        const arrayBindings = properties
            .filter((o) => o.array && !o.fields)
            .map((o) => ({
                type: 'bind',
                variable: `?_encoded_${innerVariable(o.propertyName)}`,
                expression: {
                    type: 'operation',
                    operator: 'encode_for_uri',
                    args: [{
                        type: 'operation',
                        operator: 'str',
                        args: [`?_${innerVariable(o.propertyName)}`],
                    }],
                },
            }));

        return objectBindings.concat(arrayBindings);
    };

    internals._groupBySparson = function _groupBySparson(properties) {
        const innerVariable = internals.buildInnerVariableName;
        const shouldGroupBy = _.find(properties, (o) => o.aggregator || o.array);

        if (!shouldGroupBy) {
            return null;
        }

        return properties
            .filter((o) => !o.aggregator && !o.array && !o.inner)
            .map((o) => ({ expression: `?_${innerVariable(o.propertyName)}` }));
    };


    internals._orderBySparson = function _orderBySparson(sortedFields) {
        const innerVariable = internals.buildInnerVariableName;
        return sortedFields.map((o) => ({
            expression: `?${innerVariable(o.fieldName)}`,
            descending: o.order === 'desc',
        }));
    };


    internals.buildSparson = function buildSparson(query) {
        let sortedFields = query.sort || [];
        sortedFields = sortedFields.map((_fieldName) => {
            const descOrder = _.startsWith(_fieldName, '-');
            const fieldName = descOrder ? _fieldName.slice(1) : _fieldName;
            const order = descOrder ? 'desc' : 'asc';
            return { fieldName, order };
        });


        const filterProperties = internals._buildFilterProperties(query);
        // console.log('FILTER_PROPERTIES>', JSON.stringify(filterProperties, null, 2));

        const aggregationProperties = internals._buildAggregationProperties(query);
        // console.log('AGGREGATION_PROPERTIES>', aggregationProperties);;

        const fieldProperties = internals._buildFieldProperties(query, sortedFields);
        // console.log('FIELD_PROPERTIES>', fieldProperties);
        const statementProperties = internals._buildStatementProperties(
            fieldProperties,
            aggregationProperties,
            sortedFields
        );
        // console.log('WHERE_PROPERTIES>', statementProperties)

        const selectVariableSparson = internals._selectVariableSparson(statementProperties);
        const selectArraySparson = internals._selectArraySparson(statementProperties);
        const selectAggregationSparson = internals._selectAggregationSparson(aggregationProperties);

        const selectSparson = selectVariableSparson
            .concat(selectArraySparson)
            .concat(selectAggregationSparson);


        /* build where statement ***/
        const requiredWhereSparson = internals._requiredWhereSparson(statementProperties);
        const optionalWhereSparson = internals._optionalWhereSparson(statementProperties);
        /* build bindings where statement */
        const bindingSparson = internals._bindingsSparson(statementProperties);
        /* build filter where statement */
        const filterWhereSparson = internals._filterWhereSparson(filterProperties);

        const whereSparson = requiredWhereSparson
            .concat(filterWhereSparson)
            .concat(optionalWhereSparson)
            .concat(bindingSparson);


        /* build group by variables ***/
        const groupBySparson = internals._groupBySparson(statementProperties);

        /* build order by variables ****/
        const orderBySparson = internals._orderBySparson(sortedFields);

        return {
            type: 'query',
            queryType: 'SELECT',
            variables: selectSparson,
            where: whereSparson,
            group: groupBySparson,
            order: orderBySparson.length ? orderBySparson : null,
            distinct: query.distinct,
            limit: query.limit,
            offset: query.offset,
        };
    };


    return {
        build(_query) {
            const query = _.cloneDeep(_query);
            // internals.validateQuery(query);
            const sparson = internals.buildSparson(query);
            sparson.from = {
                default: [graphUri],
            };
            // console.dir(sparson, {depth: 20});
            return new SparqlGenerator().stringify(sparson);
        },
    };
};
