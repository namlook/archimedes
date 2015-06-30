
import _ from 'lodash';
import modelFactory from './model';

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
         * Returns a promise with results that match the query
         *
         * @params {string} modelType - the model type
         * @params {?object} query - the query
         * @returns {promise}
         */
        find(modelType, query) {
            query = query || {};
            query._type = modelType;
            var results = _.find(internals.store, query) || [];
            if (!_.isArray(results)) {
                results = [results];
            }
            return results;
        },

        /**
         * Returns a promise with the first result that match the query
         *
         * @params {string} modelType - the model type
         * @params {?object} query - the query
         * @returns {promise}
         */
        first(modelType, query) {
            var results = this.find(modelType, query);
            if (results.length) {
                return results[0];
            }
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
                let modelInstance = this.first(modelType, {_id: modelId, _type: modelType});
                if (modelInstance) {
                    for (let i = 0; i < operations.length; i++) {
                        let {operator, property, value} = operations[i];
                        modelInstance[operator](property, value);
                    }
                    return resolve(this.sync(modelType, modelInstance));
                } else {
                    return reject(`${modelType}: can't update the model unknown model id "${modelId}"`);
                }
            });
        },

        sync(modelType, pojo) {
            return new Promise((resolve, reject) => {

                pojo._id = this.buildModelId();

                internals.store.push(pojo);

                return resolve(pojo);

            });
        },

        delete(modelType, modelInstanceOrId) {
            console.log('deleting', modelInstanceOrId._id);
        },

        count(modelType, query) {
            return this.find(modelType, query).length;
        }
    };
}