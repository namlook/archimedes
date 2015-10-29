'use strict';

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _model = require('./model');

var _model2 = _interopRequireDefault(_model);

var _errors = require('./errors');

var _queryValidator5 = require('./query-validator');

var _queryValidator6 = _interopRequireDefault(_queryValidator5);

var _optionsValidator = require('./options-validator');

var _groupByValidator2 = require('./group-by-validator');

var _groupByValidator3 = _interopRequireDefault(_groupByValidator2);

var _operationsValidator = require('./operations-validator');

var _operationsValidator2 = _interopRequireDefault(_operationsValidator);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var validPropertyTypes = ['string', 'number', 'boolean', 'date', 'array'];

exports['default'] = function (dbAdapter, config) {

    if (!dbAdapter) {
        throw new Error('database: no adapter found');
    }

    var inner = {
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
        beforeRegister: function beforeRegister(models) {
            var _this = this;

            return new _bluebird2['default'](function (resolve, reject) {

                _lodash2['default'].forOwn(models, function (modelConfig, modelName) {

                    /** if the property config is a string, convert it into a valid config **/
                    _lodash2['default'].forOwn(modelConfig.properties, function (propConfig, propName) {
                        if (typeof propConfig === 'string') {
                            propConfig = { type: propConfig };
                        }
                        if (propConfig.type === 'array') {
                            if (!propConfig.items) {
                                return reject(new _errors.StructureError(modelName + ' if property\'s type is "array" then "items" should be specified (properties.' + propName + ')'));
                            }

                            if (typeof propConfig.items === 'string') {
                                propConfig.items = { type: propConfig.items };
                            }
                        } else if (!_lodash2['default'].contains(validPropertyTypes, propConfig.type)) {
                            if (!models[propConfig.type]) {
                                return reject(new _errors.StructureError(modelName + ' invalid type for property "' + propName + '"'));
                            }
                        }

                        if (propConfig.reverse) {
                            if (typeof propConfig.reverse === 'string') {
                                var propConfigType = propConfig.type;
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

                return resolve(_this.adapter.beforeRegister(models));
            });
        },

        /**
         * Hooks fired after the register() method
         *
         * @params {Object} - the database
         * @returns a promise which resolve into the database
         */
        afterRegister: function afterRegister(db) {
            return this.adapter.afterRegister(db);
        },

        /**
         * Register the models to the database.
         *
         * @params {Object} - {modelType: modelConfig}
         */
        register: function register(models) {
            var _this2 = this;

            return this.beforeRegister(models).then(function (processedModels) {
                _this2.modelSchemas = processedModels; // TODO remove ??

                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = _getIterator(_Object$keys(processedModels)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var _name = _step.value;

                        var modelConfig = processedModels[_name];
                        _this2._modelStructures[_name] = processedModels[_name];
                        _this2[_name] = (0, _model2['default'])(_this2, _name, modelConfig);
                        _this2.registeredModels[_name] = _this2[_name];
                        _this2._modelsByPlural[_this2[_name].meta.names.plural] = _this2[_name];
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator['return']) {
                            _iterator['return']();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                _this2.__checkInverseRelationships();
                _this2.__buildPropertiesCache();
                return _this2;
            }).then(function (db) {
                return _this2.afterRegister(db);
            });
        },

        __checkInverseRelationships: function __checkInverseRelationships() {
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = _getIterator(_Object$keys(this.registeredModels)), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var _name2 = _step2.value;

                    var model = this.registeredModels[_name2];

                    var inverseRelationships = model.schema._inverseRelationships;
                    var _iteratorNormalCompletion3 = true;
                    var _didIteratorError3 = false;
                    var _iteratorError3 = undefined;

                    try {
                        for (var _iterator3 = _getIterator(_Object$keys(inverseRelationships)), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                            var relationName = _step3.value;

                            var relationConf = inverseRelationships[relationName];
                            var targetProperty = relationConf.config.abstract.fromReverse.property;

                            if (!this[relationConf.type].schema._properties[targetProperty]) {
                                throw new _errors.StructureError('unknown property "' + targetProperty + '" for model "' + relationConf.type + '" in the inverse relationship: ' + _name2 + '.' + relationName);
                            }
                        }
                    } catch (err) {
                        _didIteratorError3 = true;
                        _iteratorError3 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion3 && _iterator3['return']) {
                                _iterator3['return']();
                            }
                        } finally {
                            if (_didIteratorError3) {
                                throw _iteratorError3;
                            }
                        }
                    }
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                        _iterator2['return']();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        },

        __buildPropertiesCache: function __buildPropertiesCache() {
            var models = _lodash2['default'].values(this.registeredModels);
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = _getIterator(models), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var model = _step4.value;

                    var properties = model._structure.properties || {};
                    var _iteratorNormalCompletion5 = true;
                    var _didIteratorError5 = false;
                    var _iteratorError5 = undefined;

                    try {
                        for (var _iterator5 = _getIterator(_Object$keys(properties)), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                            var propName = _step5.value;

                            var property = model.schema._properties[propName];
                            this._propertiesMap[property.name] = this._propertiesMap[property.name] || [];
                            this._propertiesMap[property.name].push(property);
                        }
                    } catch (err) {
                        _didIteratorError5 = true;
                        _iteratorError5 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion5 && _iterator5['return']) {
                                _iterator5['return']();
                            }
                        } finally {
                            if (_didIteratorError5) {
                                throw _iteratorError5;
                            }
                        }
                    }

                    var inverseRelationships = model._structure.inverseRelationships || {};
                    var _iteratorNormalCompletion6 = true;
                    var _didIteratorError6 = false;
                    var _iteratorError6 = undefined;

                    try {
                        for (var _iterator6 = _getIterator(_Object$keys(inverseRelationships)), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                            var propName = _step6.value;

                            var property = model.schema._inverseRelationships[propName];
                            this._propertiesMap[property.name] = this._propertiesMap[property.name] || [];
                            this._propertiesMap[property.name].push(property);
                        }
                    } catch (err) {
                        _didIteratorError6 = true;
                        _iteratorError6 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion6 && _iterator6['return']) {
                                _iterator6['return']();
                            }
                        } finally {
                            if (_didIteratorError6) {
                                throw _iteratorError6;
                            }
                        }
                    }
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4['return']) {
                        _iterator4['return']();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
            }
        },

        /**
         * Returns the model related to its plural name
         *
         * @params {string} - the plural name
         * @returns the model class
         */
        getModelFromPlural: function getModelFromPlural(pluralName) {
            return this._modelsByPlural[pluralName];
        },

        /**
         * Generate a uniq string which will be use as model id
         *
         * @returns {string} - the model id
         */
        buildModelId: function buildModelId() {
            return _uuid2['default'].v4();
            // let now = new Date();
            // let rand = Math.floor(Math.random() * 10000);
            // return parseInt(rand).toString(36) + parseInt(now.getTime()).toString(36);
        },

        /**
         * Remove all records in database
         *
         * @returns a promise
         */
        clear: function clear() {
            return this.adapter.clear();
        },

        validate: function validate(modelType, pojo) {
            var _this3 = this;

            return new _bluebird2['default'](function (resolve, reject) {

                if (!_this3[modelType]) {
                    return reject(new _errors.ValidationError('Unknown type ' + modelType, { pojo: pojo }));
                }

                var modelSchema = _this3[modelType].schema;

                var _modelSchema$validate = modelSchema.validate(pojo);

                var error = _modelSchema$validate.error;
                var value = _modelSchema$validate.value;

                if (error) {
                    pojo = pojo || {};

                    /*** hack for virtuoso: boolean are returned as integers **/
                    var virtuosoFix = false;

                    error.forEach(function (detail) {
                        var propertyName = detail.path;
                        var badValue = pojo[propertyName];
                        if (detail.type === 'boolean.base' && _lodash2['default'].contains([1, 0], badValue)) {
                            virtuosoFix = true;
                            pojo[propertyName] = Boolean(badValue);
                        }
                    });

                    if (virtuosoFix) {
                        process.nextTick(function () {
                            _this3.validate(modelType, pojo).then(function (validatedPojo) {
                                resolve(validatedPojo);
                            })['catch'](function (validationError) {
                                reject(new _errors.ValidationError('Bad value', validationError));
                            });
                        });
                    } else {
                        reject(new _errors.ValidationError('Bad value', error));
                    }
                } else {

                    resolve(value);
                }
            });
        },

        _validateOperations: function _validateOperations(modelType, operations) {
            var _this4 = this;

            return (0, _operationsValidator2['default'])(operations).then(function () {
                var modelSchema = _this4[modelType].schema;
                var _iteratorNormalCompletion7 = true;
                var _didIteratorError7 = false;
                var _iteratorError7 = undefined;

                try {
                    for (var _iterator7 = _getIterator(operations), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                        var operation = _step7.value;

                        var property = modelSchema.getProperty(operation.property);
                        if (!property) {
                            throw new _errors.ValidationError('Unknown property', 'unknown property "' + operation.property + '" on model "' + modelType + '"');
                        }

                        var validationResults = undefined;
                        if (property.isArray()) {
                            validationResults = property.validateItem(operation.value);
                        } else {
                            validationResults = property.validate(operation.value);
                        }

                        var _validationResults = validationResults;
                        var error = _validationResults.error;
                        var value = _validationResults.value;

                        if (error) {
                            throw new _errors.ValidationError('Bad value', error);
                        }
                        operation.value = value;
                    }
                } catch (err) {
                    _didIteratorError7 = true;
                    _iteratorError7 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion7 && _iterator7['return']) {
                            _iterator7['return']();
                        }
                    } finally {
                        if (_didIteratorError7) {
                            throw _iteratorError7;
                        }
                    }
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
        findProperties: function findProperties(propertyName, mixinNames) {
            var _this5 = this;

            var properties = this._propertiesMap[propertyName];

            if (mixinNames) {
                (function () {
                    if (!_lodash2['default'].isArray(mixinNames)) {
                        mixinNames = [mixinNames];
                    }

                    var allMixinNames = _lodash2['default'].uniq(_lodash2['default'].flatten(mixinNames.map(function (o) {
                        return _this5[o].mixinsChain;
                    })));

                    var filterFn = function filterFn(item) {
                        var mixinsChain = item.modelSchema.modelClass.mixinsChain;
                        return _lodash2['default'].intersection(allMixinNames, mixinsChain).length;
                    };

                    properties = _lodash2['default'].filter(properties, filterFn);

                    if (!properties.length) {
                        properties = undefined;
                    } else if (properties.length === 1) {
                        properties = properties[0];
                    } else {
                        console.log('AAAAAA', propertyName, mixinNames, properties);
                    }
                })();
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
        find: function find(modelType, query, options) {
            var _this6 = this;

            return _bluebird2['default'].resolve().then(function () {

                query = _Object$assign({}, query);
                options = options || {};

                if (typeof options.fields === 'string') {
                    options.fields = options.fields.split(',');
                }

                if (typeof options.sort === 'string') {
                    options.sort = options.sort.split(',');
                }

                options.limit = options.limit || 20;

                if (!modelType) {
                    throw new Error('find: modelType is required');
                }

                var _findOptionsValidator = (0, _optionsValidator.findOptionsValidator)(options, _this6, modelType);

                var optionError = _findOptionsValidator.error;
                var validatedOptions = _findOptionsValidator.value;

                if (optionError) {
                    throw new _errors.ValidationError('malformed options', optionError);
                }

                if (!query._type) {
                    query._type = modelType;
                }

                var _queryValidator = (0, _queryValidator6['default'])(_this6[modelType].schema, query);

                var queryError = _queryValidator.error;
                var validatedQuery = _queryValidator.value;

                if (queryError) {
                    throw new _errors.ValidationError('malformed query', queryError);
                }

                return _this6.adapter.find(modelType, validatedQuery, validatedOptions);
            }).then(function (data) {
                return _lodash2['default'].compact(data);
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
        stream: function stream(modelType, query, options) {
            query = _Object$assign({}, query);
            options = options || {};

            if (!modelType) {
                throw new Error('find: modelType is required');
            }

            if (typeof options.fields === 'string') {
                options.fields = options.fields.split(',');
            }

            if (typeof options.sort === 'string') {
                options.sort = options.sort.split(',');
            }

            var _findOptionsValidator2 = (0, _optionsValidator.findOptionsValidator)(options, this, modelType);

            var optionError = _findOptionsValidator2.error;
            var validatedOptions = _findOptionsValidator2.value;

            if (optionError) {
                throw new _errors.ValidationError('malformed options', optionError);
            }

            if (!query._type) {
                query._type = modelType;
            }

            var _queryValidator2 = (0, _queryValidator6['default'])(this[modelType].schema, query);

            var queryError = _queryValidator2.error;
            var validatedQuery = _queryValidator2.value;

            if (queryError) {
                throw new _errors.ValidationError('malformed query', queryError);
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
        first: function first(modelType, query, options) {
            var _this7 = this;

            return _bluebird2['default'].resolve().then(function () {
                return _this7.find(modelType, query, options);
            }).then(function (results) {
                var result = undefined;
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
        fetch: function fetch(modelType, id, options) {
            var _this8 = this;

            return _bluebird2['default'].resolve().then(function () {

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

                return _this8.adapter.fetch(modelType, id, options);
            }).then(function (pojo) {
                if (pojo) {
                    /** cast values **/
                    return _this8.validate(modelType, pojo);
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
        count: function count(modelType, query) {
            var _this9 = this;

            return _bluebird2['default'].resolve().then(function () {
                if (typeof modelType !== 'string') {
                    throw new Error('count: modelType should be a string');
                }

                if (query && !_lodash2['default'].isObject(query)) {
                    throw new Error('count: query should be an object');
                }

                query = query || {};
                query._type = modelType;

                var _queryValidator3 = (0, _queryValidator6['default'])(_this9[modelType].schema, query);

                var error = _queryValidator3.error;
                var validatedQuery = _queryValidator3.value;

                if (error) {
                    throw new _errors.ValidationError('malformed query', error);
                }

                return _this9.adapter.count(modelType, validatedQuery);
            });
        },

        groupBy: function groupBy(modelType, aggregator, query, options) {
            var _this10 = this;

            return _bluebird2['default'].resolve().then(function () {

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
                        aggregation: { operator: 'count', target: aggregator }
                    };
                }

                if (!aggregator.aggregation) {
                    aggregator.aggregation = { operator: 'count', target: aggregator.property };
                }

                if (typeof aggregator.aggregation === 'string') {
                    aggregator.aggregation = {
                        operator: aggregator.aggregation,
                        target: aggregator.property
                    };
                }

                var _groupByValidator = (0, _groupByValidator3['default'])(aggregator);

                var aggregatorError = _groupByValidator.error;
                var validatedAggregator = _groupByValidator.value;

                if (aggregatorError) {
                    throw new _errors.ValidationError('malformed aggregator', aggregatorError.details[0].message);
                }

                var modelSchema = _this10[modelType].schema;
                if (!modelSchema.getProperty(validatedAggregator.property)) {
                    throw new _errors.ValidationError('malformed aggregator', 'unknown property aggregator "' + validatedAggregator.property + '" on model "' + modelType + '"');
                }
                if (!modelSchema.getProperty(validatedAggregator.aggregation.target)) {
                    throw new _errors.ValidationError('malformed aggregator', 'unknown property target "' + validatedAggregator.aggregation.target + '" on model "' + modelType + '"');
                }

                if (query && !_lodash2['default'].isObject(query)) {
                    throw new Error('groupBy: query should be an object');
                }

                query = query || {};
                query._type = modelType;

                var _queryValidator4 = (0, _queryValidator6['default'])(_this10[modelType].schema, query);

                var queryError = _queryValidator4.error;
                var validatedQuery = _queryValidator4.value;

                if (queryError) {
                    throw new _errors.ValidationError('malformed query', queryError);
                }

                // TODO validate options

                return _this10.adapter.groupBy(modelType, validatedAggregator, validatedQuery, options);
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
        update: function update(modelType, modelId, operations) {
            var _this11 = this;

            return _bluebird2['default'].resolve().then(function () {

                if (typeof modelType !== 'string') {
                    throw new Error('update: modelType should be a string');
                }

                if (!_lodash2['default'].isArray(operations)) {
                    throw new Error('update: operations should be an array');
                }

                return _this11._validateOperations(modelType, operations);
            }).then(function (validatedOperations) {
                return _this11.adapter.update(modelType, modelId, validatedOperations);
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
        sync: function sync(modelType, pojo) {
            var _this12 = this;

            return _bluebird2['default'].resolve().then(function () {

                if (typeof modelType !== 'string') {
                    throw new Error('sync: modelType should be a string');
                }

                if (!_lodash2['default'].isObject(pojo)) {
                    throw new Error('sync: the document should be an object');
                }

                if (!pojo._id) {
                    pojo._id = _this12.buildModelId();
                }

                if (!pojo._type) {
                    pojo._type = modelType;
                }

                return _this12.validate(modelType, pojo);
            }).then(function (validatedPojo) {
                return _this12.adapter.sync(modelType, validatedPojo);
            });
        },

        /**
         * Sync an array of object. Act the same as #sync()
         *
         * @params {string} modelType
         * @params {array} data - an array of pojo
         * @returns a promise which resolve an array of the saved pojo
         */
        batchSync: function batchSync(modelType, data) {
            var _this13 = this;

            return _bluebird2['default'].resolve().then(function () {

                if (typeof modelType !== 'string') {
                    throw new Error('batchSync: modelType should be a string');
                }

                if (!_lodash2['default'].isArray(data)) {
                    throw new Error('batchSync: data should be an array');
                }

                var promises = [];
                for (var i = 0; i < data.length; i++) {
                    var pojo = data[i];

                    if (!_lodash2['default'].isObject(pojo)) {
                        throw new Error('sync: the document should be an object');
                    }

                    if (!pojo._id) {
                        pojo._id = _this13.buildModelId();
                    }

                    if (!pojo._type) {
                        pojo._type = modelType;
                    }

                    promises.push(_this13.validate(modelType, pojo));
                }

                return _bluebird2['default'].all(promises);
            }).then(function (pojos) {
                return _this13.adapter.batchSync(modelType, pojos);
            });
        },

        /**
         * Remove a record from the database
         *
         * @params {string} modelType - the model type
         * @params {string} modelId - the model id
         * @returns a promise
         */
        'delete': function _delete(modelType, modelId) {
            var _this14 = this;

            return _bluebird2['default'].resolve().then(function () {
                if (typeof modelType !== 'string') {
                    throw new Error('delete: modelType should be a string');
                }

                if (typeof modelId !== 'string') {
                    throw new Error('delete: id should be a string');
                }

                return _this14.adapter['delete'](modelType, modelId);
            });
        }
    };

    inner.adapter = dbAdapter(inner);
    return inner;
};

module.exports = exports['default'];