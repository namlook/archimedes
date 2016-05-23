'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
/** TODO put this in archimedes **/

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _modelSchemaProperty = require('./model-schema-property');

var _modelSchemaProperty2 = _interopRequireDefault(_modelSchemaProperty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// import ModelFixture from './model-fixture';

var ModelSchema = function () {
    function ModelSchema(modelClass) {
        _classCallCheck(this, ModelSchema);

        this.modelClass = modelClass;
        this.name = modelClass.name;
        this.db = modelClass.db;
        this._properties = {};
        this._inverseRelationships = {};
        this.__buildProperties();
        // this.fixtures = new ModelFixture(this);
    }

    _createClass(ModelSchema, [{
        key: '__buildProperties',
        value: function __buildProperties() {
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this.modelClass.mixinsChain[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var mixinName = _step.value;

                    var mixinStructure = this.db._modelStructures[mixinName];

                    var mixinProperties = mixinStructure.properties || {};
                    var _iteratorNormalCompletion2 = true;
                    var _didIteratorError2 = false;
                    var _iteratorError2 = undefined;

                    try {
                        for (var _iterator2 = Object.keys(mixinProperties)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                            var propName = _step2.value;

                            var property = new _modelSchemaProperty2.default(propName, mixinProperties[propName], this);
                            this._properties[propName] = property;
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

                    var mixinRelationships = mixinStructure.inverseRelationships || {};
                    var _iteratorNormalCompletion3 = true;
                    var _didIteratorError3 = false;
                    var _iteratorError3 = undefined;

                    try {
                        for (var _iterator3 = Object.keys(mixinRelationships)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                            var _propName = _step3.value;

                            var _property = new _modelSchemaProperty2.default(_propName, mixinRelationships[_propName], this, true);
                            this._inverseRelationships[_propName] = _property;
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
        }
    }, {
        key: 'getProperty',
        value: function getProperty(propertyName) {
            var property = void 0;

            /** if the property name is a relation **/
            if (_lodash2.default.includes(propertyName, '.')) {
                var relationName = propertyName.split('.')[0];
                var relation = this.getProperty(relationName);
                var relationPropertyName = propertyName.split('.').slice(1).join('.');

                // if (_.isArray(relation) && relation.length) {
                //     relation = relation[0];
                // } else {
                //     return undefined;
                // }

                // if (relation.isInverseRelationship()) {
                // relation = relation.getPropertyFromInverseRelationship();
                // }
                // let reversedProperties = relation.getPropertiesFromInverseRelationship();
                // reversedProperties = _.flatten(reversedProperties.map((prop) => {
                //     return prop.modelSchema.getProperty(relationPropertyName);
                // }));

                // reversedProperties = _.compact(_.flatten(reversedProperties));

                // return _.uniq(reversedProperties, function(item) {
                //     return `${item.modelSchema.name}.${item.name}`;
                // });

                // } else {
                if (relation) {
                    var relationSchema = this.db[relation.type].schema;
                    property = relationSchema.getProperty(relationPropertyName);
                }

                // }
            } else {
                    property = this._properties[propertyName];

                    if (!property) {
                        property = this._inverseRelationships[propertyName];
                    }

                    /*
                     * if there is no property, maybe the property asked
                     * is defined on another mixin. Let's find a list of potential
                     * list of model Name where the property might by defined.
                     */
                    if (!property) {
                        property = this.db.findProperties(propertyName, this.modelClass.mixinsChain);
                    }
                }

            return property;
        }
    }, {
        key: 'hasProperty',
        value: function hasProperty(propertyName) {
            return !!this.getProperty(propertyName);
        }

        /**
         * Returns all properties (inverse or not) that propagate deletion
         *
         * @returns a list of ModelSchemaProperty
         */

    }, {
        key: 'validate',


        /**
         * Validate a pojo against the schema
         *
         * @param {object} pojo
         * @params {object} options - the hapijs/joi options
         * @param {function} callback
         */
        value: function validate(pojo, options, callback) {
            if (typeof options === 'function' && !callback) {
                callback = options;
                options = {};
            }

            if (!options) {
                options = {};
            }

            if (options.abortEarly == null) {
                options.abortEarly = false;
            }

            if (options.convert == null) {
                options.convert = true;
            }

            if (!callback) {
                var _joi$validate = _joi2.default.validate(pojo, this._validator, options);

                var error = _joi$validate.error;
                var value = _joi$validate.value;

                // if (error) {
                // error = `${error.name}: ${error.details[0].message}`;
                // }

                if (error) {
                    error = error.details;
                }

                return { error: error, value: value };
            }

            _joi2.default.validate(pojo, this._validator, options, function (error, value) {
                if (error) {
                    return callback(error.details);
                }
                return callback(null, value);
            });
        }
    }, {
        key: 'properties',
        get: function get() {
            return _lodash2.default.values(this._properties);
        }
    }, {
        key: 'inverseRelationships',
        get: function get() {
            return _lodash2.default.values(this._inverseRelationships);
        }
    }, {
        key: 'propagateDeletionProperties',
        get: function get() {
            var allProperties = this.properties.concat(this.inverseRelationships);

            var results = allProperties.map(function (property) {
                if (property.propagateDeletion()) {
                    return property;
                }
            });

            return _lodash2.default.compact(results);
        }
    }, {
        key: '_validator',
        get: function get() {
            var validator = {};
            _lodash2.default.forOwn(this._properties, function (property, propertyName) {
                validator[propertyName] = property._validator;
            });

            // BIG HACK !!!
            validator._id = _joi2.default.string();
            validator._type = _joi2.default.string();
            // validator._ref = joi.string();
            // validator._uri = joi.string();
            // validator._class = joi.string();

            return validator;
        }
    }]);

    return ModelSchema;
}();

exports.default = ModelSchema;