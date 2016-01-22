
import _ from 'lodash';
import {Util as N3Util, Writer as n3writer} from 'n3';
import {ValidationError} from '../../errors';
import moment from 'moment';
import es from 'event-stream';

export let classRdfUri = function(modelClass) {
    return modelClass.meta.classRdfUri;
};

export let instanceRdfUri = function(modelClass, id) {
    return `${modelClass.meta.instanceRdfPrefix}/${id}`;
};

export let propertyRdfUri = function(modelClass, propertyName) {
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


export let propertyName2Sparson = function(modelClass, propertyNames) {
    let modelSchema = modelClass.schema;
    let db = modelClass.db;

    let items = propertyNames.split('.').map((propertyName) => {

        let property = modelSchema.getProperty(propertyName);

        if (property.isRelation()) {
            modelSchema = db[property.type].schema;
        }


        if (property.isInverseRelationship()) {

            property = property.getPropertyFromInverseRelationship();

            // let propertyUris = _.uniq(property.map((o) => o.meta.rdfUri));
            // if (propertyUris.length > 1) {
            //     propertyUris = {
            //         type: 'path',
            //         pathType: '|',
            //         items: propertyUris
            //     };
            // }

            let propertyUris = [property.meta.rdfUri];

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


export let buildRdfValue = function(db, modelType, propertyName, value) {
    let modelClass = db[modelType];

    if (propertyName === '_type') {
        return classRdfUri(modelClass);
    }

    let rdfValue;
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

export let uri2id = function(modelClass, uri) {
    let id = uri.replace(modelClass.meta.instanceRdfPrefix, '');
    return _.trim(id, '/');
};

export let uri2property = function(modelClass, uri) {
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
        return '_type';
    }
    return modelClass.meta.propertyUrisMapping[uri];
};

export let operation2triple = function(db, modelType, uri, operation) {
    let modelClass = db[modelType];

    let {property, value} = operation;

    /*** if the value is undefined, this means that there is no previous
     * value set so we do nothing
     */
    if (value === undefined) {
        return undefined;
    }

    let propertyUri = propertyRdfUri(modelClass, property);
    let rdfValue = buildRdfValue(db, modelType, property, value);

    return {
        subject: uri,
        predicate: propertyUri,
        object: rdfValue
    };
};


export let rdfDoc2pojo = function(db, modelType, rdfDoc) {
    let modelClass = db[modelType];

    let pojo = {};
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

        let values = [];
        let isRelation = property.isRelation();
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
            values = values.map((val) => {
                if (_.isNumber(val)) {
                    return Boolean(val);
                }
                return val;
            });
        }

        let value;
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


export let pojo2triples = function(db, modelType, pojo) {
    let modelClass = db[modelType];

    let triples = [];

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


export let query2whereClause = function(db, modelType, query, options) {
    let modelClass = db[modelType];

    let filters = [];
    let triples = [];
    let orderBy = [];
    let sorting = {};

    if (query._id) {
        let instanceUri = instanceRdfUri(modelClass, query._id);
        filters.push({
            type: 'operation',
            operator: '=',
            args: ['?s', instanceUri]
        });
        delete query._id;
    }

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

        let variableIdx = 0;
        let variable;

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


        /**
         * if object is... well, an object, then there is operators
         */
        if (!_.isObject(object) || _.isDate(object)) {
            object = {$eq: object};
        }


        let skipTriple = false;

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
                    skipTriple = true;
                    filter.operator = 'notexists';
                    filter.args = [{
                        type: 'bgp',
                        triples: [{
                            subject: '?s',
                            predicate: predicate,
                            object: variable
                        }]
                    }];
                } else {
                    /** if the value is true, we don't need to populate
                     * a filter as the triple will be added
                     */
                    return;
                }

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

        if (!skipTriple) {
            triples.push(triple);
        }

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

let _constructTriple = function(modelClass, uri, options, useOptional) {
    if (options.variableIndex == null) {
        options.variableIndex = '';
    }
    options.fields = options.fields || [];
    if (typeof options.fields === 'string') {
        options.fields = options.fields.split(',');
    }

    let triples = [];
    if (options.fields.length) {
        let variableIdx = 0;

        triples = options.fields.map((propertyName) => {

            let variable = `?${_.camelCase(propertyName)}${options.variableIndex}o${variableIdx++}`;

            let propertyUri;
            try {
                propertyUri = propertyRdfUri(modelClass, propertyName);
            } catch(err) {
                throw new ValidationError('malformed options', err);
            }

            let _triple = {
                subject: uri,
                predicate: propertyUri,
                object: variable
            };

            if (useOptional) {
                return {
                    type: 'optional',
                    patterns: [{
                        type: 'bgp',
                        triples: [_triple]
                    }]
                };
            } else {
                return _triple;
            }
        });


        let _typeTriple = {
            subject: uri,
            predicate: propertyRdfUri(modelClass, '_type'),
            object: '?_type'
        };

        if (useOptional) {
            triples.push({
                type: 'bgp',
                triples: [_typeTriple]
            });
        } else {
            triples.push(_typeTriple);
        }


    } else {
        let _triple = {
            subject: uri,
            predicate: `?p${options.variableIndex}`,
            object: `?o${options.variableIndex}`
        };

        if (useOptional) {
            triples.push({
                type: 'bgp',
                triples: [_triple]
            });
        } else {
            triples.push(_triple);
        }

    }

    // if (options.variableIndex !== '') {
    //     options.variableIndex++;
    // }

    return triples;
};

export let constructTriples = function(modelClass, uri, options) {
    return _constructTriple(modelClass, uri, options, false);
};

export let constructWhereTriples = function(modelClass, uri, options) {
    return _constructTriple(modelClass, uri, options, true);
};



export let deleteCascade = function(db, _modelType, uri) {
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


    for (let prop of deleteProps) {

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

        if (prop.isInverseRelationship()) {
            prop = prop.getPropertyFromInverseRelationship();
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

    }

    return {deleteTriples, whereClause};
};

export let instance2triples = function(instance, graphUri){
    let {Model} = instance;
    let triples = [];

    let subject = instanceRdfUri(Model, instance._id);

    triples.push({
        subject: subject,
        predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        object: Model.meta.classRdfUri,
        graph: graphUri
    });

    let properties = instance.Model.schema._properties;
    for (let propertyName of Object.keys(properties)) {
        let property = properties[propertyName];
        let value = instance.get(propertyName);

        if (value != null) {
            let predicate = propertyRdfUri(Model, propertyName);
            if (_.isArray(value)) {
                if (property.isArray()) {
                    for (let val of value) {
                        let object = buildRdfValue(Model.db, Model.name, propertyName, val);
                        triples.push({
                            subject: subject,
                            predicate: predicate,
                            object: object,
                            graph: graphUri
                        });
                    }
                } else {
                    throw new Error(`${Model.name}.${propertyName} is not an array but got: ${value}`);
                }
            } else {
                let object = buildRdfValue(Model.db, Model.name, propertyName, value);
                triples.push({
                    subject: subject,
                    predicate: predicate,
                    object: object,
                    graph: graphUri
                });
            }
        }
    }
    return triples;
};

/** convert an Archimedes instance into a pojo **/
export let rdfStreamWriter = function(graphUri) {
    return es.map((instance, callback) => {
        let writer = n3writer({format: 'application/trig' });
        // let triples = instance2triples(instance, graphUri);
        for (let triple of instance2triples(instance, graphUri)) {
            writer.addTriple(triple);
        }
        writer.end((error, results) => {
            if (error) {
                return callback(error);
            }
            callback(null, results);
        });
        // callback(null, triples);
    });//.pipe(writer);
};

/** convert a pojo into an Archimedes instance **/
export let instanceStreamWriter = function(db, resourceName) {
    let Model = db[resourceName];

    if (!Model) {
        throw new Error(`unknown model: ${resourceName}"`);
    }

    return es.map((data, callback) => {
        let obj = {};
        for (let propertyName of Object.keys(data)) {
            if (data[propertyName] !== '' && data[propertyName] != null) {
                if (propertyName !== '_id' && propertyName !== '_type') {
                    let property = Model.schema.getProperty(propertyName);
                    let value = data[propertyName];
                    if (property.isArray()) {
                        value = data[propertyName].split('|');
                    }
                    if (property.isRelation()) {
                        if (property.isArray()) {
                            let ids = [];
                            for (let id of value) {
                                ids.push({
                                    _id: id,
                                    _type: property.type
                                });
                            }
                            obj[propertyName] = ids;
                            // obj[propertyName] = value.map((id) => {
                            //     return {
                            //         _id: id,
                            //         _type: property.type
                            //     };
                            // });
                        } else {
                            obj[propertyName] = {
                                _id: value,
                                _type: property.type
                            };
                        }
                    } else {
                        obj[propertyName] = value;
                    }
                } else {
                    obj[propertyName] = data[propertyName];
                }
            }
        }
        db.validate(Model.name, obj).then((attrs) => {
            let instance = Model.wrap(attrs);
            callback(null, instance);
        }).catch((error) => {
            callback(error);
        });
    });
};

// export let query2sparql = function(db, modelType, query, options) {
//     let sparson = query2sparson(db, modelType, query);
//     let generator = new SparqlGenerator();
//     return generator.stringify(sparson);
// };
