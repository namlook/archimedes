'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (config) {

    config = config || {};

    return function (db) {

        var internals = {};
        internals.store = [];

        return {
            name: 'memory',

            beforeRegister: function beforeRegister(models) {
                return new Promise(function (resolve) {
                    return resolve(models);
                });
            },
            afterRegister: function afterRegister(passedDb) {
                return new Promise(function (resolve) {
                    return resolve(passedDb);
                });
            },
            clear: function clear() {
                return new Promise(function (resolve) {
                    internals.store = [];
                    return resolve();
                });
            },
            find: function find(modelType, query) {
                return new Promise(function (resolve) {
                    var results = _lodash2.default.where(internals.store, query) || [];
                    if (!_lodash2.default.isArray(results)) {
                        results = [results];
                    }
                    return resolve(results);
                });
            },
            count: function count(modelType, query) {
                return new Promise(function (resolve) {
                    return resolve(_lodash2.default.where(internals.store, query).length);
                });
            },
            sync: function sync(modelType, pojo) {
                return new Promise(function (resolve) {
                    internals.store.push(pojo);
                    return resolve(pojo);
                });
            },
            batchSync: function batchSync(modelType, data) {
                return new Promise(function (resolve) {
                    var promises = [];
                    for (var i = 0; i < data.length; i++) {
                        var pojo = data[i];
                        promises.push(db.sync(modelType, pojo));
                    }

                    return resolve(Promise.all(promises));
                });
            },
            update: function update(modelType, modelId, operations) {
                return new Promise(function (resolve, reject) {
                    db[modelType].first({ _id: modelId, _type: modelType }).then(function (modelInstance) {
                        if (modelInstance) {
                            for (var i = 0; i < operations.length; i++) {
                                var _operations$i = operations[i];
                                var operator = _operations$i.operator;
                                var property = _operations$i.property;
                                var value = _operations$i.value;

                                modelInstance[operator](property, value);
                            }
                            return resolve(db.sync(modelType, modelInstance.attrs()));
                        } else {
                            return reject(new Error('Can\'t update the model ' + modelType + ': unknown model id "' + modelId + '"'));
                        }
                    });
                });
            },
            delete: function _delete(modelType, modelId) {
                return new Promise(function (resolve) {
                    internals.store = _lodash2.default.reject(internals.store, { _id: modelId, _type: modelType });
                    return resolve();
                });
            }
        };
    };
};

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }