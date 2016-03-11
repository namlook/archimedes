
import _ from 'lodash';
import {Util as N3Util} from 'n3';
import moment from 'moment';

let SparqlGenerator = require('sparqljs').Generator;

module.exports = function(db, graphUri) {

    const internals = {};
    const rdfInternals = {};

    rdfInternals.RELATION_SEPARATOR = '____';

    rdfInternals.operatorMapping = {
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
        $exists: 'exists',
        $nexists: 'notexists',
        $strlen: 'strlen'
    };

    rdfInternals.inverseOperatorMapping = {
        $gt: '$lte',
        $lt: '$gte',
        $gte: '$lt',
        $lte: '$gt',
        $eq: '$ne',
        $ne: '$eq',
        $in: '$nin',
        $nin: '$in',
        $exists: 'nexists',
        $nexists: '$exists'
    };

    rdfInternals.filterExistanceOperatorMapping = {
        $gt: 'exists',
        $lt: 'exists',
        $gte: 'exists',
        $lte: 'exists',
        $eq: 'exists',
        $in: 'exists',
        $regex: 'exists',
        $iregex: 'exists',
        $exists: 'exists',
        $strlen: 'exists',
        $ne: 'notexists',
        $nin: 'notexists',
        $nexists: 'notexists'
    };

    rdfInternals.validAggregators = [
        'count',
        'avg',
        'sum',
        'min',
        'max',
        //'object',
        //'array'
    ];

    rdfInternals.buildClassRdfUri = function(modelName) {
        return db[modelName].meta.classRdfUri;
    };

    rdfInternals.buildInstanceRdfUri = function(modelName, id) {
        const modelClass = db[modelName];
        return `${modelClass.meta.instanceRdfPrefix}/${id}`;
    };


    rdfInternals.buildRdfValue = function(modelName, propertyName, value) {

        const modelClass = db[modelName];

        // if (propertyName === '_type') {
            // return rdfInternals.buildClassRdfUri(modelName);
        // }

        let rdfValue;
        let isRelation = _.has(value, '_id') && _.has(value, '_type');

        if (propertyName === '_type') {

            rdfValue = rdfInternals.buildClassRdfUri(modelName);

        } else if (propertyName === '_id') {

            rdfValue = rdfInternals.buildInstanceRdfUri(modelName, value);

        } else if (_.endsWith(propertyName, '._id')) {

            propertyName = propertyName.split('.').slice(0, -1).join('.');
            let property = modelClass.schema.getProperty(propertyName);
            let relationModelName = property.modelSchema.name;
            rdfValue = rdfInternals.buildInstanceRdfUri(relationModelName, value);

        } else if (isRelation) {

            rdfValue = rdfInternals.instanceRdfUri(value._type, value._id);

        } else {

            let propertyType = modelClass.schema.getProperty(propertyName).type;
            if (_(['date', 'datetime']).includes(propertyType)) {
                value = moment(value).toISOString();
                let valueType = 'http://www.w3.org/2001/XMLSchema#dateTime';
                rdfValue = N3Util.createLiteral(value, valueType);
            } else {
                rdfValue = N3Util.createLiteral(value);
            }

        }

        return rdfValue;
    };


    /*
     * returns the sparson predicate from a propertyName
     * Note that if the parent is specified, the predicate used will be
     * build against the parent schema.
     */
    internals.buildPredicate = function(modelName, propertyName, parent) {
        const modelClass = db[modelName];
        let modelSchema = modelClass.schema;
        let property;

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
        property = modelSchema.getProperty(propertyName);

        // if (property.isInverseRelationship()) { // only for filter
        //     return {
        //         type: 'path',
        //         pathType: '^',
        //         items: [property.meta.rdfUri]
        //     };
        // } else {
            return property.meta.rdfUri;
        // }
    };

    /**
     * buid a predicate with a path:
     *   ?s (test:user/test/name) ?o
     */
    internals.buildPathPredicate = function(modelName, propertyName) {
        const modelClass = db[modelName];
        let modelSchema = modelClass.schema;

        if (_.endsWith(propertyName, '._id')) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }

        let items = propertyName.split('.').map((propertyName) => {

            if (propertyName === '_type') {
                return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
            }

            let property = modelSchema.getProperty(propertyName);

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
        return propertyName.split('.').join(rdfInternals.RELATION_SEPARATOR);
    };

    internals.buildFinalVariableName = function(propertyName) {
        return propertyName.split('.').join(rdfInternals.RELATION_SEPARATOR);
    };

    internals.validateQuery = function(query) {

        /** validate order by **/
        let sortedVariables = query['sort'] || [];

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
    //     {fieldName: 'creditedAuthor', propertyName: 'credits', array: true, subject: '_id', inner: true},
    //     {fieldName: null, propertyName: 'author', optional: true, inner: true},
    //     {fieldName: 'name', propertyName: 'credits.name', subject: 'credits'},
    //     {fieldName: 'sex', propertyName: 'credits.gender', subject: 'credits'}
    // ]
    internals._buildFieldProperties = function(modelName, query, sortedFields) {

        const convertPair2property = function([fieldName, fieldInfos]) {
            let isArray = _.isArray(fieldInfos);
            fieldInfos = isArray ? fieldInfos[0] : fieldInfos;

            if (_.isString(fieldInfos)) {
                fieldInfos = {$property: fieldInfos};
            }

            let propertyName = fieldInfos.$property;

            let optional = _.includes(propertyName, '?');
            if (optional) {
                propertyName = propertyName.split('?').join('');
            }

            return {
                fieldName,
                propertyName,
                optional,
                array: isArray,
                inner: false,//isInner,
                fields: fieldInfos.$fields,
            };
        };

        return  _.toPairs(query.field).map(convertPair2property);
    };

    internals._buildStatementProperties = function(modelName, fieldProperties, aggregationProperties, sortedFields) {

        const sortedField = (fieldName) => _.get(
            _.find(sortedFields, {fieldName: fieldName}),
            'order'
        );

        const findParents = function(propertyName) {
            let splitedPropertyName = propertyName.split('.');
            if (splitedPropertyName.length > 1) {
                let x = splitedPropertyName.slice(0, -1).join('.');
                return _.flatten(_.compact([x, findParents(x)]));
            }
        };

        const stripEndingId = (propertyName) => {
            return  _.endsWith(propertyName, '._id') ?
                propertyName.split('.').slice(0, -1).join('.') : propertyName;
        }


        let properties = _(fieldProperties)
            .concat(aggregationProperties)
            .map((o) => {
                if (o.aggregator === 'array' && o.fields) {
                    return _(o.fields)
                        .toPairs()
                        .map(([embedFieldName, embedPropertyName]) => ({
                            fieldName: embedFieldName,
                            propertyName: embedPropertyName,
                            inObject: o.fieldName,
                            inner: true
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
                o.propertyRaw = o.propertyName;
                let optional = o.propertyName.split('?').length > 1;
                if (optional) {
                    o.optional = true;
                    o.propertyName = o.propertyName.split('?').join('');
                }
                o.propertyName = stripEndingId(o.propertyName);
                o.parent = o.propertyName.split('.').slice(0, -1).join('.');
                return o;
            }).map((o) => { // add sortBy info
                o.sortBy = sortedField(o.fieldName)
                return o;
            })
            .value();



        let innerProperties = _(properties)
            .filter((o) => o.parent)
            .map((o) => o.propertyRaw)
            .flatMap(findParents)
            .uniq()
            .map((propertyName) => {
                let optional = propertyName.split('?').length > 1;
                let propertyRaw = propertyName;
                if (optional) {
                    propertyName = propertyName.split('?').join('');
                }
                let parent = propertyName.split('.').slice(0, -1).join('.');
                return {
                    propertyName,
                    optional,
                    parent,
                    inner: true,
                    propertyRaw
                };
            })
            .value();


        let statementProperties = innerProperties.concat(properties);

        /** if there is only _id in field and no aggregation,
         * add a statement so we can retrieve the _id
         */
        if (!_.find(statementProperties, (o) => o.propertyName !== '_id')) {
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
    internals._buildFilterProperties = function(modelName, query) {
        return _(query.filter)
            .toPairs()
            .map(([propertyName, filterInfos]) => {
                if (!_.isPlainObject(filterInfos)) {
                    filterInfos = {$eq: filterInfos};
                }

                if (filterInfos._id && filterInfos._type) {
                    let rdfValue = rdfInternals.buildRdfValue(filterInfos._type, '_id', filterInfos._id);
                    return [{
                        propertyName,
                        operator: '$eq',
                        rdfValue
                    }];
                }

                return _(filterInfos)
                    .toPairs(filterInfos)
                    .map(([operator, value]) => {
                        let rdfValue;
                        if (operator === '$exists') {
                            if (value === false) {
                                operator = '$nexists';
                                value = true;
                            }
                        }
                        if (_.isArray(value)) {
                            rdfValue = value.map((v) => rdfInternals.buildRdfValue(
                                modelName, propertyName, v));
                        } else {
                            rdfValue = rdfInternals.buildRdfValue(modelName, propertyName, value);
                        }
                        return {propertyName, operator, rdfValue};
                    })
                    .flatten()
                    .value();
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
    internals._buildAggregationProperties = function(model, query) {
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
                    [aggregator, aggregationInfos] = _.toPairs(aggregation)[0];
                    aggregator = aggregator.slice(1);
                    if (aggregationInfos === true) {
                        aggregationInfos = {$property: '_id'};
                    }
                }

                if (!_.isPlainObject(aggregationInfos)) {
                    aggregationInfos = {$property: aggregationInfos};
                }

                aggregator = aggregator.toLowerCase();

                return {
                    fieldName,
                    aggregator,
                    array: aggregator === 'array',
                    propertyName: aggregationInfos.$property,
                    distinct: aggregationInfos.distinct,
                    fields: aggregationInfos.$fields,
                    inner: true
                };
            });
    };

    internals._selectVariableSparson = function(modelName, properties) {
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

    internals._selectArraySparson = function(modelName, properties) {
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

    internals._selectAggregationSparson = function(modelName, aggregationProperties) {
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
                    }
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

    internals._requiredWhereSparson = function(modelName, properties) {
        const innerVariable = internals.buildInnerVariableName;
        const buildPredicate = internals.buildPredicate;
        /*** build field where statement ***/
        let triples = _.flatten(
            properties
                .filter((o) => !o.filter && !o.fields && o.propertyName !== '_id' && !o.optional)
                .map((o) => {
                    let _triples = [{
                        subject: `?_${innerVariable(o.parent || '_id')}`,
                        predicate: buildPredicate(modelName, o.propertyName),//, o.parent),
                        object: `?_${innerVariable(o.propertyName)}`
                    }];

                    let embedTriples = _.toPairs(o.fields)
                        .map(([embedFieldName, embedPropertyName]) => ({
                            subject: `?_${innerVariable(o.propertyName)}`,
                            predicate: buildPredicate(modelName, embedPropertyName),//, o.parent),
                            object: `?_${innerVariable(embedPropertyName)}`
                        }));

                    return _triples.concat(embedTriples)
                })
        );

        return triples;
    };


    internals._optionalWhereSparson = function(modelName, properties) {
        const innerVariable = internals.buildInnerVariableName;
        const buildPredicate = internals.buildPredicate;
        return _(properties)
            .filter((o) => !o.filter && o.propertyName !== '_id' && o.optional)
            .groupBy((o) => o.propertyRaw.split('?')[0]) // group by clauses
            .map((props) => ({
                type: 'optional',
                patterns: _(props).map((prop) => {

                    let triples = {
                        subject: `?_${innerVariable(prop.parent || '_id')}`,
                        predicate: buildPredicate(modelName, prop.propertyName),//, o.parent),
                        object: `?_${innerVariable(prop.propertyName)}`
                    }

                    let embedTriples = _.toPairs(prop.fields)
                        .map(([embedFieldName, embedPropertyName]) => ({
                            subject: `?_${innerVariable(prop.propertyName)}`,
                            predicate: buildPredicate(modelName, embedPropertyName),//, o.parent),
                            object: `?_${innerVariable(embedPropertyName)}`
                        }));

                    return [triples].concat(embedTriples);

                }).flatten()
            }))
            .value();
    };

    internals._filterWhereSparson = function(modelName, filterProperties) {
        const innerVariable = internals.buildInnerVariableName;
        const buildPathPredicate = internals.buildPathPredicate;
        return filterProperties.map((o) => {
            if (o.propertyName === '_id') {

                return {
                    type: 'filter',
                    expression: {
                        type: 'operation',
                        operator: rdfInternals.operatorMapping[o.operator],
                        args: [`?__id`, o.rdfValue]
                    }
                };

            } else {

                let filterExistance;
                let operator = o.operator;
                let filters = [];

                if (_(['$exists', '$nexists']).includes(operator)) {

                    filterExistance = rdfInternals.operatorMapping[operator];

                } else {

                    filterExistance = rdfInternals.filterExistanceOperatorMapping[operator];
                    if (filterExistance === 'notexists') {
                        operator = rdfInternals.inverseOperatorMapping[operator];
                    }

                    const args = [
                        `?_filter_${innerVariable(o.propertyName)}`,
                        o.rdfValue
                    ];

                    if (operator === '$iregex') {
                        args.push('"i"');
                    }

                    filters.push({
                        type: 'filter',
                        expression: {
                            type: 'operation',
                            operator: rdfInternals.operatorMapping[operator],
                            args: args
                        }
                    });

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
                                triples: [{
                                    subject: '?__id',
                                    predicate: buildPathPredicate(modelName, o.propertyName),
                                    object: `?_filter_${innerVariable(o.propertyName)}`
                                }]
                            }].concat(filters)
                        }]
                    }
                };
            }
        });
    };

    internals._bindingsSparson = function(modelName, properties) {
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
                        args: [`?_${innerVariable(o.propertyName)}`]
                    }]
                }
            }));

        return objectBindings.concat(arrayBindings);
    };

    internals._groupBySparson = function(modelName, properties) {
        const innerVariable = internals.buildInnerVariableName;
        const shouldGroupBy = _.find(properties, (o) => o.aggregator || o.array)

        if (!shouldGroupBy) {
            return null;
        }

        return properties
            .filter((o) => !o.aggregator && !o.array && !o.inner)
            .map((o) => ({expression: `?_${innerVariable(o.propertyName)}`}));
    };


    internals._orderBySparson = function(modelName, sortedFields) {
        const innerVariable = internals.buildInnerVariableName;
        return sortedFields.map((o) => ({
            expression: `?${innerVariable(o.fieldName)}`,
            descending: o.order === 'desc'
        }));
    };


    internals.buildSparson = function(modelName, query) {

        let sortedFields = query.sort || [];
        sortedFields = sortedFields.map((fieldName) => {
            let descOrder = _.startsWith(fieldName, '-');
            fieldName = descOrder ? fieldName.slice(1) : fieldName;
            let order = descOrder ? 'desc' : 'asc';
            return { fieldName, order };
        });

        let fieldProperties = internals._buildFieldProperties(modelName, query, sortedFields);
        // console.log('FIELD_PROPERTIES>', fieldProperties);
        let filterProperties = internals._buildFilterProperties(modelName, query);
        // console.log('FILTER_PROPERTIES>', filterProperties);
        let aggregationProperties = internals._buildAggregationProperties(modelName, query);
        // console.log('AGGREGATION_PROPERTIES>', aggregationProperties);
        let statementProperties = internals._buildStatementProperties(modelName, fieldProperties, aggregationProperties, sortedFields);
        // console.log('WHERE_PROPERTIES>', statementProperties);

        let selectVariableSparson = internals._selectVariableSparson(modelName, statementProperties);
        let selectArraySparson = internals._selectArraySparson(modelName, statementProperties);
        let selectAggregationSparson = internals._selectAggregationSparson(modelName, aggregationProperties);//internals._selectAggregationSparson(aggregationProperties);

        let selectSparson = selectVariableSparson
            .concat(selectArraySparson)
            .concat(selectAggregationSparson);


        /*** build where statement ***/
        let requiredWhereSparson = internals._requiredWhereSparson(modelName, statementProperties);
        let optionalWhereSparson = internals._optionalWhereSparson(modelName, statementProperties);
        /* build bindings where statement */
        let bindingSparson = internals._bindingsSparson(modelName, statementProperties);
        /* build filter where statement */
        let filterWhereSparson = internals._filterWhereSparson(modelName, filterProperties);

        let whereSparson = requiredWhereSparson
            .concat(filterWhereSparson)
            .concat(optionalWhereSparson)
            .concat(bindingSparson);


        /*** build group by variables ***/
        let groupBySparson = internals._groupBySparson(modelName, statementProperties);

        /*** build order by variables ****/
        let orderBySparson = internals._orderBySparson(modelName, sortedFields);

        return {
            type: 'query',
            queryType: 'SELECT',
            variables: selectSparson,
            where: whereSparson,//[requiredTriples].concat(optionalTriples).concat(filters).concat(bindings),
            group: groupBySparson,
            order: orderBySparson.length ? orderBySparson: null,
            distinct: query.distinct,
            limit: query.limit,
            offset: query.offset
        };
    };


    return {
        build: function(modelName, query) {
            // internals.validateQuery(query);
            let sparson = internals.buildSparson(modelName, query);
            sparson.from = {
                'default': [graphUri]
            };
            return new SparqlGenerator().stringify(sparson);
        }
    };
};
