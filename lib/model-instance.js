'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (db, modelClass, attrs) {

    attrs = attrs || {};
    attrs._type = modelClass.name;

    var internals = {
        pendingOperations: [],
        attrs: attrs
    };

    var instance = {
        _archimedesModelInstance: true,
        Model: modelClass,
        _type: modelClass.name,
        db: db,

        /**
         * Store the instance into the database.
         * If the instance is already saved (ie has an id), then
         * an update is performed, otherwise a sync is fired.
         *
         * @returns a promise which resolve into the saved document
         */
        save: function save() {
            var _this = this;

            return new _bluebird2.default(function (resolve, reject) {
                if (!_this._id) {
                    db.sync(_this._type, _this.attrs()).then(function (pojo) {
                        var modelInstance = _this.Model.wrap(pojo);
                        _this._id = pojo._id;
                        _lodash2.default.set(internals.attrs, '_id', pojo._id);
                        _this.clearPending();
                        return resolve(modelInstance);
                    }).catch(reject);
                } else {
                    db.update(_this._type, _this._id, internals.pendingOperations).then(function () {
                        _this.clearPending();
                        return resolve(_this);
                    }).catch(reject);
                }
            });
        },
        delete: function _delete() {
            var _this2 = this;

            return new _bluebird2.default(function (resolve, reject) {
                if (!_this2._id) {
                    return reject(new Error("Can't delete a not saved model instance"));
                }
                return resolve(db.delete(_this2._type, _this2._id));
            });
        },


        /**
         * Returns the property value
         *
         * @param {string} name - the property name
         * @returns the property value
         */
        get: function get(name) {
            return _lodash2.default.get(internals.attrs, name);
        },


        /**
         * Sets the property value
         *
         * @param {string} name - the property name
         * @param {AnyLike} value - the property value
         * @returns this
         */
        set: function set(name, value) {
            var oldValue = this.get(name);

            var property = this.Model.schema.getProperty(name);

            // if an unknown property name is passed, let's add it anyway.
            // the database.validate() method will take care of the rest
            if (!property) {
                internals.pendingOperations.push({ operator: 'set', property: name, value: value });
                _lodash2.default.set(internals.attrs, name, value);
                return this;
            }

            // if the property is an array, make a full replacement
            // by using the push/pull operators
            if (property.isArray()) {

                if (oldValue != null) {
                    this.pull(name, oldValue);
                }
                this.push(name, value);
            } else {
                var _property$validate = property.validate(value);

                var validatedValue = _property$validate.value;


                if (_lodash2.default.isEqual(oldValue, validatedValue)) {
                    return this;
                }

                if (oldValue != null) {
                    internals.pendingOperations.push({ operator: 'unset', property: name, value: oldValue });
                }

                if (value != null) {
                    internals.pendingOperations.push({ operator: 'set', property: name, value: value });
                }
                _lodash2.default.set(internals.attrs, name, value);
            }

            return this;
        },


        /**
         * Delete a property value
         *
         * @param {string} name - the property name
         * @returns this
         */
        unset: function unset(name) {
            var value = this.get(name);

            // if the property is an array, unset via the pull operator
            var property = this.Model.schema.getProperty(name);
            if (property.isArray()) {
                this.pull(name, value);
            } else {
                internals.pendingOperations.push({ operator: 'unset', property: name, value: value });
                delete internals.attrs[name];
            }

            return this;
        },


        /**
         * Add a value to a property array.
         * If the property value is undefined, then it creates an array.
         * If the value is null, undefined or an empty string, do nothing.
         *
         * @param {string} name - the property name
         * @param {AnyLike|array} values - a value or an array of values
         * @returns this
         */
        push: function push(name, values) {
            if (values == null || values === '') {
                return this;
            }

            if (!_lodash2.default.isArray(values)) {
                values = [values];
            }

            values = _lodash2.default.flatten(values);

            var property = this.Model.schema.getProperty(name);
            values = property.validate(values).value;

            var oldValues = internals.attrs[name] || [];
            var acceptedValues = [];

            var isNewValue = function isNewValue(value) {
                return !_lodash2.default.findLast(oldValues, function (item) {
                    return _lodash2.default.isEqual(item, value);
                });
            };

            for (var i = 0; i < values.length; i++) {

                /**
                 * Only append value that don't already exists
                 */
                if (isNewValue(values[i])) {
                    internals.pendingOperations.push({ operator: 'push', property: name, value: values[i] });
                    acceptedValues.push(values[i]);
                }
            }

            var uniqValues = _lodash2.default.uniqBy(oldValues.concat(acceptedValues), function (item) {
                return JSON.stringify(item);
            });

            internals.attrs[name] = _lodash2.default.sortBy(uniqValues);

            return this;
        },


        /**
         * Remove a value to a property array.
         * If after removing the value, the array is empty, then unset the
         * property value
         *
         * @param {string} name - the property name
         * @param {AnyLike|array} values - a value or an array of values
         * @returns this
         */
        pull: function pull(name, values) {
            var propValues = internals.attrs[name] || [];
            if (!_lodash2.default.isArray(values)) {
                values = [values];
            }

            for (var i = 0; i < values.length; i++) {
                internals.pendingOperations.push({ operator: 'pull', property: name, value: values[i] });
            }

            internals.attrs[name] = _lodash2.default.sortBy(_lodash2.default.without.apply(_lodash2.default, [propValues].concat(_toConsumableArray(values))));

            if (internals.attrs[name].length === 0) {
                // don't use unset() here, just remove the attribute from the object
                delete internals.attrs[name];
            }

            return this;
        },


        /**
         * Validates the model's attributes against the model schema
         *
         * @returns a promise which resolve to a pojo with the correct
         *     (casted if needed) values.
         */
        validate: function validate() {
            return db.validate(this._type, internals.attrs);
        },
        attrs: function attrs() {
            return internals.attrs;
        },
        toJSON: function toJSON() {
            return JSON.stringify(this.attrs());
        },
        toCsv: function toCsv(options) {
            var _this3 = this;

            return new _bluebird2.default(function (resolve, reject) {
                options = options || {};
                var delimiter = options.delimiter || ',';
                var fields = options.fields;

                var properties = void 0;
                if (fields) {
                    properties = [];
                    for (var i = 0; i < fields.length; i++) {
                        var propertyName = fields[i];
                        var property = _this3.Model.schema.getProperty(propertyName);
                        if (!property) {
                            reject(new Error('fields: unknown property "' + propertyName + '"'));
                        }
                        properties.push(property);
                    }
                } else {
                    properties = _this3.Model.schema.properties;
                }

                properties = _lodash2.default.sortBy(properties, 'name');

                var values = properties.map(function (property) {
                    var value = _this3.get(property.name);

                    if (!_lodash2.default.isArray(value)) {
                        if (value != null) {
                            value = [value];
                        } else {
                            value = [];
                        }
                    }

                    if (property.isRelation()) {
                        value = value.map(function (v) {
                            return v._id;
                        });
                    }

                    if (property.type === 'date') {
                        value = value.map(function (d) {
                            return d.toUTCString();
                        });
                    }

                    return value.join('|');
                });

                values.unshift(_this3.get('_type'));
                values.unshift(_this3.get('_id'));

                var csvOptions = { delimiter: delimiter, eof: false };

                _csv2.default.stringify([values], csvOptions, function (err, output) {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(output);
                });
            });
        },


        /**
         * Returns the model instance as into valid json api format
         *
         * @returns {object}
         */
        toJsonApi: function toJsonApi(baseUri, include) {
            var _this4 = this;

            var attributes = {};
            var relationships = {};

            if (_lodash2.default.isArray(include)) {
                include = { properties: true, included: include };
            }

            var _ref = include || {};

            var includedProperties = _ref.properties;
            var included = _ref.included;


            if (includedProperties === 1) {
                includedProperties = true;
            }

            if (includedProperties && !_lodash2.default.isArray(includedProperties) && !_lodash2.default.isBoolean(includedProperties)) {
                includedProperties = [includedProperties];
            }

            if (included && !_lodash2.default.isArray(included)) {
                throw new Error('toJsonApi(): included should be an array');
            }

            this.Model.schema.properties.forEach(function (property) {
                var value = _this4.get(property.name);

                var shouldBeIncluded = _lodash2.default.isBoolean(includedProperties) && includedProperties || _lodash2.default.includes(includedProperties, property.name);

                if (property.isRelation()) {
                    if (property.isArray()) {
                        if (value && !_lodash2.default.isEmpty(value)) {
                            value = value.map(function (o) {
                                var rel = { id: o._id, type: o._type };
                                if (shouldBeIncluded) {
                                    included.push(rel);
                                }
                                return rel;
                            });
                        } else {
                            value = null;
                        }
                    } else if (value) {
                        value = { id: value._id, type: value._type };
                        if (shouldBeIncluded) {
                            included.push(value);
                        }
                    }

                    if (value != null) {
                        var relationshipsData = {
                            data: value
                        };

                        if (baseUri) {
                            relationshipsData.links = {
                                self: baseUri + '/relationships/' + property.name,
                                related: baseUri + '/' + property.name
                            };
                        }

                        relationships[property.name] = relationshipsData;
                    }
                } else {
                    if (value != null) {
                        attributes[property.name] = value;
                    }
                }
            });

            var jsonApiData = {
                data: {
                    type: modelClass.name
                }
            };

            if (this.get('_id')) {
                jsonApiData.data.id = this.get('_id');
            }

            if (!_lodash2.default.isEmpty(attributes)) {
                jsonApiData.data.attributes = attributes;
            }

            if (!_lodash2.default.isEmpty(relationships)) {
                jsonApiData.data.relationships = relationships;
            }

            if (baseUri) {
                jsonApiData.data.links = {
                    self: baseUri
                };
            }

            if (included && included.length) {
                var uniqIncluded = _lodash2.default.uniqBy(included, function (o) {
                    return o.type + '/' + o.id;
                });
                included.length = 0; // clear the array without loosing the reference
                uniqIncluded.forEach(function (item) {
                    included.push(item);
                });
            }

            return jsonApiData;
        },


        /**
         * Returns all pending operations. An operations is represented as:
         *
         *  {
         *      operator: <string>, // set/unset/pull/push
         *      property: <string>, // the propertyName
         *      value: <any>, // the value of the operation
         *  }
         *
         * @returns an array of all pending operations
         */
        pending: function pending() {
            return internals.pendingOperations;
        },


        /**
         * Clears all pending operations
         *
         * @returns this
         */
        clearPending: function clearPending() {
            internals.pendingOperations = [];
            return this;
        }
    };

    /**
     * Attach the inverse relationships function
     */
    _lodash2.default.forOwn(modelClass.inverseRelationships, function (propConfig, propName) {
        instance[propName] = function (query, options) {
            var _this5 = this;

            query = query || {};
            options = options || {};

            return new _bluebird2.default(function (resolve, reject) {
                if (!_this5._id) {
                    return reject(new Error('cannot fetch relations from an unsaved instance'));
                }

                query[propConfig.property + '._id'] = _this5._id;

                return resolve(db[propConfig.type].find(query, options));
            });
        };
    });

    return instance;
};

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _csv = require('csv');

var _csv2 = _interopRequireDefault(_csv);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }