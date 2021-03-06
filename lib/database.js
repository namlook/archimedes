'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = function (dbAdapter, config) {

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

            return new _bluebird2.default(function (resolve, reject) {

                _lodash2.default.forOwn(models, function (modelConfig, modelName) {

                    /** if the property config is a string, convert it into a valid config **/
                    _lodash2.default.forOwn(modelConfig.properties, function (propConfig, propName) {
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
                        } else if (!_lodash2.default.includes(validPropertyTypes, propConfig.type)) {
                            if (!models[propConfig.type]) {
                                return reject(new _errors.StructureError('Invalid type for property "' + modelName + '.' + propName + '"'));
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

                    /** if there is no special types (_id, _type), add them **/
                    if (!_lodash2.default.get(modelConfig, 'properties._id')) {
                        _lodash2.default.set(modelConfig, 'properties._id', { type: 'string' });
                    }

                    if (!_lodash2.default.get(modelConfig, 'properties._type')) {
                        _lodash2.default.set(modelConfig, 'properties._type', { type: 'string' });
                    }
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
                    for (var _iterator = Object.keys(processedModels)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var name = _step.value;

                        var modelConfig = processedModels[name];
                        _this2._modelStructures[name] = processedModels[name];
                        _this2[name] = (0, _model2.default)(_this2, name, modelConfig);
                        _this2.registeredModels[name] = _this2[name];
                        _this2._modelsByPlural[_this2[name].meta.names.plural] = _this2[name];
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
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
                for (var _iterator2 = Object.keys(this.registeredModels)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var name = _step2.value;

                    var model = this.registeredModels[name];

                    var inverseRelationships = model.schema._inverseRelationships;
                    var _iteratorNormalCompletion3 = true;
                    var _didIteratorError3 = false;
                    var _iteratorError3 = undefined;

                    try {
                        for (var _iterator3 = Object.keys(inverseRelationships)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                            var relationName = _step3.value;

                            var relationConf = inverseRelationships[relationName];
                            var targetProperty = relationConf.config.abstract.fromReverse.property;

                            if (!this[relationConf.type].schema._properties[targetProperty]) {
                                throw new _errors.StructureError('unknown property "' + targetProperty + '" for model "' + relationConf.type + '" in the inverse relationship: ' + name + '.' + relationName);
                            }
                        }
                    } catch (err) {
                        _didIteratorError3 = true;
                        _iteratorError3 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion3 && _iterator3.return) {
                                _iterator3.return();
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
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        },
        __buildPropertiesCache: function __buildPropertiesCache() {
            var models = _lodash2.default.values(this.registeredModels);
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = models[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var model = _step4.value;

                    var properties = model._structure.properties || {};
                    var _iteratorNormalCompletion5 = true;
                    var _didIteratorError5 = false;
                    var _iteratorError5 = undefined;

                    try {
                        for (var _iterator5 = Object.keys(properties)[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
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
                            if (!_iteratorNormalCompletion5 && _iterator5.return) {
                                _iterator5.return();
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
                        for (var _iterator6 = Object.keys(inverseRelationships)[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                            var _propName = _step6.value;

                            var _property = model.schema._inverseRelationships[_propName];
                            this._propertiesMap[_property.name] = this._propertiesMap[_property.name] || [];
                            this._propertiesMap[_property.name].push(_property);
                        }
                    } catch (err) {
                        _didIteratorError6 = true;
                        _iteratorError6 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                                _iterator6.return();
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
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
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
            return _uuid2.default.v4();
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

        importStream: function importStream(arrayOrStreamOfPojos) {
            var that = this;

            var through = _highland2.default.pipeline(_highland2.default.map(_fp3.default.omitBy(_lodash2.default.isNull)), _highland2.default.flatMap(function (o) {
                return (0, _highland2.default)(that.validatePojo(o));
            }), that.adapter.importStream()
            // highland.map((o) => {console.log(o); return o;})
            );

            return arrayOrStreamOfPojos ? (0, _highland2.default)(arrayOrStreamOfPojos).pipe(through) : _highland2.default.pipeline(through);
        },

        importCsvStream: function importCsvStream(options) {

            options = _lodash2.default.defaultsDeep(options, {
                modelName: undefined,
                csv: {
                    delimiter: ',',
                    escapeChar: '"',
                    enclosedChar: '"',
                    arraySeparator: ','
                }
            });

            var that = this;

            var _normalizePojo = function _normalizePojo(item) {
                var modelName = item._type;
                var modelClass = that[modelName];
                if (!modelClass) {
                    throw new Error('unknown model "' + modelName + '" in property _type');
                }
                var modelSchema = modelClass.schema;

                return (0, _lodash2.default)(item).toPairs().map(function (_ref) {
                    var _ref2 = _slicedToArray(_ref, 2);

                    var propertyName = _ref2[0];
                    var value = _ref2[1];

                    if (_lodash2.default.includes(['_id', '_type'], propertyName)) {
                        return [propertyName, value];
                    }
                    var property = modelSchema.getProperty(propertyName);

                    // const _convertValue = function(_value) {
                    //     return property.isRelation()
                    //         ? {_id: _value, _type: property.type}
                    //         : _value;
                    // }

                    value = property.isArray() ? value.split(options.csv.arraySeparator) //.map(_convertValue)
                    : value; //_convertValue(value);

                    return [propertyName, value];
                }).fromPairs().value();
            };

            var _ensureTypeProperty = function _ensureTypeProperty(item) {
                item._type = item._type || options.modelName;
                if (!item._type) {
                    throw new Error('unknown _type');
                }
                return item;
            };

            return _highland2.default.pipeline(csvStream.createStream(options.csv), _highland2.default.filter(_fp3.default.get('_id')), _highland2.default.map(_fp3.default.omitBy(_highland2.default.not)), _highland2.default.map(_ensureTypeProperty), _highland2.default.map(_normalizePojo), _highland2.default.flatMap(function (o) {
                return (0, _highland2.default)(that.validatePojo(o));
            }), that.adapter.importStream());
        },

        csv2pojoStream: function csv2pojoStream(csvOptions) {
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
            csvOptions = _lodash2.default.defaultsDeep(csvOptions, {
                constructResult: false,
                delimiter: ',',
                quote: '"'
            });

            return _highland2.default.pipeline(new _csvtojson2.default.Converter(csvOptions), _highland2.default.map(JSON.parse));
        },

        exportN3Stream: function exportN3Stream(n3config) {
            return this.adapter.exportN3Stream(n3config);
        },

        exportStream: function exportStream() {
            return this.adapter.exportStream();
        },

        save: function save(pojo) {
            var _this3 = this;

            return _bluebird2.default.resolve().then(function () {
                return _this3.validatePojo(pojo);
            }).then(function (validatedPojo) {
                return _this3.adapter.save(validatedPojo);
            });
        },

        saveStream: function saveStream(arrayOrStreamOfPojos) {
            var that = this;

            var through = _highland2.default.pipeline(_highland2.default.flatMap(function (o) {
                return (0, _highland2.default)(that.validatePojo(o));
            }), that.adapter.saveStream());

            return arrayOrStreamOfPojos ? (0, _highland2.default)(arrayOrStreamOfPojos).pipe(through) : _highland2.default.pipeline(through);
        },

        delete: function _delete(pojo) {
            return this.adapter.delete(pojo);
        },

        deleteStream: function deleteStream(arrayOrStreamOfPojos) {
            return this.adapter.deleteStream(arrayOrStreamOfPojos);
        },

        queryStream: function queryStream(modelName, query) {
            var that = this;
            return (0, _highland2.default)((0, _query2.default)(that, modelName).validate(query)).flatMap(function (validatedQuery) {
                return that.adapter.queryStream(modelName, validatedQuery);
            });
        },

        validatePojo: function validatePojo(pojo) {
            var _this4 = this;

            var joiOptions = {};
            return new _bluebird2.default(function (resolve, reject) {
                var validationErrors = [];

                if (!pojo._id) {
                    validationErrors.push('"_id" is required');
                }

                var modelClass = _this4[pojo._type];

                if (!pojo._type) {
                    validationErrors.push('"_type" is required');
                } else if (!modelClass) {
                    validationErrors.push('"_type": no model found in schema');
                }

                if (validationErrors.length) {
                    return reject(new _errors.ValidationError('malformed object', {
                        validationErrors: validationErrors.map(function (o) {
                            return { message: o };
                        }),
                        object: pojo
                    }));
                }

                pojo = _lodash2.default.omitBy(pojo, _lodash2.default.isUndefined);
                pojo = _lodash2.default.omitBy(pojo, _lodash2.default.isNull);

                var modelSchema = modelClass.schema;

                modelSchema.validate(pojo, joiOptions, function (error, value) {
                    if (error) {
                        return reject(new _errors.ValidationError('Bad value', {
                            validationErrors: error,
                            object: pojo
                        }));
                    }
                    value = _lodash2.default.omitBy(value, _lodash2.default.isUndefined);
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
        validate: function validate(modelType, pojo, options) {
            var _this5 = this;

            return new _bluebird2.default(function (resolve, reject) {

                if (!_this5[modelType]) {
                    return reject(new _errors.ValidationError('Unknown type ' + modelType, { pojo: pojo }));
                }

                pojo = _lodash2.default.omitBy(pojo, _lodash2.default.isUndefined);

                var modelSchema = _this5[modelType].schema;

                var _modelSchema$validate = modelSchema.validate(pojo, options);

                var error = _modelSchema$validate.error;
                var value = _modelSchema$validate.value;


                if (error) {
                    pojo = pojo || {};

                    /*** hack for virtuoso: boolean are returned as integers **/
                    var virtuosoFix = false;

                    error.forEach(function (detail) {
                        var propertyName = detail.path;
                        var badValue = pojo[propertyName];
                        if (detail.type === 'boolean.base' && _lodash2.default.includes([1, 0], badValue)) {
                            virtuosoFix = true;
                            pojo[propertyName] = Boolean(badValue);
                        }
                    });

                    if (virtuosoFix) {
                        process.nextTick(function () {
                            _this5.validate(modelType, pojo, options).then(function (validatedPojo) {
                                resolve(validatedPojo);
                            }).catch(function (validationError) {
                                reject(new _errors.ValidationError('Bad value', validationError));
                            });
                        });
                    } else {
                        reject(new _errors.ValidationError('Bad value', error));
                    }
                } else {

                    /*** remove undefined value ***/
                    value = _lodash2.default.omitBy(value, _lodash2.default.isUndefined);

                    resolve(value);
                }
            });
        },
        _validateOperations: function _validateOperations(modelType, operations) {
            var _this6 = this;

            return (0, _operationsValidator2.default)(operations).then(function () {
                var modelSchema = _this6[modelType].schema;
                var _iteratorNormalCompletion7 = true;
                var _didIteratorError7 = false;
                var _iteratorError7 = undefined;

                try {
                    for (var _iterator7 = operations[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                        var operation = _step7.value;

                        var property = modelSchema.getProperty(operation.property);
                        if (!property) {
                            throw new _errors.ValidationError('Unknown property', 'unknown property "' + operation.property + '" on model "' + modelType + '"');
                        }

                        var validationResults = void 0;
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
                        if (!_iteratorNormalCompletion7 && _iterator7.return) {
                            _iterator7.return();
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
            var _this7 = this;

            var properties = this._propertiesMap[propertyName];

            if (mixinNames) {
                (function () {
                    if (!_lodash2.default.isArray(mixinNames)) {
                        mixinNames = [mixinNames];
                    }

                    var allMixinNames = _lodash2.default.uniq(_lodash2.default.flatten(mixinNames.map(function (o) {
                        return _this7[o].mixinsChain;
                    })));

                    var filterFn = function filterFn(item) {
                        var mixinsChain = item.modelSchema.modelClass.mixinsChain;
                        return _lodash2.default.intersection(allMixinNames, mixinsChain).length;
                    };

                    properties = _lodash2.default.filter(properties, filterFn);

                    if (!properties.length) {
                        properties = undefined;
                    } else if (properties.length === 1) {
                        properties = properties[0];
                    } else {
                        console.error('AAAAAA', propertyName, mixinNames, properties);
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
            var _this8 = this;

            return _bluebird2.default.resolve().then(function () {

                if (!modelType) {
                    throw new Error('find: modelType is required');
                }

                if (!_this8[modelType]) {
                    throw new Error('find: Unknown modelType: "' + modelType + '"');
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

                var _findOptionsValidator = (0, _optionsValidator.findOptionsValidator)(options, _this8, modelType);

                var optionError = _findOptionsValidator.error;
                var validatedOptions = _findOptionsValidator.value;

                if (optionError) {
                    throw new _errors.ValidationError('malformed options', optionError);
                }

                if (!query._type) {
                    query._type = modelType;
                }

                var _queryValidator = (0, _queryValidator7.default)(_this8[modelType].schema, query);

                var queryError = _queryValidator.error;
                var validatedQuery = _queryValidator.value;


                if (queryError) {
                    throw new _errors.ValidationError('malformed query', queryError);
                }

                return _this8.adapter.find(modelType, validatedQuery, validatedOptions);
            }).then(function (data) {
                return _lodash2.default.compact(data);
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
            query = Object.assign({}, query);
            options = options || {};

            if (!modelType) {
                throw new Error('stream: modelType is required');
            }

            if (!this[modelType]) {
                throw new Error('stream: Unknown modelType: "' + modelType + '"');
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

            var _queryValidator2 = (0, _queryValidator7.default)(this[modelType].schema, query);

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
            var _this9 = this;

            return _bluebird2.default.resolve().then(function () {
                return _this9.find(modelType, query, options);
            }).then(function (results) {
                var result = void 0;
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
            var _this10 = this;

            return _bluebird2.default.resolve().then(function () {

                options = options || {};

                if (typeof options.fields === 'string') {
                    options.fields = options.fields.split(',');
                }

                if (typeof modelType !== 'string') {
                    throw new Error('fetch: modelType is required and should be a string');
                }

                if (!_this10[modelType]) {
                    throw new Error('fetch: Unknown modelType: "' + modelType + '"');
                }

                if (typeof id !== 'string') {
                    throw new Error('fetch: id is required and should be a string');
                }

                return _this10.adapter.fetch(modelType, id, options);
            }).then(function (pojo) {
                if (pojo) {
                    /** cast values **/
                    return _this10.validate(modelType, pojo);
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
            var _this11 = this;

            return _bluebird2.default.resolve().then(function () {
                if (typeof modelType !== 'string') {
                    throw new Error('count: modelType should be a string');
                }

                if (!_this11[modelType]) {
                    throw new Error('count: Unknown modelType: "' + modelType + '"');
                }

                if (query && !_lodash2.default.isObject(query)) {
                    throw new Error('count: query should be an object');
                }

                query = query || {};
                query._type = modelType;

                var _queryValidator3 = (0, _queryValidator7.default)(_this11[modelType].schema, query);

                var error = _queryValidator3.error;
                var validatedQuery = _queryValidator3.value;


                if (error) {
                    throw new _errors.ValidationError('malformed query', error);
                }

                return _this11.adapter.count(modelType, validatedQuery);
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
        aggregate: function aggregate(modelType, aggregator, query, options) {
            var _this12 = this;

            return _bluebird2.default.resolve().then(function () {
                if (typeof modelType !== 'string') {
                    throw new Error('aggregate: modelType should be a string');
                }

                if (!_this12[modelType]) {
                    throw new Error('aggregate: Unknown modelType: "' + modelType + '"');
                }

                if (!_lodash2.default.isObject(aggregator)) {
                    throw new Error('aggregate: aggregator is required and should be an object');
                }

                var modelClass = _this12[modelType];
                var _iteratorNormalCompletion8 = true;
                var _didIteratorError8 = false;
                var _iteratorError8 = undefined;

                try {
                    for (var _iterator8 = Object.keys(aggregator)[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                        var key = _step8.value;

                        var value = aggregator[key];
                        if (_lodash2.default.isObject(value)) {
                            var _iteratorNormalCompletion10 = true;
                            var _didIteratorError10 = false;
                            var _iteratorError10 = undefined;

                            try {
                                for (var _iterator10 = Object.keys(value)[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                                    var operator = _step10.value;


                                    if (validAggregationOperators.indexOf(operator.toLowerCase()) === -1) {
                                        throw new _errors.ValidationError('aggregate: unknown operator "' + operator + '"');
                                    }

                                    var propertyName = value[operator];
                                    if (!(operator === '$count' && propertyName === true)) {
                                        if (!modelClass.schema.getProperty(propertyName)) {
                                            var ispecialProperty = _lodash2.default.includes(['_id', '_type'], propertyName) || _lodash2.default.endsWith(propertyName, '._id') || _lodash2.default.endsWith(propertyName, '._type');
                                            if (!ispecialProperty) {
                                                throw new _errors.ValidationError('aggregate: unknown property "' + propertyName + '" for model "' + modelType + '"');
                                            }
                                        }
                                    }
                                }
                            } catch (err) {
                                _didIteratorError10 = true;
                                _iteratorError10 = err;
                            } finally {
                                try {
                                    if (!_iteratorNormalCompletion10 && _iterator10.return) {
                                        _iterator10.return();
                                    }
                                } finally {
                                    if (_didIteratorError10) {
                                        throw _iteratorError10;
                                    }
                                }
                            }
                        } else {
                            if (!modelClass.schema.getProperty(value)) {
                                var _ispecialProperty = _lodash2.default.includes(['_id', '_type'], value) || _lodash2.default.endsWith(value, '._id') || _lodash2.default.endsWith(value, '._type');
                                if (!_ispecialProperty) {
                                    throw new _errors.ValidationError('aggregate: unknown property "' + value + '" for model "' + modelType + '"');
                                }
                            }
                        }
                    }
                } catch (err) {
                    _didIteratorError8 = true;
                    _iteratorError8 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion8 && _iterator8.return) {
                            _iterator8.return();
                        }
                    } finally {
                        if (_didIteratorError8) {
                            throw _iteratorError8;
                        }
                    }
                }

                if (query && !_lodash2.default.isObject(query)) {
                    throw new Error('aggregate: query should be an object');
                }

                query = query || {};
                query._type = modelType;

                var _queryValidator4 = (0, _queryValidator7.default)(_this12[modelType].schema, query);

                var error = _queryValidator4.error;
                var validatedQuery = _queryValidator4.value;


                if (error) {
                    throw new _errors.ValidationError('malformed query', error);
                }

                options = options || {};

                if (typeof options.sort === 'string') {
                    options.sort = options.sort.split(',');
                }

                if (_lodash2.default.get(options, 'sort', []).length) {
                    var _iteratorNormalCompletion9 = true;
                    var _didIteratorError9 = false;
                    var _iteratorError9 = undefined;

                    try {
                        for (var _iterator9 = options.sort[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                            var variable = _step9.value;

                            if (variable[0] === '-') {
                                variable = variable.slice(1);
                            }
                            if (Object.keys(aggregator).indexOf(variable) === -1) {
                                throw new _errors.ValidationError('aggregate: unknown sorting constraint "' + variable + '"');
                            }
                        }
                    } catch (err) {
                        _didIteratorError9 = true;
                        _iteratorError9 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion9 && _iterator9.return) {
                                _iterator9.return();
                            }
                        } finally {
                            if (_didIteratorError9) {
                                throw _iteratorError9;
                            }
                        }
                    }
                }

                options.limit = options.limit || 100;

                return _this12.adapter.aggregate(modelType, aggregator, validatedQuery, options);
            });
        },
        groupBy: function groupBy(modelType, aggregator, query, options) {
            var _this13 = this;

            return _bluebird2.default.resolve().then(function () {

                options = options || {};

                if (typeof modelType !== 'string') {
                    throw new Error('groupBy: modelType should be a string');
                }

                if (!_this13[modelType]) {
                    throw new Error('groupBy: Unknown modelType: "' + modelType + '"');
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

                if (!_lodash2.default.isArray(aggregator.property)) {
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

                var _groupByValidator = (0, _groupByValidator3.default)(aggregator);

                var aggregatorError = _groupByValidator.error;
                var validatedAggregator = _groupByValidator.value;


                if (aggregatorError) {
                    throw new _errors.ValidationError('malformed aggregator', aggregatorError.details[0].message);
                }

                var modelSchema = _this13[modelType].schema;
                var _iteratorNormalCompletion11 = true;
                var _didIteratorError11 = false;
                var _iteratorError11 = undefined;

                try {
                    for (var _iterator11 = validatedAggregator.property[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
                        var propertyName = _step11.value;

                        if (!modelSchema.getProperty(propertyName)) {
                            throw new _errors.ValidationError('malformed aggregator', 'unknown property aggregator "' + validatedAggregator.property + '" on model "' + modelType + '"');
                        }
                    }
                } catch (err) {
                    _didIteratorError11 = true;
                    _iteratorError11 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion11 && _iterator11.return) {
                            _iterator11.return();
                        }
                    } finally {
                        if (_didIteratorError11) {
                            throw _iteratorError11;
                        }
                    }
                }

                if (!modelSchema.getProperty(validatedAggregator.aggregation.target)) {
                    throw new _errors.ValidationError('malformed aggregator', 'unknown property target "' + validatedAggregator.aggregation.target + '" on model "' + modelType + '"');
                }

                if (query && !_lodash2.default.isObject(query)) {
                    throw new Error('groupBy: query should be an object');
                }

                query = query || {};
                query._type = modelType;

                var _queryValidator5 = (0, _queryValidator7.default)(_this13[modelType].schema, query);

                var queryError = _queryValidator5.error;
                var validatedQuery = _queryValidator5.value;


                if (queryError) {
                    throw new _errors.ValidationError('groupBy: malformed query', queryError);
                }

                // TODO validate options
                if (!_lodash2.default.get(options, 'sort', []).length) {
                    if (aggregator.property.length > 1) {
                        options.sort = [].concat(aggregator.property);
                    }
                }

                var _iteratorNormalCompletion12 = true;
                var _didIteratorError12 = false;
                var _iteratorError12 = undefined;

                try {
                    for (var _iterator12 = _lodash2.default.get(options, 'sort', [])[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
                        var _propertyName = _step12.value;

                        var property = _this13[modelType].schema.getProperty(_propertyName);
                        if (!property) {
                            throw new _errors.ValidationError('sort: unknown property "' + _propertyName + '" on model "' + modelType + '"');
                        }
                    }
                } catch (err) {
                    _didIteratorError12 = true;
                    _iteratorError12 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion12 && _iterator12.return) {
                            _iterator12.return();
                        }
                    } finally {
                        if (_didIteratorError12) {
                            throw _iteratorError12;
                        }
                    }
                }

                return _this13.adapter.groupBy(modelType, validatedAggregator, validatedQuery, options);
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
            var _this14 = this;

            return _bluebird2.default.resolve().then(function () {

                if (typeof modelType !== 'string') {
                    throw new Error('update: modelType should be a string');
                }

                if (!_this14[modelType]) {
                    throw new Error('update: Unknown modelType: "' + modelType + '"');
                }

                if (!_lodash2.default.isArray(operations)) {
                    throw new Error('update: operations should be an array');
                }

                return _this14._validateOperations(modelType, operations);
            }).then(function (validatedOperations) {
                if (validatedOperations.length) {
                    return _this14.adapter.update(modelType, modelId, validatedOperations);
                }
                return _bluebird2.default.resolve();
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
        sync: function sync(modelType, pojo, options) {
            var _this15 = this;

            return _bluebird2.default.resolve().then(function () {

                if (typeof modelType !== 'string') {
                    throw new Error('sync: modelType should be a string');
                }

                if (!_this15[modelType]) {
                    throw new Error('sync: Unknown modelType: "' + modelType + '"');
                }

                if (!_lodash2.default.isObject(pojo)) {
                    throw new Error('sync: the document should be an object');
                }

                if (!pojo._id) {
                    pojo._id = _this15.buildModelId();
                }

                if (!pojo._type) {
                    pojo._type = modelType;
                }

                return _this15.validate(modelType, pojo, options);
            }).then(function (validatedPojo) {
                return _this15.adapter.sync(modelType, validatedPojo);
            });
        },


        /**
         * Sync an array of object. Act the same as #sync()
         *
         * @params {string} modelType
         * @params {array} data - an array of pojo
         * @returns a promise which resolve an array of the saved pojo
         */
        _batchSync: function _batchSync(modelType, data) {
            var _this16 = this;

            return _bluebird2.default.resolve().then(function () {

                if (typeof modelType !== 'string') {
                    throw new Error('batchSync: modelType should be a string');
                }

                if (!_this16[modelType]) {
                    throw new Error('batchSync: Unknown modelType: "' + modelType + '"');
                }

                if (!_lodash2.default.isArray(data)) {
                    throw new Error('batchSync: data should be an array');
                }

                var promises = [];
                for (var i = 0; i < data.length; i++) {
                    var pojo = data[i];

                    if (!_lodash2.default.isObject(pojo)) {
                        throw new Error('sync: the document should be an object');
                    }

                    if (!pojo._id) {
                        pojo._id = _this16.buildModelId();
                    }

                    if (!pojo._type) {
                        pojo._type = modelType;
                    }

                    promises.push(_this16.validate(modelType, pojo));
                }

                return _bluebird2.default.all(promises);
            }).then(function (pojos) {
                return _this16.adapter.batchSync(modelType, pojos);
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
            var _this17 = this;

            return _bluebird2.default.resolve().then(function () {

                if (typeof modelType !== 'string') {
                    throw new Error('batchSync: modelType should be a string');
                }

                if (!_this17[modelType]) {
                    throw new Error('batchSync: Unknown modelType: "' + modelType + '"');
                }

                if (!_lodash2.default.isArray(data)) {
                    throw new Error('batchSync: data should be an array');
                }

                var promises = [];
                for (var i = 0; i < data.length; i++) {
                    var pojo = data[i];

                    if (!_lodash2.default.isObject(pojo)) {
                        throw new Error('sync: the document should be an object');
                    }

                    if (!pojo._id) {
                        pojo._id = _this17.buildModelId();
                    }

                    if (!pojo._type) {
                        pojo._type = modelType;
                    }

                    promises.push(_this17.validate(modelType, pojo));
                }

                return _bluebird2.default.all(promises);
            }).then(function (pojos) {
                return new _bluebird2.default(function (resolve, reject) {

                    var writeStream = _this17.writableStream(modelType);
                    var stream = _eventStream2.default.readArray(pojos).pipe(writeStream);
                    stream.on('error', function (error) {
                        reject(error);
                    });

                    stream.on('end', function () {
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

        clearResource: function clearResource(modelType) {
            var _this18 = this;

            return _bluebird2.default.resolve().then(function () {
                if (typeof modelType !== 'string') {
                    throw new Error('clearResource: modelType should be a string');
                }

                if (!_this18[modelType]) {
                    throw new Error('clearResource: Unknown modelType: "' + modelType + '"');
                }

                return _this18.adapter.clearResource(modelType);
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
        writableStream: function writableStream(modelType, options) {
            options = options || {};

            var db = this;
            var count = 1;
            var dryRun = false;
            if (options.dryRun != null) {
                dryRun = options.dryRun;
                delete options.dryRun;
            }

            return _eventStream2.default.map(function (pojo, callback) {
                if (_lodash2.default.isEmpty(pojo)) {
                    return callback(null, null);
                }

                if (pojo._archimedesModelInstance) {
                    pojo = pojo.attrs();
                }

                var line = { pojo: pojo, count: count++ };
                if (dryRun) {
                    db.validate(modelType, pojo, options).then(function () {
                        callback(null);
                    }).catch(function (error) {
                        error.line = line;
                        callback(error);
                    });
                } else {
                    db.sync(modelType, pojo, options).then(function (savedDoc) {
                        callback(null, savedDoc);
                    }).catch(function (error) {
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
        csvStreamParse: function csvStreamParse(modelType, stream, options) {

            if (!this[modelType]) {
                throw new Error('importCsv: Unknown modelType: "' + modelType + '"');
            }

            var db = this;
            var Model = db[modelType];

            options = options || {};

            if (options.escapeChar == null) {
                options.escapeChar = '"';
            }

            if (options.enclosedChar == null) {
                options.enclosedChar = '"';
            }

            var propertyNames = Object.keys(db[modelType].schema._properties);
            var header = _lodash2.default.sortBy(propertyNames);
            header.unshift('_type');
            header.unshift('_id');

            var stripUnknown = options.stripUnknown;
            options = {
                delimiter: options.delimiter || ',',
                escapeChar: options.escapeChar,
                enclosedChar: options.enclosedChar
            };

            var csvStreamTransform = csvStream.createStream(options);

            var count = 1;
            var csv2pojoTransform = _eventStream2.default.map(function (pojo, callback) {

                var record = {};

                // is it the header ?
                if (pojo._id === '_id' && pojo._type === '_type') {
                    callback(null);
                }

                var line = { pojo: pojo, count: count++ };

                var _iteratorNormalCompletion13 = true;
                var _didIteratorError13 = false;
                var _iteratorError13 = undefined;

                try {
                    for (var _iterator13 = Object.keys(pojo)[Symbol.iterator](), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
                        var propertyName = _step13.value;


                        if (pojo[propertyName] !== '') {

                            var value = pojo[propertyName];

                            if (!_lodash2.default.includes(['_id', '_type'], propertyName)) {
                                var property = Model.schema.getProperty(propertyName);
                                if (!property) {
                                    if (stripUnknown) {
                                        continue;
                                    }
                                    var error = new _errors.ValidationError('Bad value', 'unknown property "' + propertyName + '" for model "' + Model.name + '"');
                                    error.line = line;
                                    return callback(error);
                                }
                                if (property.isRelation()) {
                                    if (property.isArray()) {
                                        var values = [];
                                        var _iteratorNormalCompletion14 = true;
                                        var _didIteratorError14 = false;
                                        var _iteratorError14 = undefined;

                                        try {
                                            for (var _iterator14 = value.split('|')[Symbol.iterator](), _step14; !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next()).done); _iteratorNormalCompletion14 = true) {
                                                var item = _step14.value;

                                                values.push({ _id: item, _type: property.type });
                                            }
                                        } catch (err) {
                                            _didIteratorError14 = true;
                                            _iteratorError14 = err;
                                        } finally {
                                            try {
                                                if (!_iteratorNormalCompletion14 && _iterator14.return) {
                                                    _iterator14.return();
                                                }
                                            } finally {
                                                if (_didIteratorError14) {
                                                    throw _iteratorError14;
                                                }
                                            }
                                        }

                                        value = values;
                                    } else {
                                        value = { _id: value, _type: property.type };
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
                } catch (err) {
                    _didIteratorError13 = true;
                    _iteratorError13 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion13 && _iterator13.return) {
                            _iterator13.return();
                        }
                    } finally {
                        if (_didIteratorError13) {
                            throw _iteratorError13;
                        }
                    }
                }

                callback(null, record);
            });

            return stream.pipe(csvStreamTransform).pipe(csv2pojoTransform);
        }
    };

    inner.adapter = dbAdapter(inner);
    return inner;
};

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _model = require('./model');

var _model2 = _interopRequireDefault(_model);

var _errors = require('./errors');

var _queryValidator6 = require('./query-validator');

var _queryValidator7 = _interopRequireDefault(_queryValidator6);

var _optionsValidator = require('./options-validator');

var _groupByValidator2 = require('./group-by-validator');

var _groupByValidator3 = _interopRequireDefault(_groupByValidator2);

var _operationsValidator = require('./operations-validator');

var _operationsValidator2 = _interopRequireDefault(_operationsValidator);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _csv = require('csv');

var _csv2 = _interopRequireDefault(_csv);

var _eventStream = require('event-stream');

var _eventStream2 = _interopRequireDefault(_eventStream);

var _csvtojson = require('csvtojson');

var _csvtojson2 = _interopRequireDefault(_csvtojson);

var _highland = require('highland');

var _highland2 = _interopRequireDefault(_highland);

var _fp2 = require('lodash/fp');

var _fp3 = _interopRequireDefault(_fp2);

var _query = require('./validators/query');

var _query2 = _interopRequireDefault(_query);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var validPropertyTypes = ['string', 'number', 'boolean', 'date', 'array'];

var validAggregationOperators = ['$count', '$max', '$min', '$avg', '$sum', '$concat'];
// import csvStream from 'csv-stream';