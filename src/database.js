
import _ from 'lodash';
import modelFactory from './model';
import {ValidationError} from './errors';
import queryValidator from './query-validator';

export default function(config) {

    var internals = {
        store: []
    };

    return {
        _archimedesDatabase: true,
        config: config,
        store: 'memory',

        /**
         * Register the models to the database.
         *
         * @params {Object} - {modelType: modelConfig}
         */
        register(models) {
            this.modelSchemas = models;
            _.forOwn(models, (ModelConfig, name) => {
                this[name] = modelFactory(this, name, ModelConfig);
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
            return new Promise((resolve) => {
                internals.store = [];
                return resolve();
            });
        },

        /**
         * Returns a promise with results that match the query
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

                var results = _.where(internals.store, validatedQuery) || [];
                if (!_.isArray(results)) {
                    results = [results];
                }
                return resolve(results);
            });
        },

        /**
         * Returns a promise with the first result that match the query
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

        /**
         * Update model in the store.
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

                this[modelType].first({_id: modelId, _type: modelType}).then((modelInstance) => {
                    if (modelInstance) {
                        for (let i = 0; i < operations.length; i++) {
                            let {operator, property, value} = operations[i];
                            modelInstance[operator](property, value);
                        }
                        return resolve(this.sync(modelType, modelInstance.attrs()));
                    } else {
                        return reject(new Error(`Can't update the model ${modelType}: unknown model id "${modelId}"`));
                    }
                });
            });
        },


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

                let {error, value} = this[modelType].schema.validate(pojo);

                if (error) {
                    return reject(new ValidationError(`${error[0].message}`, error));
                }

                internals.store.push(value);

                return resolve(value);

            });
        },


        batchSync(modelType, data) {
            return new Promise((resolve, reject) => {
                if (typeof modelType !== 'string') {
                    return reject(new Error('batchSync: modelType should be a string'));
                }

                if (!_.isArray(data)) {
                    return reject(new Error('batchSync: data should be an array'));
                }

                var promises = [];
                for (let i = 0; i < data.length; i++) {
                    let pojo = data[i];
                    promises.push(this.sync(modelType, pojo));
                }

                return resolve(Promise.all(promises));
            });
        },


        delete(modelType, modelId) {
            return new Error('not implemented');
        },

        count(modelType, query) {
            return new Error('not implemented');
            // return this.find(modelType, query).length;
        }
    };
}