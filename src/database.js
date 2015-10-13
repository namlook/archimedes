
import _ from 'lodash';
import uuid from 'uuid';
import modelFactory from './model';
import {ValidationError, StructureError} from './errors';
import queryValidator from './query-validator';
import {findOptionsValidator} from './options-validator';
import groupByValidator from './group-by-validator';
import operationsValidator from './operations-validator';

var validPropertyTypes = [
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

    var inner = {
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
                return this.afterRegister(db);
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

                var modelSchema = this[modelType].schema;
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
            return new Promise((resolve, reject) => {
                let modelSchema = this[modelType].schema;
                operationsValidator(operations).then(() => {
                    operations.forEach((operation) => {
                        let property = modelSchema.getProperty(operation.property);
                        if (!property) {
                            return reject(new ValidationError('Unknown property',
                                `unknown property "${operation.property}" on model "${modelType}"`));
                        }

                        let validationResults;
                        if (property.isArray()) {
                            validationResults = property.validateItem(operation.value);
                        } else {
                            validationResults = property.validate(operation.value);
                        }

                        let {error, value} = validationResults;
                        if (error) {
                            return reject(new ValidationError('Bad value', error));
                        }
                        operation.value = value;
                    });
                    return resolve(operations);
                }).catch((error) => {
                    return reject(new ValidationError('Bad operations', error));
                });
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

            query = Object.assign({}, query);
            options = options || {};


            if (typeof options.fields === 'string') {
                options.fields = options.fields.split(',');
            }

            if (typeof options.sort === 'string') {
                options.sort = options.sort.split(',');
            }

            return new Promise((resolve, reject) => {
                if (!modelType) {
                    return reject(new Error('find: modelType is required'));
                }


                var {error: optionError, value: validatedOptions} = findOptionsValidator(options);
                if (optionError) {
                    return reject(new ValidationError('malformed options', optionError));
                }

                if (!query._type) {
                    query._type = modelType;
                }

                let {error: queryError, value: validatedQuery} = queryValidator(this[modelType].schema, query);


                if (queryError) {
                    return reject(new ValidationError('malformed query', queryError));
                }

                this.adapter.find(modelType, validatedQuery, validatedOptions).then((data) => {
                    return resolve(_.compact(data));
                }).catch((findError) => {
                    return reject(findError);
                });
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
            return new Promise((resolve, reject) => {
                this.find(modelType, query, options).then((results) => {
                    var result;
                    if (results.length) {
                        result = results[0];
                    }
                    return resolve(result);
                }).catch((error) => {
                    reject(error);
                });
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

            options = options || {};

            if (typeof options.fields === 'string') {
                options.fields = options.fields.split(',');
            }

            return new Promise((resolve, reject) => {
                if (typeof modelType !== 'string') {
                    return reject(new Error('fetch: modelType is required and should be a string'));
                }

                if (typeof id !== 'string') {
                    return reject(new Error('fetch: id is required and should be a string'));
                }


                this.adapter.fetch(modelType, id, options).then((pojo) => {
                    if (pojo) {

                        /** cast values **/
                        this.validate(modelType, pojo).then((validatedPojo) => {
                            resolve(validatedPojo);
                        }).catch((error) => {
                            reject(error);
                        });

                    } else {
                        process.nextTick(resolve);
                    }
                }).catch((error) => {
                    reject(error);
                });
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
            return new Promise((resolve, reject) => {
                if (typeof modelType !== 'string') {
                    return reject(new Error('count: modelType should be a string'));
                }

                if (query && !_.isObject(query)) {
                    return reject(new Error('count: query should be an object'));
                }

                query = query || {};
                query._type = modelType;

                let {error, value: validatedQuery} = queryValidator(this[modelType].schema, query);

                if (error) {
                    return reject(new ValidationError('malformed query', error));
                }


                return resolve(this.adapter.count(modelType, validatedQuery));
            });
        },


        groupBy(modelType, aggregator, query, options) {

            options = options || {};

            return new Promise((resolve, reject) => {

                if (typeof modelType !== 'string') {
                    return reject(new Error('update: modelType should be a string'));
                }

                if (!aggregator) {
                    return reject(new Error('groupBy: aggregator is required'));
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
                    return reject(new ValidationError('malformed aggregator', aggregatorError.details[0].message));
                }

                let modelSchema = this[modelType].schema;
                if (!modelSchema.getProperty(validatedAggregator.property)) {
                    return reject(new ValidationError('malformed aggregator', `unknown property aggregator "${validatedAggregator.property}" on model "${modelType}"`));
                }
                if (!modelSchema.getProperty(validatedAggregator.aggregation.target)) {
                    return reject(new ValidationError('malformed aggregator', `unknown property target "${validatedAggregator.aggregation.target}" on model "${modelType}"`));
                }

                if (query && !_.isObject(query)) {
                    return reject(new Error('groupBy: query should be an object'));
                }

                query = query || {};
                query._type = modelType;

                let {error: queryError, value: validatedQuery} = queryValidator(this[modelType].schema, query);

                if (queryError) {
                    return reject(new ValidationError('malformed query', queryError));
                }

                // TODO validate options

                return resolve(this.adapter.groupBy(modelType, validatedAggregator, validatedQuery, options));
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
            return new Promise((resolve, reject) => {

                if (typeof modelType !== 'string') {
                    return reject(new Error('update: modelType should be a string'));
                }

                if (!_.isArray(operations)) {
                    return reject(new Error('update: operations should be an array'));
                }

                this._validateOperations(modelType, operations).then((validatedOperations) => {
                    return resolve(this.adapter.update(modelType, modelId, validatedOperations));
                }).catch((error) => {
                    return reject(error);
                });
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
            return new Promise((resolve, reject) => {
                if (typeof modelType !== 'string') {
                    return reject(new Error('sync: modelType should be a string'));
                }

                if (!_.isObject(pojo)) {
                    return reject(new Error('sync: the document should be an object'));
                }

                if (!pojo._id) {
                    pojo._id = this.buildModelId();
                }

                if (!pojo._type) {
                    pojo._type = modelType;
                }

                this.validate(modelType, pojo).then((validatedPojo) => {
                    resolve(this.adapter.sync(modelType, validatedPojo));
                }).catch((error) => {
                    reject(error);
                });
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
            return new Promise((resolve, reject) => {
                if (typeof modelType !== 'string') {
                    return reject(new Error('batchSync: modelType should be a string'));
                }

                if (!_.isArray(data)) {
                    return reject(new Error('batchSync: data should be an array'));
                }

                var promises = [];
                for(let i = 0; i < data.length; i++) {
                    let pojo = data[i];

                    if (!_.isObject(pojo)) {
                        return reject(new Error('sync: the document should be an object'));
                    }

                    if (!pojo._id) {
                        pojo._id = this.buildModelId();
                    }

                    if (!pojo._type) {
                        pojo._type = modelType;
                    }

                    promises.push(this.validate(modelType, pojo));
                }

                // return resolve(this.adapter.batchSync(modelType, data));


                return Promise.all(promises).then((pojos) => {
                    resolve(this.adapter.batchSync(modelType, pojos));
                }).catch((error) => {
                    reject(error);
                });

                // return resolve(this.adapter.batchSync(modelType, pojos));
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
            return new Promise((resolve, reject) => {
                if (typeof modelType !== 'string') {
                    return reject(new Error('delete: modelType should be a string'));
                }

                if (typeof modelId !== 'string') {
                    return reject(new Error('delete: id should be a string'));
                }

                return resolve(this.adapter.delete(modelType, modelId));
            });
        }
    };



    inner.adapter = dbAdapter(inner);
    return inner;

}