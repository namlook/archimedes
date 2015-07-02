
import _ from 'lodash';

export default function(db) {

    var internals = {};
    internals.store = [];

    return {
        name: 'memory',

        clear() {
            return new Promise((resolve) => {
                internals.store = [];
                return resolve();
            });
        },

        find(modelType, query) {
            return new Promise((resolve) => {
                var results = _.where(internals.store, query) || [];
                if (!_.isArray(results)) {
                    results = [results];
                }
                return resolve(results);
            });
        },

        count(modelType, query) {
            return new Promise((resolve) => {
                return resolve(_.where(internals.store, query).length);
            });
        },


        sync(modelType, pojo) {
            return new Promise((resolve) => {
                internals.store.push(pojo);
                return resolve(pojo);

            });
        },

        batchSync(modelType, data) {
            return new Promise((resolve) => {
                var promises = [];
                for (let i = 0; i < data.length; i++) {
                    let pojo = data[i];
                    promises.push(db.sync(modelType, pojo));
                }

                return resolve(Promise.all(promises));
            });
        },

        update(modelType, modelId, operations) {
            return new Promise((resolve, reject) => {
                db[modelType].first({_id: modelId, _type: modelType}).then((modelInstance) => {
                    if (modelInstance) {
                        for (let i = 0; i < operations.length; i++) {
                            let {operator, property, value} = operations[i];
                            modelInstance[operator](property, value);
                        }
                        return resolve(db.sync(modelType, modelInstance.attrs()));
                    } else {
                        return reject(new Error(`Can't update the model ${modelType}: unknown model id "${modelId}"`));
                    }
                });
            });
        },

        delete(modelType, modelId) {
            return new Promise((resolve) => {
                internals.store = _.reject(internals.store, {_id: modelId, _type: modelType});
                return resolve();
            });
        }

    };
}