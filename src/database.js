
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

import Promise from 'bluebird';

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
                        } else if (!_.contains(validPropertyTypes, propConfig.type)) {
                            if (!models[propConfig.type]) {
                                return reject(new StructureError(`${modelName} invalid type for property "${propName}"`));
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
                this.modelSchemas = processedModels;
                _.forOwn(processedModels, (ModelConfig, name) => {
                    this[name] = modelFactory(this, name, ModelConfig);
                    this.registeredModels[name] = this[name];
                    this._modelsByPlural[this[name].meta.names.plural] = this[name];
                });
                return this;
            }).then((db) => {
                this._checkInverseRelationships();
                return this.afterRegister(db);
            });
        },


        _checkInverseRelationships() {
            _.forOwn(this.registeredModels, (model, name) => {
                let {inverseRelationships} = model.schema;
                let error = inverseRelationships.reduce((_error, relation) => {
                    let abstract = relation.config.abstract.fromReverse;
                    let prop = this[abstract.type].schema.getProperty(abstract.property);
                    if (!prop) {
                        _error = new StructureError(`unknown property "${abstract.property}" for model "${abstract.type}" in the inverse relationship: ${name}.${relation.name}`);
                    }
                    return _error;
                }, null);

                if (error) {
                    throw error;
                }

            });
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
        clear() {
            return this.adapter.clear();
        },


        validate(modelType, pojo) {
            return new Promise((resolve, reject) => {

                if (!this[modelType]) {
                    return reject(new ValidationError(
                        `Unknown type ${modelType}`, {pojo: pojo}));
                }

                let modelSchema = this[modelType].schema;
                let {error, value} = modelSchema.validate(pojo);
                if (error) {
                    pojo = pojo || {};

                    /*** hack for virtuoso: boolean are returned as integers **/
                    let virtuosoFix = false;

                    error.forEach((detail) => {
                        let propertyName = detail.path;
                        let badValue = pojo[propertyName];
                        if (detail.type === 'boolean.base' && _.contains([1, 0], badValue)) {
                            virtuosoFix = true;
                            pojo[propertyName] = Boolean(badValue);
                        }
                    });

                    if (virtuosoFix) {
                        process.nextTick(() => {
                            this.validate(modelType, pojo).then((validatedPojo) => {
                                resolve(validatedPojo);
                            }).catch((validationError) => {
                                reject(new ValidationError('Bad value', validationError));
                            });
                        });
                    } else {
                        reject(new ValidationError('Bad value', error));
                    }

                } else {

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
        findProperties(propertyName, mixinName) {
            if (!this._propertiesMap) {
                this._propertiesMap = {};
                _.forOwn(this.registeredModels, (model) => {
                    model.schema.properties.forEach((property) => {

                        this._propertiesMap[property.name] = this._propertiesMap[property.name] || [];
                        if (property) {
                            this._propertiesMap[property.name].push(property);
                        }

                    });

                    model.schema.inverseRelationships.forEach((property) => {

                        this._propertiesMap[property.name] = this._propertiesMap[property.name] || [];
                        if (property) {
                            this._propertiesMap[property.name].push(property);
                        }

                    });
                });
            }

            let properties = this._propertiesMap[propertyName];

            if (mixinName) {
                let filterFn = function(item) {
                    let modelClass = item.modelSchema.modelClass;
                    return _.contains(modelClass.mixinsChain, mixinName);
                };

                properties = _.filter(properties, filterFn);
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

                query = Object.assign({}, query);
                options = options || {};


                if (typeof options.fields === 'string') {
                    options.fields = options.fields.split(',');
                }

                if (typeof options.sort === 'string') {
                    options.sort = options.sort.split(',');
                }

                if (!modelType) {
                    throw new Error('find: modelType is required');
                }


                let {error: optionError, value: validatedOptions} = findOptionsValidator(options);
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


        groupBy(modelType, aggregator, query, options) {

            return Promise.resolve().then(() => {

                options = options || {};


                if (typeof modelType !== 'string') {
                    throw new Error('update: modelType should be a string');
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

                if (!aggregator.aggregation) {
                    aggregator.aggregation = {operator: 'count', target: aggregator.property};
                }

                if (typeof aggregator.aggregation === 'string') {
                    aggregator.aggregation = {
                        operator: aggregator.aggregation,
                        target: aggregator.property
                    };
                }

                let {error: aggregatorError, value: validatedAggregator} = groupByValidator(aggregator);

                if (aggregatorError) {
                    throw new ValidationError('malformed aggregator', aggregatorError.details[0].message);
                }

                let modelSchema = this[modelType].schema;
                if (!modelSchema.getProperty(validatedAggregator.property)) {
                    throw new ValidationError('malformed aggregator', `unknown property aggregator "${validatedAggregator.property}" on model "${modelType}"`);
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
                    throw new ValidationError('malformed query', queryError);
                }

                // TODO validate options

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

                if (!_.isArray(operations)) {
                    throw new Error('update: operations should be an array');
                }

                return this._validateOperations(modelType, operations);
            }).then((validatedOperations) => {
                return this.adapter.update(modelType, modelId, validatedOperations);
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
        sync(modelType, pojo) {
            return Promise.resolve().then(() => {

                if (typeof modelType !== 'string') {
                    throw new Error('sync: modelType should be a string');
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

                return this.validate(modelType, pojo);
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
        batchSync(modelType, data) {
            return Promise.resolve().then(() => {

                if (typeof modelType !== 'string') {
                    throw new Error('batchSync: modelType should be a string');
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
         * Remove a record from the database
         *
         * @params {string} modelType - the model type
         * @params {string} modelId - the model id
         * @returns a promise
         */
        delete(modelType, modelId) {
            return Promise.resolve().then(() => {
                if (typeof modelType !== 'string') {
                    throw new Error('delete: modelType should be a string');
                }

                if (typeof modelId !== 'string') {
                    throw new Error('delete: id should be a string');
                }

                return this.adapter.delete(modelType, modelId);
            });
        }
    };



    inner.adapter = dbAdapter(inner);
    return inner;

}