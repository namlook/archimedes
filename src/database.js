
import _ from 'lodash';
import uuid from 'uuid';
import modelFactory from './model';
import {ValidationError, StructureError} from './errors';
import queryValidator from './query-validator';
import {findOptionsValidator} from './options-validator';
import groupByValidator from './group-by-validator';
import operationsValidator from './operations-validator';

const validPropertyTypes = [
    'string',
    'number',
    'boolean',
    'date',
    'array'
];

const validAggregationOperators = [
    '$count',
    '$max',
    '$min',
    '$avg',
    '$sum',
    '$concat'
];

import Promise from 'bluebird';
// import csvStream from 'csv-stream';
import csv from 'csv';
import es from 'event-stream';
import csvtojson from 'csvtojson';

import highland from 'highland';
import _fp from 'lodash/fp';

import queryValidation from './validators/query';

export default function(dbAdapter, config) {

    if (!dbAdapter) {
        throw new Error('database: no adapter found');
    }

    let inner = {
        _archimedesDatabase: true,
        config: config,
        modelSchemas: null,
        registeredModels: {},
        _modelsByPlural: {},
        _modelStructures: {},
        _propertiesMap: {},

        /**
         * Hooks fired before the register() method.
         *
         * Its main purpose is to register the model definitions
         * into the database so the model classes can be accessible
         * from the database: `db.MyModel`.
         *
         * @params {Object} - the models to register
         * @returns a promise which resolve into the database
         */
        beforeRegister(models) {
            return new Promise((resolve, reject) => {

                _.forOwn(models, (modelConfig, modelName) => {

                    /** if the property config is a string, convert it into a valid config **/
                    _.forOwn(modelConfig.properties, (propConfig, propName) => {
                        if (typeof propConfig === 'string') {
                            propConfig = {type: propConfig};
                        }
                        if (propConfig.type === 'array') {
                            if (!propConfig.items) {
                                return reject(new StructureError(`${modelName} if property's type is "array" then "items" should be specified (properties.${propName})`));
                            }

                            if (typeof propConfig.items === 'string') {
                                propConfig.items = {type: propConfig.items};
                            }
                        } else if (!_.includes(validPropertyTypes, propConfig.type)) {
                            if (!models[propConfig.type]) {
                                return reject(new StructureError(`Invalid type for property "${modelName}.${propName}"`));
                            }
                        }

                        if (propConfig.reverse) {
                            if (typeof propConfig.reverse === 'string') {
                                let propConfigType = propConfig.type;
                                if (propConfigType === 'array') {
                                    propConfigType = propConfig.items.type;
                                }
                                propConfig.reverse = {
                                    type: propConfigType,
                                    name: propConfig.reverse
                                };
                                modelConfig.properties[propName] = propConfig;
                            }
                        }
                        modelConfig.properties[propName] = propConfig;
                    });
                });


                return resolve(this.adapter.beforeRegister(models));
            });
        },

        /**
         * Hooks fired after the register() method
         *
         * @params {Object} - the database
         * @returns a promise which resolve into the database
         */
        afterRegister(db) {
            return this.adapter.afterRegister(db);
        },


        /**
         * Register the models to the database.
         *
         * @params {Object} - {modelType: modelConfig}
         */
        register(models) {
            return this.beforeRegister(models).then((processedModels) => {
                this.modelSchemas = processedModels; // TODO remove ??

                for (let name of Object.keys(processedModels)) {
                    let modelConfig = processedModels[name];
                    this._modelStructures[name] = processedModels[name];
                    this[name] = modelFactory(this, name, modelConfig);
                    this.registeredModels[name] = this[name];
                    this._modelsByPlural[this[name].meta.names.plural] = this[name];
                }

                this.__checkInverseRelationships();
                this.__buildPropertiesCache();
                return this;
            }).then((db) => {
                return this.afterRegister(db);
            });
        },


        __checkInverseRelationships() {
            for (let name of Object.keys(this.registeredModels)) {
                let model = this.registeredModels[name];

                let inverseRelationships = model.schema._inverseRelationships;
                for (let relationName of Object.keys(inverseRelationships)) {
                    let relationConf = inverseRelationships[relationName];
                    let targetProperty = relationConf.config.abstract.fromReverse.property;

                    if (!this[relationConf.type].schema._properties[targetProperty]) {
                        throw new StructureError(`unknown property "${targetProperty}" for model "${relationConf.type}" in the inverse relationship: ${name}.${relationName}`);
                    }
                }
            }
        },

        __buildPropertiesCache() {
            let models = _.values(this.registeredModels);
            for (let model of models) {
                let properties = model._structure.properties || {};
                for (let propName of Object.keys(properties)) {
                    let property = model.schema._properties[propName];
                    this._propertiesMap[property.name] = this._propertiesMap[property.name] || [];
                    this._propertiesMap[property.name].push(property);
                }

                let inverseRelationships = model._structure.inverseRelationships || {};
                for (let propName of Object.keys(inverseRelationships)) {
                    let property = model.schema._inverseRelationships[propName];
                    this._propertiesMap[property.name] = this._propertiesMap[property.name] || [];
                    this._propertiesMap[property.name].push(property);
                }
            }
        },

        /**
         * Returns the model related to its plural name
         *
         * @params {string} - the plural name
         * @returns the model class
         */
        getModelFromPlural(pluralName) {
            return this._modelsByPlural[pluralName];
        },

        /**
         * Generate a uniq string which will be use as model id
         *
         * @returns {string} - the model id
         */
        buildModelId() {
            return uuid.v4();
            // let now = new Date();
            // let rand = Math.floor(Math.random() * 10000);
            // return parseInt(rand).toString(36) + parseInt(now.getTime()).toString(36);
        },


        /**
         * Remove all records in database
         *
         * @returns a promise
         */
        clear: function() {
            return this.adapter.clear();
        },

        importStream: function(arrayOrStreamOfPojos) {
            const that = this;

            const through = highland.pipeline(
                highland.map(_fp.omitBy(_.isNull)),
                highland.flatMap((o) => highland(that.validatePojo(o))),
                that.adapter.importStream()
                // highland.map((o) => {console.log(o); return o;})
            );

            return arrayOrStreamOfPojos
                ? highland(arrayOrStreamOfPojos).pipe(through)
                : highland.pipeline(through);
        },

        importCsvStream: function(options) {

            options = _.defaultsDeep(options, {
                modelName: undefined,
                csv: {
                    delimiter: ',',
                    escapeChar: '"',
                    enclosedChar: '"',
                    arraySeparator: ','
                }
            });

            const that = this;

            const _normalizePojo = function(item) {
                const modelName = item._type;
                const modelClass = that[modelName];
                if (!modelClass) {
                    throw new Error(`unknown model "${modelName}" in property _type`);
                }
                const modelSchema = modelClass.schema;

                return _(item)
                    .toPairs()
                    .map(([propertyName, value]) => {
                        if (_.includes(['_id', '_type'], propertyName)) {
                            return [propertyName, value];
                        }
                        let property = modelSchema.getProperty(propertyName);

                        // const _convertValue = function(_value) {
                        //     return property.isRelation()
                        //         ? {_id: _value, _type: property.type}
                        //         : _value;
                        // }

                        value = property.isArray()
                            ? value.split(options.csv.arraySeparator) //.map(_convertValue)
                            : value; //_convertValue(value);

                        return [propertyName, value];
                    })
                    .fromPairs()
                    .value();
            };

            const _ensureTypeProperty = function(item) {
                item._type = item._type || options.modelName;
                if (!item._type) {
                    throw new Error('unknown _type');
                }
                return item;
            };

            return highland.pipeline(
                csvStream.createStream(options.csv),
                highland.filter(_fp.get('_id')),
                highland.map(_fp.omitBy(highland.not)),
                highland.map(_ensureTypeProperty),
                highland.map(_normalizePojo),
                highland.flatMap((o) => highland(that.validatePojo(o))),
                that.adapter.importStream()
            );
        },

        csv2pojoStream: function(csvOptions) {
            // csvOptions = _.defaultsDeep(csvOptions, {
            //     delimiter: ',',
            //     escapeChar: '"',
            //     enclosedChar: '"',
            //     arraySeparator: ','
            // });
            // return highland.pipeline(csvStream.createStream(csvOptions));

            // csvOptions = _.defaultsDeep(csvOptions, {
            //     delimiter: ',',
            //     escape: '"',
            //     quote: '"'
            //     // arraySeparator: ','
            // });
            //
            // return highland.pipeline(
            //     csv.parse(),
            //     csv.transform((record) => {
            //         console.log('...', record);
            //         return record;
            //     })
            // );
            csvOptions = _.defaultsDeep(csvOptions, {
                constructResult: false,
                delimiter: ',',
                quote: '"'
            });

            return highland.pipeline(
                new csvtojson.Converter(csvOptions),
                highland.map(JSON.parse)
            );
        },

        exportN3Stream: function(n3config) {
            return this.adapter.exportN3Stream(n3config);
        },

        exportStream: function() {
            return this.adapter.exportStream();
        },

        save: function(pojo) {
            return Promise.resolve().then(() => {
                return this.validatePojo(pojo);
            }).then((validatedPojo) => {
                return this.adapter.save(validatedPojo);
            });
        },

        saveStream: function(arrayOrStreamOfPojos) {
            const that = this;

            const through = highland.pipeline(
                highland.flatMap((o) => highland(that.validatePojo(o))),
                that.adapter.saveStream()
            );

            return arrayOrStreamOfPojos
                ? highland(arrayOrStreamOfPojos).pipe(through)
                : highland.pipeline(through);
        },

        delete: function(pojo) {
            return this.adapter.delete(pojo);
        },

        deleteStream: function(arrayOrStreamOfPojos) {
            return this.adapter.deleteStream(arrayOrStreamOfPojos);
        },

        queryStream: function(modelName, query) {
            const that = this;
            return highland(queryValidation(that, modelName).validate(query))
                .flatMap((validatedQuery) => {
                    return that.adapter.queryStream(modelName, validatedQuery);
                });
        },

        validatePojo: function(pojo) {
            const joiOptions = {};
            return new Promise((resolve, reject) => {
                let validationErrors = [];

                if (!pojo._id) {
                    validationErrors.push('"_id" is required');
                }

                let modelClass = this[pojo._type];

                if (!pojo._type) {
                    validationErrors.push('"_type" is required');
                } else if (!modelClass) {
                    validationErrors.push(
                        '"_type": no model found in schema'
                    );
                }

                if (validationErrors.length) {
                    return reject(
                        new ValidationError('malformed object', {
                            validationErrors: validationErrors.map((o) => ({message: o})),
                            object: pojo
                        })
                    );
                }

                pojo = _.omitBy(pojo, _.isUndefined);
                pojo = _.omitBy(pojo, _.isNull);

                let modelSchema = modelClass.schema;

                modelSchema.validate(pojo, joiOptions, (error, value) => {
                    if (error) {
                        return reject(
                            new ValidationError('Bad value', {
                                validationErrors: error,
                                object: pojo
                            })
                        );
                    }
                    value = _.omitBy(value, _.isUndefined);
                    return resolve(value);
                });
            });
        },



        /**
         * validate the pojo against the model schema
         *
         * @params {string} modelType - the type of the model
         * @param {object} pojo
         * @param {object} options - the hapijs/joi options
         *
         * @returns a promise which resolve into a validated pojo
         */
        validate(modelType, pojo, options) {
            return new Promise((resolve, reject) => {

                if (!this[modelType]) {
                    return reject(new ValidationError(
                        `Unknown type ${modelType}`, {pojo: pojo}));
                }



                pojo = _.omitBy(pojo, _.isUndefined);

                let modelSchema = this[modelType].schema;
                let {error, value} = modelSchema.validate(pojo, options);

                if (error) {
                    pojo = pojo || {};

                    /*** hack for virtuoso: boolean are returned as integers **/
                    let virtuosoFix = false;

                    error.forEach((detail) => {
                        let propertyName = detail.path;
                        let badValue = pojo[propertyName];
                        if (detail.type === 'boolean.base' && _.includes([1, 0], badValue)) {
                            virtuosoFix = true;
                            pojo[propertyName] = Boolean(badValue);
                        }
                    });

                    if (virtuosoFix) {
                        process.nextTick(() => {
                            this.validate(modelType, pojo, options).then((validatedPojo) => {
                                resolve(validatedPojo);
                            }).catch((validationError) => {
                                reject(new ValidationError('Bad value', validationError));
                            });
                        });
                    } else {
                        reject(new ValidationError('Bad value', error));
                    }

                } else {

                    /*** remove undefined value ***/
                    value = _.omitBy(value, _.isUndefined);

                    resolve(value);

                }
            });
        },

        _validateOperations(modelType, operations) {
            return operationsValidator(operations).then(() => {
                let modelSchema = this[modelType].schema;
                for (let operation of operations) {
                    let property = modelSchema.getProperty(operation.property);
                    if (!property) {
                        throw new ValidationError('Unknown property',
                            `unknown property "${operation.property}" on model "${modelType}"`);
                    }

                    let validationResults;
                    if (property.isArray()) {
                        validationResults = property.validateItem(operation.value);
                    } else {
                        validationResults = property.validate(operation.value);
                    }

                    let {error, value} = validationResults;
                    if (error) {
                        throw new ValidationError('Bad value', error);
                    }
                    operation.value = value;
                }
                return operations;
            });
        },

        /**
         * Returns all properties which match the reverse
         * property name
         *
         * @params {string} propertyName
         * @params {?string} mixinName - the name of the mixin to restraint the lookup
         * @returns a list of ModelSchemaProperty objects
         */
        findProperties(propertyName, mixinNames) {
            let properties = this._propertiesMap[propertyName];

            if (mixinNames) {
                if (!_.isArray(mixinNames)) {
                    mixinNames = [mixinNames];
                }

                let allMixinNames = _.uniq(
                    _.flatten(
                        mixinNames.map((o) => this[o].mixinsChain)
                    )
                );

                let filterFn = function(item) {
                    let mixinsChain = item.modelSchema.modelClass.mixinsChain;
                    return _.intersection(allMixinNames, mixinsChain).length;
                };

                properties = _.filter(properties, filterFn);

                if (!properties.length) {
                    properties = undefined;
                } else if (properties.length === 1) {
                    properties = properties[0];
                } else {
                    console.error('AAAAAA', propertyName, mixinNames, properties);
                }
            }
            return properties;
        },


        /**
         * Returns a promise which resolve the records that match the query
         *
         * @params {string} modelType - the model type
         * @params {?object} query - the query
         * @params {?object} options
         * @returns {promise}
         */
        find(modelType, query, options) {
            return Promise.resolve().then(() => {

                if (!modelType) {
                    throw new Error('find: modelType is required');
                }

                if (!this[modelType]) {
                    throw new Error(`find: Unknown modelType: "${modelType}"`);
                }

                query = Object.assign({}, query);
                options = options || {};


                if (typeof options.fields === 'string') {
                    options.fields = options.fields.split(',');
                }

                if (typeof options.sort === 'string') {
                    options.sort = options.sort.split(',');
                }

                options.limit = options.limit || 20;

                let {error: optionError, value: validatedOptions} = findOptionsValidator(options, this, modelType);
                if (optionError) {
                    throw new ValidationError('malformed options', optionError);
                }

                if (!query._type) {
                    query._type = modelType;
                }

                let {error: queryError, value: validatedQuery} = queryValidator(this[modelType].schema, query);

                if (queryError) {
                    throw new ValidationError('malformed query', queryError);
                }

                return this.adapter.find(modelType, validatedQuery, validatedOptions);
            }).then((data) => {
                return _.compact(data);
            });
        },

        /**
         * Returns a stream of document as pojo
         *
         * @params {string} modelType - the model type
         * @params {?object} query - the query
         * @params {?object} options
         * @returns {stream}
         */
        stream(modelType, query, options) {
            query = Object.assign({}, query);
            options = options || {};

            if (!modelType) {
                throw new Error('stream: modelType is required');
            }

            if (!this[modelType]) {
                throw new Error(`stream: Unknown modelType: "${modelType}"`);
            }

            if (typeof options.fields === 'string') {
                options.fields = options.fields.split(',');
            }

            if (typeof options.sort === 'string') {
                options.sort = options.sort.split(',');
            }

            let {error: optionError, value: validatedOptions} = findOptionsValidator(options, this, modelType);
            if (optionError) {
                throw new ValidationError('malformed options', optionError);
            }

            if (!query._type) {
                query._type = modelType;
            }

            let {error: queryError, value: validatedQuery} = queryValidator(this[modelType].schema, query);

            if (queryError) {
                throw new ValidationError('malformed query', queryError);
            }

            return this.adapter.stream(modelType, validatedQuery, validatedOptions);
        },


        /**
         * Returns a promise which resolve the first
         * record that match the query
         *
         * @params {string} modelType - the model type
         * @params {?object} query - the query
         * @params {?object} options
         * @returns {promise}
         */
        first(modelType, query, options) {
            return Promise.resolve().then(() => {
                return this.find(modelType, query, options);
            }).then((results) => {
                let result;
                if (results.length) {
                    result = results[0];
                }
                return result;
            });
        },


        /**
         * Returns a promise which resolve into a record
         * which match the id
         *
         * @params {string} modelType - the model type
         * @params {string|Array} id- the model id or an array of ids
         * @params {?object} options
         * @returns a promise
         */
        fetch(modelType, id, options) {
            return Promise.resolve().then(() => {

                options = options || {};

                if (typeof options.fields === 'string') {
                    options.fields = options.fields.split(',');
                }

                if (typeof modelType !== 'string') {
                    throw new Error('fetch: modelType is required and should be a string');
                }

                if (!this[modelType]) {
                    throw new Error(`fetch: Unknown modelType: "${modelType}"`);
                }

                if (typeof id !== 'string') {
                    throw new Error('fetch: id is required and should be a string');
                }


                return this.adapter.fetch(modelType, id, options);
            }).then((pojo) => {
                if (pojo) {
                    /** cast values **/
                    return this.validate(modelType, pojo);
                } else {
                    return null;
                }
            });
        },


        /**
         * Returns a promise which resolve the number of record
         * that match the query
         *
         * @params {string} modelType - the model type
         * @params {?object} query
         * @returns {promise}
         */
        count(modelType, query) {
            return Promise.resolve().then(() => {
                if (typeof modelType !== 'string') {
                    throw new Error('count: modelType should be a string');
                }

                if (!this[modelType]) {
                    throw new Error(`count: Unknown modelType: "${modelType}"`);
                }

                if (query && !_.isObject(query)) {
                    throw new Error('count: query should be an object');
                }

                query = query || {};
                query._type = modelType;

                let {error, value: validatedQuery} = queryValidator(this[modelType].schema, query);

                if (error) {
                    throw new ValidationError('malformed query', error);
                }


                return this.adapter.count(modelType, validatedQuery);
            });
        },


        /**
         * Returns a promise which resolve the aggregate the
         * properties values that match the query
         *
         * @params {string} modelType - the model type
         * @params {?object} aggregator - object that contains property and the operator
         * @params {?object} query
         * @returns {promise}
         */
        aggregate(modelType, aggregator, query, options) {
            return Promise.resolve().then(() => {
                if (typeof modelType !== 'string') {
                    throw new Error('aggregate: modelType should be a string');
                }

                if (!this[modelType]) {
                    throw new Error(`aggregate: Unknown modelType: "${modelType}"`);
                }

                if (!_.isObject(aggregator)) {
                    throw new Error('aggregate: aggregator is required and should be an object');
                }

                let modelClass = this[modelType];
                for (let key of Object.keys(aggregator)) {
                    let value = aggregator[key];
                    if (_.isObject(value)) {
                        for (let operator of Object.keys(value)) {

                            if (validAggregationOperators.indexOf(operator.toLowerCase()) === -1) {
                                throw new ValidationError(`aggregate: unknown operator "${operator}"`);
                            }

                            let propertyName = value[operator];
                            if (!(operator === '$count' && propertyName === true)) {
                                if (!modelClass.schema.getProperty(propertyName)) {
                                    let ispecialProperty = _.includes(['_id', '_type'], propertyName) || _.endsWith(propertyName, '._id') || _.endsWith(propertyName, '._type');
                                    if (!ispecialProperty) {
                                        throw new ValidationError(`aggregate: unknown property "${propertyName}" for model "${modelType}"`);
                                    }
                                }
                            }
                        }
                    } else {
                        if (!modelClass.schema.getProperty(value)) {
                            let ispecialProperty = _.includes(['_id', '_type'], value) || _.endsWith(value, '._id') || _.endsWith(value, '._type');
                            if (!ispecialProperty) {
                                throw new ValidationError(`aggregate: unknown property "${value}" for model "${modelType}"`);
                            }
                        }
                    }
                }

                if (query && !_.isObject(query)) {
                    throw new Error('aggregate: query should be an object');
                }

                query = query || {};
                query._type = modelType;

                let {error, value: validatedQuery} = queryValidator(this[modelType].schema, query);

                if (error) {
                    throw new ValidationError('malformed query', error);
                }

                options = options || {};

                if (typeof options.sort === 'string') {
                    options.sort = options.sort.split(',');
                }

                if (_.get(options, 'sort', []).length) {
                    for (let variable of options.sort) {
                        if (variable[0] === '-') {
                                variable = variable.slice(1);
                        }
                        if (Object.keys(aggregator).indexOf(variable) === -1) {
                            throw new ValidationError(`aggregate: unknown sorting constraint "${variable}"`);
                        }
                    }
                }

                options.limit = options.limit || 100;

                return this.adapter.aggregate(modelType, aggregator, validatedQuery, options);
            });
        },

        groupBy(modelType, aggregator, query, options) {

            return Promise.resolve().then(() => {

                options = options || {};


                if (typeof modelType !== 'string') {
                    throw new Error('groupBy: modelType should be a string');
                }

                if (!this[modelType]) {
                    throw new Error(`groupBy: Unknown modelType: "${modelType}"`);
                }

                if (!aggregator) {
                    throw new Error('groupBy: aggregator is required');
                }

                if (typeof aggregator === 'string') {
                    aggregator = {
                        property: aggregator,
                        aggregation: {operator: 'count', target: aggregator}
                    };
                }

                if (typeof aggregator.aggregation === 'string') {
                    aggregator.aggregation = {
                        operator: aggregator.aggregation
                    };
                }

                if (!aggregator.aggregation) {
                    aggregator.aggregation = {};
                }

                if (!aggregator.aggregation.operator) {
                    aggregator.aggregation.operator = 'count';
                }

                if (!_.isArray(aggregator.property)) {
                    if (!aggregator.aggregation.target) {
                        aggregator.aggregation.target = aggregator.property;
                    }
                    aggregator.property = [aggregator.property];
                } else if (!aggregator.aggregation.target) {
                    if (aggregator.aggregation.operator === 'count') {
                        aggregator.aggregation.target = aggregator.property[0];
                    } else {
                        throw new Error('groupBy: with multiple properties and a custom operator, target is required');
                    }
                }

                let {error: aggregatorError, value: validatedAggregator} = groupByValidator(aggregator);

                if (aggregatorError) {
                    throw new ValidationError('malformed aggregator', aggregatorError.details[0].message);
                }

                let modelSchema = this[modelType].schema;
                for (let propertyName of validatedAggregator.property) {
                    if (!modelSchema.getProperty(propertyName)) {
                        throw new ValidationError('malformed aggregator', `unknown property aggregator "${validatedAggregator.property}" on model "${modelType}"`);
                    }
                }

                if (!modelSchema.getProperty(validatedAggregator.aggregation.target)) {
                    throw new ValidationError('malformed aggregator', `unknown property target "${validatedAggregator.aggregation.target}" on model "${modelType}"`);
                }

                if (query && !_.isObject(query)) {
                    throw new Error('groupBy: query should be an object');
                }

                query = query || {};
                query._type = modelType;

                let {error: queryError, value: validatedQuery} = queryValidator(this[modelType].schema, query);

                if (queryError) {
                    throw new ValidationError('groupBy: malformed query', queryError);
                }

                // TODO validate options
                if (!_.get(options, 'sort', []).length) {
                    if (aggregator.property.length > 1) {
                        options.sort = [].concat(aggregator.property);
                    }
                }

                for (let propertyName of _.get(options, 'sort', [])) {
                    let property = this[modelType].schema.getProperty(propertyName);
                    if (!property) {
                        throw new ValidationError(`sort: unknown property "${propertyName}" on model "${modelType}"`);
                    }
                }

                return this.adapter.groupBy(modelType, validatedAggregator, validatedQuery, options);
            });
        },

        /**
         * Update a record in the store.
         *
         * @params {string} modelType - the model type
         * @params {string} modelId - the model id
         * @params {array} operations - an array of operation: {operator, property, value}
         * @returns {promise}
         */
        update(modelType, modelId, operations) {
            return Promise.resolve().then(() => {

                if (typeof modelType !== 'string') {
                    throw new Error('update: modelType should be a string');
                }

                if (!this[modelType]) {
                    throw new Error(`update: Unknown modelType: "${modelType}"`);
                }

                if (!_.isArray(operations)) {
                    throw new Error('update: operations should be an array');
                }

                return this._validateOperations(modelType, operations);
            }).then((validatedOperations) => {
                if (validatedOperations.length) {
                    return this.adapter.update(modelType, modelId, validatedOperations);
                }
                return Promise.resolve();
            });
        },


        /**
         * Save the whole object in the database. If a record with the
         * same id is already present in the database, it will be overwritten
         *
         * @params {string} modelType
         * @params {object} pojo - the record to save
         * @returns a promise which resolve the saved object
         */
        sync(modelType, pojo, options) {
            return Promise.resolve().then(() => {

                if (typeof modelType !== 'string') {
                    throw new Error('sync: modelType should be a string');
                }

                if (!this[modelType]) {
                    throw new Error(`sync: Unknown modelType: "${modelType}"`);
                }

                if (!_.isObject(pojo)) {
                    throw new Error('sync: the document should be an object');
                }

                if (!pojo._id) {
                    pojo._id = this.buildModelId();
                }

                if (!pojo._type) {
                    pojo._type = modelType;
                }

                return this.validate(modelType, pojo, options);
            }).then((validatedPojo) => {
                return this.adapter.sync(modelType, validatedPojo);
            });
        },


        /**
         * Sync an array of object. Act the same as #sync()
         *
         * @params {string} modelType
         * @params {array} data - an array of pojo
         * @returns a promise which resolve an array of the saved pojo
         */
        _batchSync(modelType, data) {
            return Promise.resolve().then(() => {

                if (typeof modelType !== 'string') {
                    throw new Error('batchSync: modelType should be a string');
                }

                if (!this[modelType]) {
                    throw new Error(`batchSync: Unknown modelType: "${modelType}"`);
                }

                if (!_.isArray(data)) {
                    throw new Error('batchSync: data should be an array');
                }

                let promises = [];
                for(let i = 0; i < data.length; i++) {
                    let pojo = data[i];

                    if (!_.isObject(pojo)) {
                        throw new Error('sync: the document should be an object');
                    }

                    if (!pojo._id) {
                        pojo._id = this.buildModelId();
                    }

                    if (!pojo._type) {
                        pojo._type = modelType;
                    }

                    promises.push(this.validate(modelType, pojo));
                }

                return Promise.all(promises);
            }).then((pojos) => {
                return this.adapter.batchSync(modelType, pojos);
            });
        },


        /**
         * Sync an array of object. Act the same as #sync()
         *
         * @params {string} modelType
         * @params {array} data - an array of pojo
         * @returns a promise which resolve an array of the saved pojo
         */
        batchSync(modelType, data) {
            return Promise.resolve().then(() => {

                if (typeof modelType !== 'string') {
                    throw new Error('batchSync: modelType should be a string');
                }

                if (!this[modelType]) {
                    throw new Error(`batchSync: Unknown modelType: "${modelType}"`);
                }

                if (!_.isArray(data)) {
                    throw new Error('batchSync: data should be an array');
                }

                let promises = [];
                for(let i = 0; i < data.length; i++) {
                    let pojo = data[i];

                    if (!_.isObject(pojo)) {
                        throw new Error('sync: the document should be an object');
                    }

                    if (!pojo._id) {
                        pojo._id = this.buildModelId();
                    }

                    if (!pojo._type) {
                        pojo._type = modelType;
                    }

                    promises.push(this.validate(modelType, pojo));
                }

                return Promise.all(promises);
            }).then((pojos) => {
                return new Promise((resolve, reject) => {

                    let writeStream = this.writableStream(modelType);
                    let stream = es.readArray(pojos).pipe(writeStream);
                    stream.on('error', function(error) {
                        reject(error);
                    });

                    stream.on('end', function() {
                        resolve(pojos);
                    });
                });
            });
        },

        // /**
        //  * Remove a record from the database
        //  *
        //  * @params {string} modelType - the model type
        //  * @params {string} modelId - the model id
        //  * @returns a promise
        //  */
        // delete(modelType, modelId) {
        //     return Promise.resolve().then(() => {
        //         if (typeof modelType !== 'string') {
        //             throw new Error('delete: modelType should be a string');
        //         }
        //
        //
        //         if (!this[modelType]) {
        //             throw new Error(`delete: Unknown modelType: "${modelType}"`);
        //         }
        //
        //         if (typeof modelId !== 'string') {
        //             throw new Error('delete: id should be a string');
        //         }
        //
        //         return this.adapter.delete(modelType, modelId);
        //     });
        // },

        clearResource(modelType) {
            return Promise.resolve().then(() => {
                if (typeof modelType !== 'string') {
                    throw new Error('clearResource: modelType should be a string');
                }


                if (!this[modelType]) {
                    throw new Error(`clearResource: Unknown modelType: "${modelType}"`);
                }

                return this.adapter.clearResource(modelType);
            });
        },

        /**
         * returns a writable stream that store the documents in the db
         *
         * @params {modelType} - the model name
         * @params {options}
         *      dryRun: if true, don't touch the db (validation only)
         *      all hapijs/options
         * @return a writable stream
         */
        writableStream(modelType, options) {
            options = options || {};

            let db = this;
            let count = 1;
            let dryRun = false;
            if (options.dryRun != null) {
                dryRun = options.dryRun;
                delete options.dryRun;
            }

            return es.map((pojo, callback) => {
                if (_.isEmpty(pojo)) {
                    return callback(null, null);
                }

                if (pojo._archimedesModelInstance) {
                    pojo = pojo.attrs();
                }

                let line = {pojo: pojo, count: count++};
                if (dryRun) {
                    db.validate(modelType, pojo, options).then(() => {
                        callback(null);
                    }).catch((error) => {
                        error.line = line;
                        callback(error);
                    });
                } else {
                    db.sync(modelType, pojo, options).then((savedDoc) => {
                        callback(null, savedDoc);
                    }).catch((error) => {
                        error.line = line;
                        callback(error);
                    });
                }
            });
        },

        /**
         * import all data from a csv-like stream
         *
         * @params {modelType} - the model name
         * @params {stream} - a stream that flow a csv-like string
         * @params {options}
         * @returns the stream
         */
        csvStreamParse(modelType, stream, options) {

            if (!this[modelType]) {
                throw new Error(`importCsv: Unknown modelType: "${modelType}"`);
            }

            let db = this;
            let Model = db[modelType];

            options = options || {};

            if (options.escapeChar == null) {
                options.escapeChar = '"';
            }

            if (options.enclosedChar == null) {
                options.enclosedChar = '"';
            }

            let propertyNames = Object.keys(db[modelType].schema._properties);
            let header = _.sortBy(propertyNames);
            header.unshift('_type');
            header.unshift('_id');

            let stripUnknown = options.stripUnknown;
            options = {
                delimiter: options.delimiter || ',',
                escapeChar: options.escapeChar,
                enclosedChar: options.enclosedChar
            };

            let csvStreamTransform = csvStream.createStream(options);

            let count = 1;
            let csv2pojoTransform = es.map((pojo, callback) => {

                let record = {};

                // is it the header ?
                if (pojo._id === '_id' && pojo._type === '_type') {
                    callback(null);
                }

                var line = {pojo: pojo, count: count++};

                for (let propertyName of Object.keys(pojo)) {

                    if (pojo[propertyName] !== '') {

                        let value = pojo[propertyName];

                        if (!_.includes(['_id', '_type'], propertyName)) {
                            let property = Model.schema.getProperty(propertyName);
                            if (!property) {
                                if (stripUnknown) {
                                    continue;
                                }
                                let error = new ValidationError('Bad value', `unknown property "${propertyName}" for model "${Model.name}"`);
                                error.line = line;
                                return callback(error);
                            }
                            if (property.isRelation()) {
                                if (property.isArray()) {
                                    let values = [];
                                    for (let item of value.split('|')) {
                                        values.push({_id: item, _type: property.type});
                                    }
                                    value = values;
                                } else {
                                    value = {_id: value, _type: property.type};
                                }
                            } else {
                                if (property.isArray()) {
                                    value = value.split('|');
                                }
                            }
                        }
                        record[propertyName] = value;
                    }
                }
                callback(null, record);
            });

            return stream.pipe(csvStreamTransform).pipe(csv2pojoTransform);
        }
    };

    inner.adapter = dbAdapter(inner);
    return inner;

}
