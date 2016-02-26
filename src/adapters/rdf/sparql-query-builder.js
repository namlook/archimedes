
import _ from 'lodash';
import {Util as N3Util} from 'n3';
import moment from 'moment';

let SparqlGenerator = require('sparqljs').Generator;

module.exports = function(db, graphUri) {

    let internals = {};
    let rdfInternals = {};

    rdfInternals.RELATION_SEPARATOR = '____';

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

    /**
     * returns the list of properties fieldName whose property
     * is an array
     */
    internals.getArrayProperties = function(modelName, fields) {
        let modelClass = db[modelName];
        let modelSchema = modelClass.schema;
        let arrayProperties = [];
        for (let fieldName of Object.keys(fields)) {
            let propertyName = fields[fieldName];
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
            let propertyName = fields[fieldName];

            let shouldAddVariable = (
                !(includes && includes[fieldName])
                // && !(filter && filter[fieldName])
            );

            let predicate;
            if(shouldAddVariable) {
                predicate = internals.buildPredicate(modelName, propertyName);
                let objectVariable = `?${fieldName}`;

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

    internals.buildFilterOperation = function(variable, operator, rdfValue) {
        return {
            'type': 'filter',
            'expression': {
                'type': 'operation',
                'operator': rdfInternals.operatorMapping[operator],
                'args': [
                    variable,
                    rdfValue
                ]
            }
        };
    };

    internals.buildVariableName = function(propertyName, isArray) {
        let arrayPrefix = '';
        if (isArray) {
            arrayPrefix = 'array_';
        }
        let variable = `?${arrayPrefix}${propertyName}`;

        return variable.split('.').join(rdfInternals.RELATION_SEPARATOR);
    };

    internals.buildFilter = function(modelName, queryFilter, queryField) {
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
                let fieldName = invertedQueryFields[propertyName];
                if (operator === '$eq' && !fieldName) {
                    triples.push({
                        subject: '?_id',
                        predicate: predicate,
                        object: rdfValue
                    });
                } else {

                    let isArray = _(arrayProperties).includes(queryField[fieldName]);
                    let variable = internals.buildVariableName(fieldName, isArray);

                    if (!fieldName) {

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

                    let operation = internals.buildFilterOperation(variable, operator, rdfValue);
                    filters.push(operation);

                }
            }
        }

        return [{
            type: 'bgp',
            triples: triples
        }].concat(filters);
    };

    internals.buildFieldVariables = function(modelName, fields) {
        let arrayProperties = internals.getArrayProperties(modelName, fields);
        let fieldVariables = [];

        for (let i = 0; i < Object.keys(fields).length; i++) {
            let fieldName = Object.keys(fields)[i];
            let propertyName = fields[fieldName];
            if (arrayProperties.indexOf(propertyName) === -1) {
                fieldVariables.push(`?${fieldName}`);
            }
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
            let filterClause = internals.buildFilter(modelName, queryFilter, queryField);
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
        let arrayProperties = internals.getArrayProperties(modelName, fields);
        if (arrayProperties.length) {
            groupBy = [];
            let variables = internals.buildFieldVariables(modelName, fields);
            groupBy = groupBy.concat(variables.map(function(v) {
                return {expression: v};
            }));
        }
        return groupBy;
    };


    internals.buildAllFieldsVariables = function(modelName, fields) {
        let arrayProperties = internals.getArrayProperties(modelName, fields);
        let fieldVariables = internals.buildFieldVariables(modelName, fields);

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

            let sparson = {
                type: 'query',
                from: {
                    'default': [graphUri] // TODO
                },
                queryType: 'SELECT',
                variables: internals.buildAllFieldsVariables(modelName, query.field),
                where: internals.buildWhereClause(modelName, query.field, query.filter, query.include), //whereClause,//[filter, field, subquery, subquery2],
                group: internals.buildGroupBy(modelName, query.field),
                order: internals.buildOrderBy(query.sort, query.field),
                limit: query.limit
            };


            console.log(sparson);
            console.log();
            console.log();
            console.log();


            return new SparqlGenerator().stringify(sparson);
        }
    };
};
