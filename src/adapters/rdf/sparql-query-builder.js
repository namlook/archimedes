
import _ from 'lodash';
import {Util as N3Util} from 'n3';
import moment from 'moment';

let SparqlGenerator = require('sparqljs').Generator;

module.exports = function(db, graphUri) {

    let internals = {};
    let rdfInternals = {};

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
        $nexists: 'notexists',
        $exists: 'exists',
        $strlen: 'strlen'
    };

    rdfInternals.validAggregators = ['count', 'avg', 'sum', 'min', 'max'];


    rdfInternals.buildPropertyRdfUri = function(modelName, propertyName) {
        let modelClass = db[modelName];
        if (!modelClass) {
            return new Error('propertyRdfUri require a modelClass');
        }

        if (!propertyName) {
            return new Error('propertyRdfUri require a propertyName');
        }


        if (propertyName === '_type') {
            return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }

        let property = modelClass.schema.getProperty(propertyName);

        if (!property) {
            throw new Error(`unknown property "${propertyName}" on model "${modelClass.name}"`);
        }

        if (_.isArray(property)) {
            return property.map((o) => o.meta.rdfUri);
        } else {
            return property.meta.rdfUri;
        }
    };

    rdfInternals.buildClassRdfUri = function(modelName) {
        return db[modelName].meta.classRdfUri;
    };

    rdfInternals.buildInstanceRdfUri = function(modelName, id) {
        let modelClass = db[modelName];
        return `${modelClass.meta.instanceRdfPrefix}/${id}`;
    };


    rdfInternals.buildRdfValue = function(modelName, propertyName, value) {

        let modelClass = db[modelName];

        // if (propertyName === '_type') {
            // return rdfInternals.buildClassRdfUri(modelName);
        // }

        let rdfValue;
        if (_.has(value, '_id') && _.has(value, '_type')) {
            rdfValue = rdfInternals.instanceRdfUri(value._type, value._id);
        } else {
            let propertyType = modelClass.schema.getProperty(propertyName).type;
            if (_(['date', 'datetime']).includes(propertyType)) {
                rdfValue = N3Util.createLiteral(moment(value).toISOString(), 'http://www.w3.org/2001/XMLSchema#dateTime');
            } else {
                rdfValue = N3Util.createLiteral(value);
            }
        }

        return rdfValue;
    };

    internals.sanitizeQueryField = function(modelName, fields) {
        let queryFields = {};
        for (let fieldName of Object.keys(fields)) {
            let propertyInfos = fields[fieldName];

            if (_.isString(propertyInfos)) {
                propertyInfos = {property: propertyInfos};
            }

            let aggregator = propertyInfos.aggregator;

            if (aggregator) {
                let validAggregator = _(rdfInternals.validAggregators).includes(aggregator);

                if (!validAggregator) {
                    throw new Error(`unknown aggregator "${aggregator}" for field "${fieldName}"`);
                }

                if (aggregator === 'count') {
                    propertyInfos.property = '_id';
                }
            }

            queryFields[fieldName] = propertyInfos;
        }
        return queryFields;
    };

    /**
     * returns the list of properties fieldName whose property
     * is an array
     */
    internals.getArrayProperties = function(modelName, fields) {
        let modelClass = db[modelName];
        let modelSchema = modelClass.schema;
        let arrayProperties = [];
        for (let fieldName of Object.keys(fields)) {
            let propertyInfos = fields[fieldName];

            /**
             * XXX if the propertyInfos has an aggregation operator
             * let's skip it for now but we may need to perform aggregations
             * on array in the future
             */

            if (propertyInfos.aggregator) {
                continue;
            }

            let propertyName = propertyInfos.property;

            let property = modelSchema.getProperty(propertyName);
            if(property.isArray()) {
                arrayProperties.push(propertyName);
            }
        }
        return arrayProperties;
    };


    /*
     * returns the sparson predicate from a propertyName
     */
    internals.buildPredicate = function(modelName, propertyNames) {
        let modelClass = db[modelName];
        let modelSchema = modelClass.schema;

        let items = propertyNames.split('.').map((propertyName) => {

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

    /**
     * build the sparson "field“ section wich will be added
     * to the `whereClause`
     */
    internals.buildFields = function(modelName, fields, filter, includes) {
        let arrayProperties = internals.getArrayProperties(modelName, fields);

        let triples = [];
        let bindings = [];
        for (let i = 0; i < Object.keys(fields).length; i++) {
            let fieldName = Object.keys(fields)[i];
            let propertyInfos = fields[fieldName];

            let propertyName = propertyInfos.property;

            let shouldAddVariable = (
                propertyName !== '_id'
                 && !(includes && includes[fieldName])
                // && !(filter && filter[fieldName])
            );

            let predicate;
            if(shouldAddVariable) {
                predicate = internals.buildPredicate(modelName, propertyName);
                let objectVariable = `?${fieldName}`;

                /**
                 * if the property has an aggregator, we need the propertyName
                 * as a variable
                 */
                if (propertyInfos.aggregator) {
                    objectVariable = `?${propertyName}`;
                }

                if (arrayProperties.indexOf(propertyName) > -1) {
                    objectVariable = `?array_${propertyName}`;
                    objectVariable = objectVariable.split('.').join(rdfInternals.RELATION_SEPARATOR);
                }

                triples.push({
                    subject: '?_id',
                    predicate: predicate,
                    object: objectVariable
                });

                if (arrayProperties.indexOf(propertyName) > -1) {
                    let variable = `?encoded_array_${propertyName}`;
                    variable = variable.split('.').join(rdfInternals.RELATION_SEPARATOR);
                    bindings.push({
                        type: 'bind',
                        variable: variable,
                        expression: {
                            type: 'operation',
                            operator: 'encode_for_uri',
                            args: [objectVariable]
                        }
                    });
                }
            // } else {
            //     predicate = 'http://ceropath.org/properties/'+fields[fieldName];
            //     triples.push({
            //         subject: '?_id',
            //         predicate: predicate,
            //         object: '?array_'+fieldName
            //     });
            }
        }
        return [{
            type: 'bgp',
            triples: triples
        }].concat(bindings);
    };

    internals.buildFilterOperation = function(operator, variable, rdfValue, predicate) {
        let filterOperation = {
            type: 'filter',
            expression: {
                type: 'operation',
                operator: rdfInternals.operatorMapping[operator],
                args: [
                    variable,
                    rdfValue
                ]
            }
        }

        if (_(['$exists', '$nexists']).includes(operator)) {
            filterOperation.expression.args = [{
                type: 'bgp',
                triples: [{
                    subject: '?_id',
                    predicate: predicate,
                    object: variable
                }]
            }];
        }
        return filterOperation;
    };

    internals.buildVariableName = function(propertyName, isArray) {
        let arrayPrefix = '';
        if (isArray) {
            arrayPrefix = 'array_';
        }
        let variable = `?${arrayPrefix}${propertyName}`;

        return variable.split('.').join(rdfInternals.RELATION_SEPARATOR);
    };

    internals.buildFilterItem = function(fieldName, propertyName, predicate, operator, rdfValue) {
        let filters = [];
        let triples = []
        /*
         * if the propertyName is present in fields,
         * we have to perform a FILTER on
         * the variable built from the fieldName
         */
        if (operator === '$eq' && !fieldName) {
            triples.push({
                subject: '?_id',
                predicate: predicate,
                object: rdfValue
            });
        } else {

            let isArray = _(arrayProperties).includes(queryField[fieldName]);
            let variable = internals.buildVariableName(fieldName, isArray);

            let isExistOperator = _(['$exists', '$nexists']).includes(operator);

            if (!fieldName && !isExistOperator) {

                isArray = _(arrayProperties).includes(propertyName);
                variable = internals.buildVariableName(propertyName, isArray);

                triples.push({
                    subject: '?_id',
                    predicate: predicate,
                    object: variable
                });

            /**
             * if it is an array and in field, we have to create a
             * sub variable to be able to fetch the other values in the
             * array
             */
            } else if (isArray) {
                variable += '__inner';
                triples.push({
                    subject: '?_id',
                    predicate: predicate,
                    object: variable
                });
            }

            let operation = internals.buildFilterOperation(operator, variable, rdfValue, predicate);
            filters.push(operation)
        }
        return {triples: triples, filters: filters};
    };

    internals.buildFilterClause = function(modelName, queryFilter, queryField) {
        let arrayProperties = internals.getArrayProperties(modelName, queryField);

        let triples = [{
            subject: '?_id',
            predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
            object: rdfInternals.buildClassRdfUri(modelName)
        }];

        let invertedQueryFields = _.invert(queryField);

        let filters = [];

        for (let i = 0; i < Object.keys(queryFilter).length; i++) {
            let propertyName = Object.keys(queryFilter)[i];
            let fieldName = invertedQueryFields[propertyName];
            let valueObject = queryFilter[propertyName];

            /**
             * if the value is not an object, use the operator $eq by default
             */
            if (!_.isObject(valueObject)) {
                valueObject = {'$eq': valueObject};
            }

            let predicate = internals.buildPredicate(modelName, propertyName);

            for (let operator of Object.keys(valueObject)) {
                let value = valueObject[operator];
                let rdfValue;
                if (_.isArray(value)) {
                    rdfValue = [];
                    for (let val of value) {
                        rdfValue.push(rdfInternals.buildRdfValue(modelName, propertyName, val));
                    }
                } else {
                    rdfValue = rdfInternals.buildRdfValue(modelName, propertyName, value);
                }

                /*
                 * if the propertyName is present in fields,
                 * we have to perform a FILTER on
                 * the variable built from the fieldName
                 */
                if (operator === '$eq' && !fieldName) {
                    triples.push({
                        subject: '?_id',
                        predicate: predicate,
                        object: rdfValue
                    });
                } else {

                    let isArray = _(arrayProperties).includes(queryField[fieldName]);
                    let variable = internals.buildVariableName(fieldName, isArray);

                    let isExistOperator = _(['$exists', '$nexists']).includes(operator);

                    if (!fieldName && !isExistOperator) {

                        isArray = _(arrayProperties).includes(propertyName);
                        variable = internals.buildVariableName(propertyName, isArray);

                        triples.push({
                            subject: '?_id',
                            predicate: predicate,
                            object: variable
                        });

                    /**
                     * if it is an array and in field, we have to create a
                     * sub variable to be able to fetch the other values in the
                     * array
                     */
                    } else if (isArray) {
                        variable += '__inner';
                        triples.push({
                            subject: '?_id',
                            predicate: predicate,
                            object: variable
                        });
                    }

                    let operation = internals.buildFilterOperation(operator, variable, rdfValue, predicate);
                    filters.push(operation)
                }

                // let filterItems = internals.buildFilterItem(fieldName, propertyName, predicate, operator, rdfValue);
                // triples = triples.concat(filterItems.triples);
                // filters = filters.concat(filterItems.filters);
            }
        }

        return [{
            type: 'bgp',
            triples: triples
        }].concat(filters);
    };

    internals.buildFieldVariables = function(modelName, fields, isDistinct) {
        let arrayProperties = internals.getArrayProperties(modelName, fields);
        let fieldVariables = [];
        let hasAggregator = false;

        for (let i = 0; i < Object.keys(fields).length; i++) {
            let fieldName = Object.keys(fields)[i];
            let propertyInfos = fields[fieldName];
            let propertyName = propertyInfos.property;

            /**
             * if the propertyInfos has an aggregation operator like {$count: '_id'}
             */
            if (propertyInfos.aggregator) {
                hasAggregator = true;

                let expression = `?${propertyInfos.property}`;

                let fieldVariable = {
                    expression: {
                        expression: expression,
                        type: 'aggregate',
                        aggregation: propertyInfos.aggregator,
                        distinct: propertyInfos.distinct
                    },
                    variable: `?${fieldName}`
                };

                fieldVariables.push(fieldVariable);

            } else {

                /**
                 * XXX there is currently no possibility to use an aggregator
                 * with an array
                 */

                if (arrayProperties.indexOf(propertyName) === -1) {
                    fieldVariables.push(`?${fieldName}`);
                }
            }
        }

        /**
         * if the query has an aggregator, we skip the ?_id variable
         */
        if (hasAggregator || isDistinct) {
            return fieldVariables;
        }

        return ['?_id'].concat(fieldVariables);
    };

    internals.buildArrayFieldVariables = function(modelName, propertyName) {
        propertyName = propertyName.split('.').join(rdfInternals.RELATION_SEPARATOR);

        return {
            expression: {
                type: 'operation',
                operator: 'concat',
                args: [
                    '"[\""',
                    {
                        expression: `?encoded_array_${propertyName}`,
                        type: 'aggregate',
                        aggregation: 'group_concat',
                        separator: '", "',
                        distinct: false
                    },
                    '"\"]"'
                ]
            },
            variable: `?${propertyName}`
        };
    };

    internals.buildWhereClause = function(modelName, queryField, queryFilter, queryIncludes) {
        queryFilter = queryFilter || {};
        queryIncludes = queryIncludes || {};

        let whereClause = [];
        if (queryFilter) {
            let filterClause = internals.buildFilterClause(modelName, queryFilter, queryField);
            whereClause = whereClause.concat(filterClause);
        }

        let fieldsClause = internals.buildFields(modelName, queryField, queryFilter, queryIncludes);
        whereClause = whereClause.concat(fieldsClause);

        // for (let i = 0; i < Object.keys(includes).length; i++) {
        //     let fieldName = Object.keys(includes)[i];
        //
        //     if (!includes[fieldName].field) { // TODO _.isEmpty()
        //         throw new Error(fieldName+' is included but has no field');
        //     }
        //
        //     let subquery = include(
        //         fieldName,
        //         'http://ceropath.org/properties/'+fieldName,
        //         includes[fieldName].field);
        //     whereClause = whereClause.concat(subquery);
        // }

        return whereClause;
    };


    internals.buildGroupBy = function(modelName, fields) {
        let groupBy;
        let variables = internals.buildFieldVariables(modelName, fields);
        let arrayProperties = internals.getArrayProperties(modelName, fields);

        if (arrayProperties.length) {

            groupBy = [];
            groupBy = groupBy.concat(variables.map(function(v) {
                return {expression: v};
            }));

        } else {
            groupBy = [];

            /** insert only non-aggregator variables **/
            for (let variable of variables) {
                if (!_.isObject(variable)) {
                    groupBy.push({expression: variable});
                }
            }

            /** if the number of groupBy equals the number of variable,
             * there are no aggregators so we just have to dump the groupBy
             */
            if (groupBy.length === variables.length) {
                groupBy = null;
            }
        }
        return groupBy;
    };


    internals.buildAllFieldsVariables = function(modelName, fields, isDistinct) {
        let arrayProperties = internals.getArrayProperties(modelName, fields);
        let fieldVariables = internals.buildFieldVariables(modelName, fields, isDistinct);

        let arrayFieldVariables = arrayProperties.map(function(prop) {
            return internals.buildArrayFieldVariables(modelName, prop);
        });

        return fieldVariables.concat(arrayFieldVariables);
    };

    internals.buildOrderBy = function(sortedVariables, fields) {

        if (!sortedVariables) {
            return null;
        }

        if (!_.isArray(sortedVariables)) {
            throw new Error('sortedVariable must be an array');
        }

        let orderBy = [];
        for (let variable of sortedVariables) {
            let descending = false;
            if (variable[0] === '-') {
                descending = true;
                variable = variable.slice(1);
            }

            // check if the variable is set in fields
            if (fields[variable] == null) {
                throw new Error(`can't order by an unknown field: "${variable}"`);
            }

            orderBy.push({
                expression: internals.buildVariableName(variable, false),
                descending: descending
            });
        }
        return orderBy;
    };


    return {
        build: function(modelName, query) {

            let queryField = internals.sanitizeQueryField(modelName, query.field);

            let sparson = {
                type: 'query',
                from: {
                    'default': [graphUri] // TODO
                },
                queryType: 'SELECT',
                variables: internals.buildAllFieldsVariables(modelName, queryField, query.distinct),
                where: internals.buildWhereClause(modelName, queryField, query.filter, query.include), //whereClause,//[filter, field, subquery, subquery2],
                group: internals.buildGroupBy(modelName, queryField),
                order: internals.buildOrderBy(query.sort, queryField),
                distinct: query.distinct,
                limit: query.limit
            };


            console.dir(sparson, {depth: 10});
            console.log();
            console.log();
            console.log();


            return new SparqlGenerator().stringify(sparson);
        }
    };
};
