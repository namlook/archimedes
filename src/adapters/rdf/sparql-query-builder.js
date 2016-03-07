
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
        $nexists: 'notexists',
        $exists: 'exists',
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


    rdfInternals.buildPropertyRdfUri = function(modelName, propertyName) {
        const modelClass = db[modelName];
        if (!modelClass) {
            return new Error('propertyRdfUri require a modelClass');
        }

        if (!propertyName) {
            return new Error('propertyRdfUri require a propertyName');
        }


        if (propertyName === '_type') {
            return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }

        const property = modelClass.schema.getProperty(propertyName);

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

    internals.sanitizeQueryField = function(modelName, fields) {
        fields = fields || {};
        const queryFields = {};
        for (let fieldName of Object.keys(fields)) {
            let propertyInfos = fields[fieldName];
            let isArray = false;

            if (_.isArray(propertyInfos)) {
                propertyInfos = propertyInfos[0];
                isArray = true;
            }

            if (_.isString(propertyInfos)) {
                propertyInfos = {$property: propertyInfos};
            } else if (!propertyInfos.$property) {
                throw new Error('$property unfound');
            }

            propertyInfos.$array = isArray;

            let propertyName = propertyInfos.$property;

            let aggregator = propertyInfos.$aggregator;

            if (aggregator) {
                let validAggregator = _(rdfInternals.validAggregators).includes(aggregator);

                if (!validAggregator) {
                    throw new Error(`unknown aggregator "${aggregator}" for field "${fieldName}"`);
                }

                if (aggregator === 'count') {
                    propertyInfos.$property = '_id';
                }
            }

            queryFields[fieldName] = propertyInfos;
        }

        return queryFields;
    };

    internals.sanitizeQueryAggregation = function(modelName, queryAggregation) {
        queryAggregation = queryAggregation || {};
        let sanitizedQueryAggregation = {};
        for (let fieldName of Object.keys(queryAggregation)) {
            let aggregationInfos = queryAggregation[fieldName];

            let aggregator;
            let propertyName;
            let distinct = false;

            if (aggregationInfos.$aggregator) {
                aggregator = aggregationInfos.$aggregator;
                propertyName = aggregationInfos.$property;
                distinct = aggregationInfos.distinct;
            } else {
                let aggregationOperator = Object.keys(aggregationInfos)[0];
                propertyName = aggregationInfos[aggregationOperator];
                if (propertyName === true) {
                    propertyName = '_id';
                }
                aggregator = aggregationOperator.slice(1); // remove $
            }

            if (!propertyName) {
                if (aggregator === 'count') {
                    propertyName = '_id';
                } else {
                    throw new Error('unknown aggregation property');
                }
            }

            let isSpecialProperty = _(['_id', '_type']).includes(propertyName);
            if (!isSpecialProperty) {
                let property = db[modelName].schema.getProperty(propertyName);
                if (!property) {
                    throw new Error(`unknown property ${propertyName} for field ${fieldName}`);
                }
            }

            let badAggregator = !_(rdfInternals.validAggregators).includes(aggregator);
            if (badAggregator) {
                throw new Error(`unknown aggregator ${aggregator} for field ${fieldName}`);
            }

            sanitizedQueryAggregation[fieldName] = {
                $aggregator: aggregator,
                $property: propertyName,
                distinct: distinct
            };
        }
        return sanitizedQueryAggregation;
    };

    /** returns the list of properties fieldName whose property
     * is an array
     */
    // internals.getArrayProperties = function(modelName, fields) {
    //     let modelClass = db[modelName];
    //     let modelSchema = modelClass.schema;
    //     let arrayProperties = [];
    //     for (let fieldName of Object.keys(fields)) {
    //         let propertyInfos = fields[fieldName];
    //
    //         /**
    //          * XXX if the propertyInfos has an aggregation operator
    //          * let's skip it for now but we may need to perform aggregations
    //          * on array in the future
    //          */
    //
    //         if (propertyInfos.aggregator) {
    //             continue;
    //         }
    //
    //         let propertyName = propertyInfos.property;
    //
    //         let property = modelSchema.getProperty(propertyName);
    //         if(property.isArray()) {
    //             arrayProperties.push(propertyName);
    //         }
    //     }
    //     return arrayProperties;
    // };


    /*
     * returns the sparson predicate from a propertyName
     * Note that if the parent is specified, the predicate used will be
     * build against the parent schema.
     */
    internals.buildPredicate = function(modelName, propertyName, parent) {
        const modelClass = db[modelName];
        let modelSchema = modelClass.schema;
        let property;

        if (propertyName === '_type') {
            return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }

        if (parent) {
            let relationType = modelSchema.getProperty(parent).type;
            let relationModelSchema = db[relationType].schema;
            property = relationModelSchema.getProperty(propertyName);
        } else {
            property = modelSchema.getProperty(propertyName);
        }

        if (property.isInverseRelationship()) { // only for filter
            return {
                type: 'path',
                pathType: '^',
                items: [property.meta.rdfUri]
            };
        } else {
            return property.meta.rdfUri;
        }
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

    /** build the sparson "field“ section wich will be added
     * to the `whereClause`
     */
    // internals.buildFields = function(modelName, fields, filter, includes) {
    //     // let arrayProperties = internals.getArrayProperties(modelName, fields);
    //
    //     const triples = [];
    //     const bindings = [];
    //     const subqueries = [];
    //     for (let i = 0; i < Object.keys(fields).length; i++) {
    //         let fieldName = Object.keys(fields)[i];
    //         let propertyInfos = fields[fieldName];
    //
    //         if (propertyInfos.$aggregator === 'object') {
    //
    //             let variable = internals.buildVariableName(fieldName);
    //             let fieldNames = Object.keys(propertyInfos.$properties);
    //
    //             let subqueryFields = {};
    //             for (let _fieldName of fieldNames) {
    //                 let propertyName = propertyInfos.$properties[_fieldName];
    //                 _fieldName = propertyName.split('.').join(rdfInternals.RELATION_SEPARATOR);
    //                 subqueryFields[_fieldName] = propertyName;
    //             }
    //
    //             let subquery = internals.buildQueryClause(modelName, {field: subqueryFields});
    //             subqueries.push(subquery);
    //
    //
    //             let binding = {
    //                 type: 'bind',
    //                 variable: variable,
    //                 expression: {
    //                     type: 'operation',
    //                     operator: 'concat',
    //                     args: []
    //                 }
    //             };
    //             binding.expression.args.push('"{"');
    //
    //             for (let i = 0; i < fieldNames.length; i++) {
    //
    //                 let _fieldName = fieldNames[i];
    //                 let propertyName = propertyInfos.$properties[_fieldName];
    //
    //                 binding.expression.args.push(`"\"${_fieldName}\":\""`);
    //
    //                 // TODO add encode_for_uri
    //                 binding.expression.args.push({
    //                     type: 'operation',
    //                     operator: 'str',
    //                     args: [internals.buildVariableName(propertyName)]
    //                 });
    //
    //                 if (i === fieldNames.length - 1) { // if is last
    //                     binding.expression.args.push('"\"}"');
    //                 } else {
    //                     binding.expression.args.push('"\","');
    //                 }
    //
    //             }
    //
    //             bindings.push(binding);
    //
    //         } else {
    //
    //             let propertyName = propertyInfos.$property;
    //
    //             let shouldAddVariable = (
    //                 propertyName !== '_id'
    //                  && !(includes && includes[fieldName])
    //                 // && !(filter && filter[fieldName])
    //             );
    //
    //             let predicate;
    //             if(shouldAddVariable) {
    //                 predicate = internals.buildPredicate(modelName, propertyName);
    //                 let objectVariable = internals.buildVariableName(fieldName);
    //
    //                 /**
    //                  * if the property has an aggregator, we need the propertyName
    //                  * as a variable
    //                  */
    //                 if (propertyInfos.$aggregator) {
    //                     objectVariable = internals.buildVariableName(propertyName);
    //                 }
    //
    //                 // if (arrayProperties.indexOf(propertyName) > -1) {
    //                 //     objectVariable = `?array_${propertyName}`;
    //                 //     objectVariable = objectVariable.split('.').join(rdfInternals.RELATION_SEPARATOR);
    //                 //
    //                 // }
    //
    //                 triples.push({
    //                     subject: '?_id',
    //                     predicate: predicate,
    //                     object: objectVariable
    //                 });
    //
    //                 // if (arrayProperties.indexOf(propertyName) > -1) {
    //                 //     let variable = `?encoded_array_${propertyName}`;
    //                 //     variable = variable.split('.').join(rdfInternals.RELATION_SEPARATOR);
    //                 //     bindings.push({
    //                 //         type: 'bind',
    //                 //         variable: variable,
    //                 //         expression: {
    //                 //             type: 'operation',
    //                 //             operator: 'encode_for_uri',
    //                 //             args: [objectVariable]
    //                 //         }
    //                 //     });
    //                 // }
    //
    //             }
    //         }
    //     }
    //     return [{
    //         type: 'bgp',
    //         triples: triples
    //     }].concat(bindings).concat(subqueries);
    // };

    // internals.buildFilterOperation = function(operator, variable, rdfValue, predicate) {
    //     const filterOperation = {
    //         type: 'filter',
    //         expression: {
    //             type: 'operation',
    //             operator: rdfInternals.operatorMapping[operator],
    //             args: [
    //                 variable,
    //                 rdfValue
    //             ]
    //         }
    //     }
    //
    //     if (_(['$exists', '$nexists']).includes(operator)) {
    //         filterOperation.expression.args = [{
    //             type: 'bgp',
    //             triples: [{
    //                 subject: '?_id',
    //                 predicate: predicate,
    //                 object: variable
    //             }]
    //         }];
    //     }
    //     return filterOperation;
    // };

    internals.buildInnerVariableName = function(propertyName) {
        if (_.endsWith(propertyName, '._id')) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }

        return propertyName.split('.').join(rdfInternals.RELATION_SEPARATOR);
    };

    internals.buildFinalVariableName = function(propertyName) {
        return propertyName.split('.').join(rdfInternals.RELATION_SEPARATOR);
    };

    // internals.buildFilterItem = function(fieldName, propertyName, predicate, operator, rdfValue) {
    //     const filters = [];
    //     const triples = []
    //     /*
    //      * if the propertyName is present in fields,
    //      * we have to perform a FILTER on
    //      * the variable built from the fieldName
    //      */
    //     if (operator === '$eq' && !fieldName) {
    //         triples.push({
    //             subject: '?_id',
    //             predicate: predicate,
    //             object: rdfValue
    //         });
    //     } else {
    //
    //         let isArray = false;//_(arrayProperties).includes(queryField[fieldName]);
    //         let variable = internals.buildVariableName(fieldName, isArray);
    //
    //         let isExistOperator = _(['$exists', '$nexists']).includes(operator);
    //
    //         if (!fieldName && !isExistOperator) {
    //
    //             // isArray = _(arrayProperties).includes(propertyName);
    //             variable = internals.buildVariableName(propertyName, isArray);
    //
    //             triples.push({
    //                 subject: '?_id',
    //                 predicate: predicate,
    //                 object: variable
    //             });
    //
    //         /**
    //          * if it is an array and in field, we have to create a
    //          * sub variable to be able to fetch the other values in the
    //          * array
    //          */
    //         // } else if (isArray) {
    //         //     variable += '__inner';
    //         //     triples.push({
    //         //         subject: '?_id',
    //         //         predicate: predicate,
    //         //         object: variable
    //         //     });
    //         }
    //
    //         let operation = internals.buildFilterOperation(operator, variable, rdfValue, predicate);
    //         filters.push(operation)
    //     }
    //     return {triples: triples, filters: filters};
    // };

    // internals.buildFilterClause = function(modelName, queryFilter, queryField) {
    //     // let arrayProperties = internals.getArrayProperties(modelName, queryField);
    //
    //     const triples = [{
    //         subject: '?_id',
    //         predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    //         object: rdfInternals.buildClassRdfUri(modelName)
    //     }];
    //
    //     const invertedQueryFields = _.invert(queryField);
    //
    //     const filters = [];
    //
    //     for (let i = 0; i < Object.keys(queryFilter).length; i++) {
    //         let propertyName = Object.keys(queryFilter)[i];
    //         let fieldName = invertedQueryFields[propertyName];
    //         let valueObject = queryFilter[propertyName];
    //
    //         /**
    //          * if the value is not an object, use the operator $eq by default
    //          */
    //         if (!_.isObject(valueObject)) {
    //             valueObject = {'$eq': valueObject};
    //         }
    //
    //         let predicate = internals.buildPredicate(modelName, propertyName);
    //
    //         for (let operator of Object.keys(valueObject)) {
    //             let value = valueObject[operator];
    //             let rdfValue;
    //             if (_.isArray(value)) {
    //                 rdfValue = [];
    //                 for (let val of value) {
    //                     rdfValue.push(rdfInternals.buildRdfValue(modelName, propertyName, val));
    //                 }
    //             } else {
    //                 rdfValue = rdfInternals.buildRdfValue(modelName, propertyName, value);
    //             }
    //
    //             /*
    //              * if the propertyName is present in fields,
    //              * we have to perform a FILTER on
    //              * the variable built from the fieldName
    //              */
    //             if (operator === '$eq' && !fieldName) {
    //                 triples.push({
    //                     subject: '?_id',
    //                     predicate: predicate,
    //                     object: rdfValue
    //                 });
    //             } else {
    //
    //                 let isArray = false;// _(arrayProperties).includes(queryField[fieldName]);
    //                 let variable = internals.buildVariableName(fieldName, isArray);
    //
    //                 let isExistOperator = _(['$exists', '$nexists']).includes(operator);
    //
    //                 if (!fieldName && !isExistOperator) {
    //
    //                     // isArray = _(arrayProperties).includes(propertyName);
    //                     variable = internals.buildVariableName(propertyName, isArray);
    //
    //                     triples.push({
    //                         subject: '?_id',
    //                         predicate: predicate,
    //                         object: variable
    //                     });
    //
    //                 /**
    //                  * if it is an array and in field, we have to create a
    //                  * sub variable to be able to fetch the other values in the
    //                  * array
    //                  */
    //                 // } else if (isArray) {
    //                 //     variable += '__inner';
    //                 //     triples.push({
    //                 //         subject: '?_id',
    //                 //         predicate: predicate,
    //                 //         object: variable
    //                 //     });
    //                 }
    //
    //                 let operation = internals.buildFilterOperation(operator, variable, rdfValue, predicate);
    //                 filters.push(operation)
    //             }
    //
    //             // let filterItems = internals.buildFilterItem(fieldName, propertyName, predicate, operator, rdfValue);
    //             // triples = triples.concat(filterItems.triples);
    //             // filters = filters.concat(filterItems.filters);
    //         }
    //     }
    //
    //     return [{
    //         type: 'bgp',
    //         triples: triples
    //     }].concat(filters);
    // };

    // internals.buildFieldVariables = function(modelName, fields, isDistinct) {
    //     // let arrayProperties = internals.getArrayProperties(modelName, fields);
    //     const fieldVariables = [];
    //     let hasAggregator = false;
    //
    //     for (let i = 0; i < Object.keys(fields).length; i++) {
    //         let fieldName = Object.keys(fields)[i];
    //         let propertyInfos = fields[fieldName];
    //         let propertyName = propertyInfos.$property;
    //
    //         let variable = internals.buildVariableName(fieldName);
    //
    //         /**
    //          * if the propertyInfos has an aggregation operator like {$count: '_id'}
    //          */
    //
    //         const specialAggregators = ['object'];
    //         const isSpecialAggregator = _(specialAggregators).includes(propertyInfos.$aggregator);
    //
    //         if (propertyInfos.$aggregator && !isSpecialAggregator) {
    //             hasAggregator = true;
    //
    //             let expression = internals.buildVariableName(propertyInfos.$property);
    //
    //             let fieldVariable = {
    //                 expression: {
    //                     expression: expression,
    //                     type: 'aggregate',
    //                     aggregation: propertyInfos.$aggregator,
    //                     distinct: propertyInfos.distinct
    //                 },
    //                 variable: variable
    //             };
    //
    //             fieldVariables.push(fieldVariable);
    //
    //         } else {
    //
    //             /**
    //              * XXX there is currently no possibility to use an aggregator
    //              * with an array
    //              */
    //
    //             // if (arrayProperties.indexOf(propertyName) === -1) {
    //                 fieldVariables.push(variable);
    //             // }
    //         }
    //     }
    //
    //     /**
    //      * if the query has an aggregator, we skip the ?_id variable
    //      */
    //     if (hasAggregator || isDistinct) {
    //         return fieldVariables;
    //     }
    //
    //     return ['?_id'].concat(fieldVariables);
    // };

    // internals.buildArrayFieldVariables = function(modelName, propertyName) {
    //     propertyName = propertyName.split('.').join(rdfInternals.RELATION_SEPARATOR);
    //
    //     return {
    //         expression: {
    //             type: 'operation',
    //             operator: 'concat',
    //             args: [
    //                 '"[\""',
    //                 {
    //                     expression: `?encoded_array_${propertyName}`,
    //                     type: 'aggregate',
    //                     aggregation: 'group_concat',
    //                     separator: '", "',
    //                     distinct: false
    //                 },
    //                 '"\"]"'
    //             ]
    //         },
    //         variable: `?${propertyName}`
    //     };
    // };

    // internals.buildWhereClause = function(modelName, queryField, queryFilter, queryIncludes) {
    //     queryFilter = queryFilter || {};
    //     queryIncludes = queryIncludes || {};
    //
    //     let whereClause = [];
    //     if (queryFilter) {
    //         let filterClause = internals.buildFilterClause(modelName, queryFilter, queryField);
    //         whereClause = whereClause.concat(filterClause);
    //     }
    //
    //     const fieldsClause = internals.buildFields(modelName, queryField, queryFilter, queryIncludes);
    //     whereClause = whereClause.concat(fieldsClause);
    //
    //     // for (let i = 0; i < Object.keys(includes).length; i++) {
    //     //     let fieldName = Object.keys(includes)[i];
    //     //
    //     //     if (!includes[fieldName].field) { // TODO _.isEmpty()
    //     //         throw new Error(fieldName+' is included but has no field');
    //     //     }
    //     //
    //     //     let subquery = include(
    //     //         fieldName,
    //     //         'http://ceropath.org/properties/'+fieldName,
    //     //         includes[fieldName].field);
    //     //     whereClause = whereClause.concat(subquery);
    //     // }
    //
    //     return whereClause;
    // };


    // internals.buildGroupBy = function(modelName, fields) {
    //     let groupBy;
    //     let variables = internals.buildFieldVariables(modelName, fields);
    //     // let arrayProperties = internals.getArrayProperties(modelName, fields);
    //
    //     // if (arrayProperties.length) {
    //     //
    //     //     groupBy = [];
    //     //     groupBy = groupBy.concat(variables.map(function(v) {
    //     //         return {expression: v};
    //     //     }));
    //     //
    //     // } else {
    //         groupBy = [];
    //
    //         /** insert only non-aggregator variables **/
    //         for (let variable of variables) {
    //             if (!_.isObject(variable)) {
    //                 groupBy.push({expression: variable});
    //             }
    //         }
    //
    //         /** if the number of groupBy equals the number of variable,
    //          * there are no aggregators so we just have to dump the groupBy
    //          */
    //         if (groupBy.length === variables.length) {
    //             groupBy = null;
    //         }
    //     // }
    //     return groupBy;
    // };


    // internals.buildAllFieldsVariables = function(modelName, fields, isDistinct) {
    //     let fieldVariables = internals.buildFieldVariables(modelName, fields, isDistinct);
    //
    //     return fieldVariables;
    //
    //     // let arrayProperties = internals.getArrayProperties(modelName, fields);
    //     // let arrayFieldVariables = arrayProperties.map(function(prop) {
    //     //     return internals.buildArrayFieldVariables(modelName, prop);
    //     // });
    //     //
    //     // return fieldVariables.concat(arrayFieldVariables);
    // };


    // internals.buildQueryClause = function(modelName, query) {
    //     const queryField = internals.sanitizeQueryField(modelName, query.field);
    //     return {
    //         type: 'query',
    //         queryType: 'SELECT',
    //         variables: internals.buildAllFieldsVariables(modelName, queryField, query.distinct),
    //         where: internals.buildWhereClause(modelName, queryField, query.filter, query.include), //whereClause,//[filter, field, subquery, subquery2],
    //         group: internals.buildGroupBy(modelName, queryField),
    //         order: internals.buildOrderBy(query.sort, queryField),
    //         distinct: query.distinct,
    //         limit: query.limit
    //     };
    //
    // }

    /********************* new one **************/

    internals.sanitizeQueryFilter = function(modelName, queryFilters) {
        queryFilters = queryFilters || {};
        let sanitizedQueryFilters = {};

        let validOperators = Object.keys(rdfInternals.operatorMapping);
        for (let propertyName of Object.keys(queryFilters)) {
            let operations = queryFilters[propertyName];
            if (!_.isPlainObject(operations)) {
                operations = {'$eq': operations};
            }

            for (let operator of Object.keys(operations)) {
                if (!_(validOperators).includes(operator)) {
                    throw new Error(`unknown filter operator "${operator}" for property "${propertyName}"`);
                }
            }

            sanitizedQueryFilters[propertyName] = operations;
        }
        return sanitizedQueryFilters;
    }

    internals.isArrayProperty = function(modelName, propertyName, scope) {
        let isSpecialProperty = _(['_id', '_type']).includes(propertyName);
        if (!isSpecialProperty) {

            if (_.endsWith(propertyName, '._id')) {
                propertyName = propertyName.split('.').slice(0, -1).join('.');
            }

            let property = db[modelName].schema.getProperty(propertyName);
            if (!property) {
                throw new Error(`unknown ${scope} property "${propertyName}" for model "${modelName}"`);
            }

            if (property.isArray()) {
                return true;
            }
        }
        return false;
    };

    internals.findArrayProperties = function(modelName, query) {

        let arrayProperties = [];

        for (let fieldName of Object.keys(query.field)) {
            let propertyInfos = query.field[fieldName];
            let propertyName = propertyInfos.$property;
            // let isArray = internals.isArrayProperty(modelName, propertyName, 'field');
            let isArray = propertyInfos.$array;
            if (isArray) {
                arrayProperties.push(propertyName);
            }
        }

        // for (let propertyName of Object.keys(query.filter)) {
        //     let isArray = internals.isArrayProperty(modelName, propertyName, 'filter');
        //     if (isArray && !_(arrayProperties).includes(propertyName)) {
        //         arrayProperties.push(propertyName);
        //     }
        // }

        return arrayProperties;
    };


    // internals.findEmbedRelations = function(modelName, queryFields) {
    //     let embedRelations = {};
    //     console.log('-----', queryFields);
    //     for (let fieldName of Object.keys(queryFields)) {
    //         let fieldInfos = queryFields[fieldName];
    //         if (fieldInfos.$embedRelation) {
    //             console.log('!!!!', fieldName, fieldInfos);
    //             fieldName = fieldName.split('.0.').join('.')
    //             console.log('$$$', fieldName);
    //             _.set(embedRelations, fieldName, {$property: fieldInfos.$property})
    //         }
    //     }
    //     console.log('++++===', embedRelations);
    //     return embedRelations;
    // }


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

    internals.buildStatements = function(modelName, queryFields, queryAggregation) {
        let statements = {};


        /*** find all needed properties to build the statements ****/
        let propertyNames = [];
        for (let fieldName of Object.keys(queryFields)) {
            let fieldInfos = queryFields[fieldName];
            propertyNames.push(fieldInfos.$property);
            // includes the embed fields
            if (fieldInfos.$fields) {
                for (let embedFieldName of Object.keys(fieldInfos.$fields)) {
                    let embedPropertyName = fieldInfos.$fields[embedFieldName];
                    propertyNames.push(embedPropertyName);
                }
            }
        }

        for (let fieldName of Object.keys(queryAggregation)) {
            let aggregation = queryAggregation[fieldName];
            propertyNames.push(aggregation.$property);
        }


        /*** generate all subProperties in order to build variables ****/
        let subProperties = [];
        for (let propertyName of propertyNames) {
            let splitedPropertyName = propertyName.split('.');
            if (splitedPropertyName.slice(-1)[0] === '_id') {
                splitedPropertyName.pop(); // remove the '._id'
            }
            for (let i = 0; i < splitedPropertyName.length; i++) {
                let subProperty = splitedPropertyName.slice(0, i + 1).join('.');
                subProperties.push(subProperty);
            }
        }

        for (let propertyName of _.uniq(subProperties)) {
            if (propertyName === '_id') {
                continue;
            }

            let subject;
            let predicate;
            let variable = propertyName
                                .split('.')
                                .join(rdfInternals.RELATION_SEPARATOR);

            let isRelation = propertyName.split('.').length > 1;
            if (isRelation) {
                subject = propertyName.split('.').slice(0, -1).join('.');
                propertyName = propertyName.split('.').slice(-1).join('.');
                predicate = internals.buildPredicate(modelName, propertyName, subject);
            } else {
                subject = '_id';
                predicate = internals.buildPredicate(modelName, propertyName);
            }


            statements[variable] = {subject, predicate};

        }

        return statements;
    };

    internals.buildClauses = function(modelName, queryFields, queryFilters, queryAggregation) {

        let statements = internals.buildStatements(modelName, queryFields, queryAggregation);
        let filters = {};

        /***
         * build filters
         */
        let propertyNames = Object.keys(queryFilters);
        for (let propertyName of propertyNames) {

            let operations = queryFilters[propertyName];
            let variable = internals.buildInnerVariableName(propertyName);
            filters[variable] = {propertyName: propertyName, operations: []};

            for (let operator of Object.keys(operations)) {
                let value = operations[operator];
                let rdfValue;
                if (_.isArray(value)) {
                    rdfValue = value.map((v) => rdfInternals.buildRdfValue(
                        modelName, propertyName, v));
                } else {
                    rdfValue = rdfInternals.buildRdfValue(modelName, propertyName, value);
                }
                filters[variable].operations.push({operator, rdfValue});
            }
        }

        return {
            statements: statements,
            filters: filters
        };
    };

    internals.buildFilterSparson = function(variable, predicate, operator, rdfValue) {
        if (predicate === '_id') {
            return {
                type: 'filter',
                expression: {
                    type: 'operation',
                    operator: rdfInternals.operatorMapping[operator],
                    args: [`?__id`, rdfValue]
                }
            }
        }


        let patterns = [{
            type: 'bgp',
            triples: [{
                subject: '?__id',
                predicate: predicate,
                object: `?_filter_${variable}`
            }]
        }];

        /*
         * if we are only checking the existance, we don't need a filter
         */
        let filterExistance;

        if (_(['$exists', '$nexists']).includes(operator)) {

            filterExistance = rdfInternals.operatorMapping[operator];

        } else {

            filterExistance = rdfInternals.filterExistanceOperatorMapping[operator];

            if (filterExistance === 'notexists') {
                operator = rdfInternals.inverseOperatorMapping[operator];
            }

            patterns.push({
                type: 'filter',
                expression: {
                    type: 'operation',
                    operator: rdfInternals.operatorMapping[operator],
                    args: [`?_filter_${variable}`, rdfValue]
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
                    patterns: patterns
                }]
            }
        };
    };

    internals.buildOrderBy = function(sortedVariables) {

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

            variable = internals.buildInnerVariableName(variable);

            orderBy.push({
                expression: `?${variable}`,
                descending: descending
            });
        }
        return orderBy;
    };

    internals.sanitizeQuery = function(modelName, query) {
        let queryFields = internals.sanitizeQueryField(modelName, query.field);
        let queryFilters = internals.sanitizeQueryFilter(modelName, query.filter);
        let queryAggregation = internals.sanitizeQueryAggregation(modelName, query.aggregate);

        query.field = queryFields;
        query.filter = queryFilters;
        query.aggregate = queryAggregation;

        // /*** add the _id if no present in field ***/
        // let hasId = _(query.field).toPairs().find((o) => o[1].$property === '_id');
        // if (!hasId) {
        //     query.field._id = {$property: '_id'}
        // }

        /**
         * filter on the _type and add it in field if not present
         */
        // let hasType = _(query.field).toPairs().find((o) => o[1].$property === '_type');
        // if (!hasType) {
        //     query.field._type = {$property: '_type'};
        // }
        if (!_.get(query, 'filter._type')) {
            _.set(query, 'filter._type', {$eq: modelName});
        }

        return query;
    };

    internals.buildSparson = function(modelName, query) {

        query = internals.sanitizeQuery(modelName, query);

        let arrayProperties = internals.findArrayProperties(modelName, query);

        let queryFields = query.field;
        let queryFilters = query.filter;
        let queryAggregation = query.aggregate;

        let arrayPropertyFieldMapping = {};

        let selectVariables = [];
        let bindings = [];
        let groupByVariables = [];


        /*** build select variables ***/
        for (let fieldName of Object.keys(queryFields)) {
            let propertyInfos = queryFields[fieldName];
            let propertyName = propertyInfos.$property;
            let variable = internals.buildInnerVariableName(propertyName);
            if (!_(arrayProperties).includes(propertyName)) {
                let finalVariable = internals.buildFinalVariableName(fieldName);
                selectVariables.push({
                    expression: `?_${variable}`,
                    variable: `?${finalVariable}`
                });
                groupByVariables.push({expression: `?_${variable}`});
            } else {
                arrayPropertyFieldMapping[propertyName] = fieldName;
            }
        }

        /*** build object concatenation statements  ****/
        for (let fieldName of Object.keys(queryFields)) {
            let fieldInfos = queryFields[fieldName];

            /** if there is no $fields, it is not a deep relation **/
            if (!fieldInfos.$fields) {
                continue;
            }

            let variable = internals.buildFinalVariableName(fieldInfos.$property);

            let binding = {
                type: 'bind',
                variable: `?_encoded_${variable}`,
                expression: {
                    type: 'operation',
                    operator: 'concat',
                    args: []
                }
            }

            let bindingArgs = ['"{"']

            let embedFieldNames = Object.keys(fieldInfos.$fields);
            for (let i = 0; i < embedFieldNames.length; i++) {
                let embedFieldName = embedFieldNames[i];
                let embedPropertyName = fieldInfos.$fields[embedFieldName];

                console.log('....', fieldName, embedFieldName, embedPropertyName);
                let embedVariable = internals.buildInnerVariableName(embedPropertyName);
                bindingArgs.push(`"\"${embedFieldName}\":\""`); // name, sex
                bindingArgs.push({
                    type: 'operation',
                    operator: 'encode_for_uri',
                    args: [{
                        type: 'operation',
                        operator: 'str',
                        args: [`?_${embedVariable}`] //?_credits____gender"
                    }]
                });

                let isLastItem = i >= embedFieldNames.length - 1;
                console.log(i, embedFieldNames.length, isLastItem);
                if (!isLastItem) {
                    bindingArgs.push('"\","');
                }
            }

            bindingArgs.push('"\"}"');
            binding.expression.args = bindingArgs;
            bindings.push(binding);
        }

        /*** build select variables from array properties ****/
        let selectArrayVariables = [];
        for (let propertyName of arrayProperties) {
            let variable = internals.buildInnerVariableName(propertyName);
            let fieldName = arrayPropertyFieldMapping[propertyName];
            let finalVariable = internals.buildFinalVariableName(fieldName);


            let quote = '\"';
            let isJsonObject = queryFields[fieldName].$fields
            if (isJsonObject) {
                /** we don't have to quote  json object **/
                quote = '';
            }

            selectVariables.push({
                expression: {
                    type: 'operation',
                    operator: 'concat',
                    args: [
                        `"[${quote}"`,
                        {
                            expression: `?_encoded_${variable}`,
                            type: 'aggregate',
                            aggregation: 'group_concat',
                            distinct: true,
                            separator: `${quote}, ${quote}`
                        },
                        `"${quote}]"`
                    ]
                },
                variable: `?${finalVariable}`
            });

            /** skip the bindings if we are dealing with an embed array of object
             * the concatenation has been already done
             */
            if (!queryFields[fieldName].$fields) {
                bindings.push({
                    type: 'bind',
                    variable: `?_encoded_${variable}`,
                    expression: {
                        type: 'operation',
                        operator: 'encode_for_uri',
                        args: [{
                            type: 'operation',
                            operator: 'str',
                            args: [`?_${variable}`]
                        }]
                    }
                });
            }
        }


        /*** build aggregation variables ***/
        let aggregations = Object.keys(queryAggregation);
        if (aggregations.length) {
            for (let fieldName of aggregations) {
                let aggregationInfo = queryAggregation[fieldName];
                let propertyName = aggregationInfo.$property;
                let variable = internals.buildInnerVariableName(propertyName);
                let finalVariable = internals.buildFinalVariableName(fieldName);
                selectVariables.push({
                    expression: {
                        expression: `?_${variable}`,
                        type: 'aggregate',
                        aggregation: aggregationInfo.$aggregator,
                        distinct: aggregationInfo.distinct
                    },
                    variable: `?${finalVariable}`
                });
            }
        }

        let clauses = internals.buildClauses(modelName, queryFields, queryFilters, queryAggregation);


        /*** build statements ***/
        let triples = []
        for (let variable of Object.keys(clauses.statements)) {
            let statement = clauses.statements[variable];
            triples.push({
                subject: `?_${statement.subject}`,
                predicate: statement.predicate,
                object: `?_${variable}`
            });
        }

        triples = {
            type: 'bgp',
            triples: triples
        };


        /*** build filters *****/
        let filters = [];
        for (let variable of Object.keys(clauses.filters)) {
            let {propertyName, operations} = clauses.filters[variable];

            let predicate;
            if (propertyName === '_id') {
                predicate = '_id';
            } else {
                predicate = internals.buildPathPredicate(modelName, propertyName);
            }

            for (let clauseFilter of operations) {
                let {operator, rdfValue} = clauseFilter;
                let sparsonFilter = internals.buildFilterSparson(
                    variable,
                    predicate,
                    operator,
                    rdfValue
                );

                filters.push(sparsonFilter);
            }
        }


        return {
            type: 'query',
            queryType: 'SELECT',
            variables: selectVariables,
            where: [triples].concat(filters).concat(bindings),
            group: groupByVariables,
            order: internals.buildOrderBy(query['sort']),
            distinct: query.distinct,
            limit: query.limit
        };
    };

    return {
        build: function(modelName, query) {

            internals.validateQuery(query);

            let sparson = internals.buildSparson(modelName, query);
            sparson.from = {
                'default': [graphUri]
            };
            console.dir(sparson, {depth: 10});
            let sparql = new SparqlGenerator().stringify(sparson);
            // console.log('========================');
            // console.log(sparql);
            // console.log('========================');

            return sparql;

            // let sparson = internals.buildQueryClause(modelName, query);
            // sparson.from = {
            //     'default': [graphUri]
            // };
            //
            //
            // console.dir(sparson, {depth: 10});
            // console.log();
            // console.log();
            // console.log();
            //
            //
            // return new SparqlGenerator().stringify(sparson);
        }
    };
};



var clauses = {
    statements: {
        title: {subject: '_id', predicate: 'http://.../title'},
        credits: {subject: '_id', predicate: 'http://.../credits'},
        credits____name: {subject: 'credits', predicate: 'http://.../name'},
        credits____gender: {subject: 'credits', predicated: 'http//../gender'},
        ratting: {subject: '_id', predicate: 'http://.../ratting'}
    },
    filters: {
        ratting: [{rdfValue: 3, operator: '>'}, {rdfValue: 5, operator: '<'}]
    },
    subqueries: []
    // binds: {
        // creditedUser: {operator: 'concat', args: ['{"name":"', '<ratting>']}
    // }
}