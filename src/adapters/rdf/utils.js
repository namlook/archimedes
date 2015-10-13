
import _ from 'lodash';
import {Util as N3Util} from 'N3';
import {ValidationError} from '../../errors';
import moment from 'moment';

export var classRdfUri = function(modelClass) {
    return modelClass.meta.classRdfUri;
};

export var instanceRdfUri = function(modelClass, id) {
    return `${modelClass.meta.instanceRdfPrefix}/${id}`;
};

export var propertyRdfUri = function(modelClass, propertyName) {
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


export var propertyName2Sparson = function(modelClass, propertyNames) {
    let modelSchema = modelClass.schema;
    let db = modelClass.db;

    let items = propertyNames.split('.').map((propertyName) => {

        let property = modelSchema.getProperty(propertyName);

        if (property.isRelation()) {
            modelSchema = db[property.type].schema;
        }


        if (property.isReversed()) {

            property = property.fromReversedProperties();

            let propertyUris = _.uniq(property.map((o) => o.meta.rdfUri));
            if (propertyUris.length > 1) {
                propertyUris = {
                    type: 'path',
                    pathType: '|',
                    items: propertyUris
                };
            }

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


export var buildRdfValue = function(db, modelType, propertyName, value) {
    var modelClass = db[modelType];

    if (propertyName === '_type') {
        return classRdfUri(modelClass);
    }

    var rdfValue;
    if (_.has(value, '_id') && _.has(value, '_type')) {
        rdfValue = instanceRdfUri(db[value._type], value._id);
    } else {
        let propertyType = modelClass.schema.getProperty(propertyName).type;
        if (_.contains(['date', 'datetime'], propertyType)) {
            rdfValue = N3Util.createLiteral(moment(value).toISOString(), 'http://www.w3.org/2001/XMLSchema#dateTime');
        } else {
            rdfValue = N3Util.createLiteral(value);
        }
    }

    return rdfValue;
};

export var uri2id = function(modelClass, uri) {
    let id = uri.replace(modelClass.meta.instanceRdfPrefix, '');
    return _.trim(id, '/');
};

export var uri2property = function(modelClass, uri) {
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
        return '_type';
    }
    return modelClass.meta.propertyUrisMapping[uri];
};

export var operation2triple = function(db, modelType, uri, operation) {
    let modelClass = db[modelType];

    let {property, value} = operation;

    let propertyUri = propertyRdfUri(modelClass, property);
    let rdfValue = buildRdfValue(db, modelType, property, value);

    return {
        subject: uri,
        predicate: propertyUri,
        object: rdfValue
    };
};


export var rdfDoc2pojo = function(db, modelType, rdfDoc) {
    var modelClass = db[modelType];

    var pojo = {};
    _.forOwn(rdfDoc, (rdfValues, rdfProperty) => {

        if (rdfProperty === '_id') {
            pojo._id = uri2id(modelClass, rdfValues);
            return;
        }

        let propertyName = uri2property(modelClass, rdfProperty);

        if (propertyName == null) {
            // console.log(`WARNING ! ${rdfProperty} not found in ${modelType}'s schema`);
            return;
        }

        let property = modelClass.schema.getProperty(propertyName);


        if (propertyName === '_type') {
            pojo._type = modelClass.name;
            return;
        }

        var values = [];
        var isRelation = property.isRelation();
        rdfValues.forEach(function(rdfValue) {
            if (isRelation) {
                let relationType = property.type;
                let relationId = uri2id(db[relationType], rdfValue);
                values.push({_id: relationId, _type: relationType});
            } else {
                values.push(rdfValue);
            }
        });


        // Virtuoso hack: convert integer as boolean
        if (property.type === 'boolean' && values.length) {
            values = values.map((value) => {
                if (_.isNumber(value)) {
                    return Boolean(value);
                }
                return value;
            });
        }

        var value;
        if (!property.isArray()) {
            value = values[0];
        } else {
            if (isRelation) {
                value = _.sortBy(values, '_id');
            } else {
                value = _.sortBy(values);
            }
        }

        pojo[propertyName] = value;
    });

    return pojo;
};


export var pojo2triples = function(db, modelType, pojo) {
    var modelClass = db[modelType];

    var triples = [];

    let instanceUri = instanceRdfUri(modelClass, pojo._id);

    let classUri = classRdfUri(modelClass);
    triples.push({
        subject: instanceUri,
        predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        object: classUri
    });

    _.forOwn(pojo, (values, propertyName) => {

        if (_.contains(['_id', '_type'], propertyName)) {
            return;
        }

        if (!_.isArray(values)) {
            values = [values];
        }

        for (let i = 0; i < values.length; i++) {
            let value = values[i];

            let propertyUri = propertyRdfUri(modelClass, propertyName);
            let rdfValue = buildRdfValue(db, modelType, propertyName, value);

            triples.push({
                subject: instanceUri,
                predicate: propertyUri,
                object: rdfValue
            });
        }
    });

    return triples;
};



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


export var query2whereClause = function(db, modelType, query, options) {
    var modelClass = db[modelType];

    var filters = [];
    var triples = [];
    var orderBy = [];
    var sorting = {};

    _.get(options, 'sort', []).forEach((propertyName) => {
        if (!propertyName) {
            return;
        }

        let descending = false;
        if (propertyName[0] === '-') {
            propertyName = _.trim(propertyName, '-');
            descending = true;
        }
        sorting[propertyName] = {
            descending: descending
        };
    });

    _.forOwn(query, (object, propertyName) => {

        var variableIdx = 0;
        var variable;

        if (propertyName === '_type') {
            variable = `?_type${variableIdx++}`;
        } else {
            variable = `?${_.camelCase(propertyName)}${variableIdx++}`;
        }


        if (sorting[propertyName]) {
            sorting[propertyName].expression = variable;
        }

        let idAsValue = false;
        let predicate, propertyUri;

        if (_.contains(propertyName, '.')) {
            if (_.endsWith(propertyName, '._id')) {
                propertyName = propertyName.split('.').slice(0, -1).join('.');
                let property = modelClass.schema.getProperty(propertyName);
                if (!property.isRelation()) {
                    throw new ValidationError('Bad query', `${propertyName}._id not found on model ${modelClass.name}: ${propertyName} is not a relation`);
                }
                idAsValue = true;
            }
            propertyUri = propertyRdfUri(modelClass, propertyName);
            predicate = propertyName2Sparson(modelClass, propertyName);
        } else {
            propertyUri = propertyRdfUri(modelClass, propertyName);
            predicate = propertyUri;
        }

        let triple = {
            subject: '?s',
            predicate: predicate,
            object: variable
        };

        triples.push(triple);

        /**
         * if object is... well, an object, then there is operators
         */
        if (!_.isObject(object) || _.isDate(object)) {
            object = {$eq: object};
        }

        /**
         * build values filter
         */
        _.forOwn(object, (value, operator) => {

            /** build the rdf value **/
            let rdfValue;
            let relationProperty = modelClass.schema.getProperty(propertyName);

            if (_.isArray(value)) {

                if (idAsValue) {
                    rdfValue = value.map((item) => {
                        return instanceRdfUri(db[relationProperty.type], item);
                    });
                } else {
                    rdfValue = value.map((item) => {
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


            let filter = {
                type: 'operation',
                operator: operatorsMapping[operator]
            };


            let property = db[modelType].schema.getProperty(propertyName);
            let isDate = false;
            if (property) {
                isDate = _.contains(['date', 'datetime'], property.type);
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

                value = moment(value).toISOString();
                filter.args = [
                    variable,
                    {
                        type: 'functionCall',
                        function: 'http://www.w3.org/2001/XMLSchema#dateTime',
                        args: [`"${value}"`],
                        distinct: false
                    }
                ];

            } else {

                filter.args = [
                    variable, rdfValue
                ];

            }

            if (operator === '$iregex') {
                filter.args.push('"i"');
            }

            filters.push(filter);
        });

    });

    _.forOwn(sorting, (order, propertyName) => {
        if (!order.expression) {
            order.expression = `?${propertyName}OrderBy`;
            let propertyUri;
            try {
                propertyUri = propertyRdfUri(modelClass, propertyName);
            } catch(err) {
                throw new ValidationError('malformed options', err);
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
        whereClause: [
            {
                type: 'bgp',
                triples: triples
            },
            {
                type: 'filter',
                expression: {
                    type: 'operation',
                    operator: '&&',
                    args: filters
                }
            }
        ]
    };
};


export var constructTriples = function(modelClass, uri, options) {

    if (options.variableIndex == null) {
        options.variableIndex = '';
    }
    options.fields = options.fields || [];
    if (typeof options.fields === 'string') {
        options.fields = options.fields.split(',');
    }

    let triples = [];
    if (options.fields.length) {
        var variableIdx = 0;

        triples = options.fields.map((propertyName) => {

            let variable = `?${_.camelCase(propertyName)}${options.variableIndex}o${variableIdx++}`;

            let propertyUri;
            try {
                propertyUri = propertyRdfUri(modelClass, propertyName);
            } catch(err) {
                throw new ValidationError('malformed options', err);
            }

            return {
                subject: uri,
                predicate: propertyUri,
                object: variable
            };
        });

        triples.push({
            subject: uri,
            predicate: propertyRdfUri(modelClass, '_type'),
            object: '?_type'
        });


    } else {
        triples.push({
            subject: uri,
            predicate: `?p${options.variableIndex}`,
            object: `?o${options.variableIndex}`
        });
    }

    if (options.variableIndex !== '') {
        options.variableIndex++;
    }

    return triples;
};


export var deleteCascade = function(db, _modelType, uri) {
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
            _inner = deleteCascade(db, propagateDeletionType, variable);
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


// export var query2sparql = function(db, modelType, query, options) {
//     var sparson = query2sparson(db, modelType, query);
//     var generator = new SparqlGenerator();
//     return generator.stringify(sparson);
// };
