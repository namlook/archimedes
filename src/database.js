
import _ from 'lodash';
import modelFactory from './model';
import {ValidationError} from './errors';
import queryValidator from './query-validator';
import {findOptionsValidator} from './options-validator';

var validPropertyTypes = [
    'string',
    'number',
    'boolean',
    'date',
    'array'
];

export default function(dbAdapter, config) {

    if (!dbAdapter) {
        throw new Error('database: no adapter found');
    }

    var inner = {
        _archimedesDatabase: true,
        config: config,
        modelSchemas: null,
        registeredModels: {},

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
                                return reject(new ValidationError(`${modelName} if property's type is "array" then "items" should be specified (properties.${propName})`));
                            }

                            if (typeof propConfig.items === 'string') {
                                propConfig.items = {type: propConfig.items};
                            }
                        } else if (!_.contains(validPropertyTypes, propConfig.type)) {
                            if (!models[propConfig.type]) {
                                return reject(new ValidationError(`${modelName} invalid type for property "${propName}"`));
                            }
                        }
                        modelConfig.properties[propName] = propConfig;
                    });

                });


                return resolve(this.adapter.beforeRegister(models));
            });
        },

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
                });
                return this;
            }).then((db) => {
                return this.afterRegister(db);
            });
        },

        /**
         * Generate a uniq string which will be use as model id
         *
         * @returns {string} - the model id
         */
        buildModelId() {
            let now = new Date();
            let rand = Math.floor(Math.random() * 10000);
            return parseInt(rand).toString(36) + parseInt(now.getTime()).toString(36);
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

                var modelSchema = this[modelType].schema;
                let {error, value} = modelSchema.validate(pojo);

                if (error) {
                    pojo = pojo || {};
                    /*** hack for virtuoso: boolean are returned as integers **/
                    let propertyName = error[0].path;
                    let badValue = pojo[propertyName];
                    if (error[0].type === 'boolean.base' && _.contains([1, 0], badValue)) {
                        pojo[propertyName] = Boolean(badValue);
                        process.nextTick(() => {
                            this.validate(modelType, pojo).then((validatedPojo) => {
                                resolve(validatedPojo);
                            }).catch((validationError) => {
                                reject(validationError);
                            });
                        });
                    } else {
                        reject(new ValidationError(error[0].message, error));
                    }

                } else {

                    resolve(value);

                }

            });
        },

        /**
         * Returns a promise which resolve the records that match the query
         *
         * @params {string} modelType - the model type
         * @params {?object} query - the query
         * @returns {promise}
         */
        find(modelType, query, options) {

            query = Object.assign({}, query);
            options = options || {};

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

                let {error, value: validatedQuery} = queryValidator(this[modelType].schema, query);


                if (error) {
                    return reject(new ValidationError('malformed query', error));
                }

                this.adapter.find(modelType, validatedQuery, validatedOptions).then((data) => {
                    let promises = _.compact(data).map((item) => {
                        return this.validate(modelType, item);
                    });


                    return resolve(Promise.all(promises));
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
         * @returns {promise}
         */
        first(modelType, query) {
            return new Promise((resolve, reject) => {
                this.find(modelType, query).then((results) => {
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



        fetch(modelType, id, options) {

            options = options || {};

            return new Promise((resolve, reject) => {
                if (typeof modelType !== 'string') {
                    return reject(new Error('fetch: modelType is required and should be a string'));
                }

                if (typeof id !== 'string') {
                    return reject(new Error('fetch: id required and should be a string'));
                }


                this.adapter.fetch(modelType, id, options).then((pojo) => {
                    if (pojo) {
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

                return resolve(this.adapter.update(modelType, modelId, operations));
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

                Promise.all(promises).then((pojos) => {
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