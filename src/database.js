
import _ from 'lodash';
import modelFactory from './model';
import {ValidationError} from './errors';
import queryValidator from './query-validator';

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
            var modelSchema = this[modelType].schema;
            return new Promise((resolve, reject) => {
                let {error, value} = modelSchema.validate(pojo);
                if (error) {
                    return reject(new ValidationError(error, error));
                }
                return resolve(value);
            });
        },

        /**
         * Returns a promise which resolve the records that match the query
         *
         * @params {string} modelType - the model type
         * @params {?object} query - the query
         * @returns {promise}
         */
        find(modelType, query) {
            return new Promise((resolve, reject) => {
                if (!modelType) {
                    return reject(new Error('find: modelType is required'));
                }

                query = query || {};
                query._type = modelType;

                let {error, value: validatedQuery} = queryValidator(this[modelType].schema, query);

                if (error) {
                    return reject(new ValidationError('malformed query', error));
                }

                this.adapter.find(modelType, validatedQuery).then((data) => {
                    // var modelSchema = this[modelType].schema;
                    let promises = data.map((item) => {
                        return this.validate(modelType, item);
                        // })
                        // let {error: itemError, value: validatedItem} = modelSchema.validate(item);
                        // if (itemError) {
                        //     return reject(new ValidationError(itemError, itemError));
                        // }
                        // return validatedItem;
                    });

                    return resolve(Promise.all(promises));
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
            return this.find(modelType, query).then((results) => {
                var result;
                if (results.length) {
                    result = results[0];
                }
                return result;
            });
        },



        fetch(modelType, id) {
            return new Promise((resolve, reject) => {
                if (typeof modelType !== 'string') {
                    return reject(new Error('fetch: modelType is required and should be a string'));
                }

                if (typeof id !== 'string') {
                    return reject(new Error('fetch: id required and should be a string'));
                }

                return resolve(this.adapter.fetch(modelType, id));
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

                let {error, value: validatedPojo} = this[modelType].schema.validate(pojo);

                if (error) {
                    return reject(new ValidationError(`${error[0].message}`, error));
                }

                return resolve(this.adapter.sync(modelType, validatedPojo));

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

                let pojos = [];
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

                    let {error, value: validatedPojo} = this[modelType].schema.validate(pojo);

                    if (error) {
                        return reject(new ValidationError(`${error[0].message}`, error));
                    }

                    pojos.push(validatedPojo);

                }

                return resolve(this.adapter.batchSync(modelType, pojos));
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