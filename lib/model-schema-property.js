'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _errors = require('./errors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var constraints2joi = function constraints2joi(modelName, propertyName, constraints) {
    var joiConstraint = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

    if (!joiConstraint) {
        joiConstraint = _joi2.default;
    }
    constraints.forEach(function (constraint) {
        if (_lodash2.default.isObject(constraint)) {
            var _joiConstraint;

            var constraintKeys = Object.keys(constraint);

            if (constraintKeys.length > 1) {
                throw new _errors.ValidationError(modelName + '.' + propertyName + ': the constraint ' + constraint + ' must a have only one key');
            }

            var constraintName = constraintKeys[0];

            if (!joiConstraint[constraintName]) {
                throw new _errors.ValidationError('unknown constraint "' + constraintName + '" for property ' + modelName + '.' + propertyName);
            }

            var constraintParams = constraint[constraintName];

            if (!_lodash2.default.isArray(constraintParams)) {
                constraintParams = [constraintParams];
            }

            joiConstraint = (_joiConstraint = joiConstraint)[constraintName].apply(_joiConstraint, _toConsumableArray(constraintParams));
        } else {
            if (!joiConstraint[constraint]) {
                throw new _errors.ValidationError('unknown constraint "' + constraint + '" for property ' + modelName + '.' + propertyName);
            }
            joiConstraint = joiConstraint[constraint]();
        }
    });
    return joiConstraint;
};

// var constraintsMonkeyPatch = function(validationConfig) {
//     var modelType = validationConfig[0];

//     if (modelType === 'integer') {
//         validationConfig.unshift('number');
//     } else if (modelType === 'float') {
//         validationConfig.shift();
//         validationConfig.unshift('number');
//     } else if (modelType === 'datetime') {
//         validationConfig.shift();
//         validationConfig.unshift('date');
//     }
// };

var ModelSchemaProperty = function () {
    function ModelSchemaProperty(name, config, modelSchema, isInverseRelationship) {
        _classCallCheck(this, ModelSchemaProperty);

        if (isInverseRelationship) {
            config = {
                type: 'array',
                items: {
                    type: config.type
                },
                abstract: {
                    fromReverse: config
                }
            };
        }

        this.name = name;
        this.config = config;
        this.modelSchema = modelSchema;
    }

    _createClass(ModelSchemaProperty, [{
        key: 'isRelation',
        value: function isRelation() {
            return !!this.modelSchema.db[this.type];
        }
    }, {
        key: 'isArray',
        value: function isArray() {
            return this.config.type === 'array';
        }
    }, {
        key: 'isAbstract',
        value: function isAbstract() {
            return !!this.config.abstract;
        }
    }, {
        key: 'isInverseRelationship',
        value: function isInverseRelationship() {
            return !!_lodash2.default.get(this.config, 'abstract.fromReverse');
        }
    }, {
        key: 'propagateDeletion',
        value: function propagateDeletion() {
            var config = this.config;
            if (this.isAbstract()) {
                config = this.config.abstract.fromReverse;
            }
            return _lodash2.default.get(config, 'propagateDeletion');
        }

        /**
        *   Return the inverse relationships specified in the property config
        *    Note that it will take the mixins in account.
        *
        *    Example with User and Comment which inherits with Content:
        *
        *    Content: {
        *        properties: {
        *            author: {
        *                type: 'User'
        *            }
        *        }
        *    }
        *
        *    Comment: {
        *        mixins: ['Content']
        *    }
        *
        *    User: {
        *        inverseRelationships: {
        *            contents: {
        *                type: 'Content',
        *                property: 'author'
        *            },
        *            comments: {
        *                type: 'Comment',
        *                property: 'author'
        *            }
        *        }
        *    }
        *
        *    let contentAuthor = db.Content.schema.getProperty('author');
        *    let commentAuthor = db.Comment.schema.getProperty('author');
        *
        *    contentAuthor.getInverseRelationshipsFromProperty() =>
        *        will returns an array with the User.contents property
        *
        *    commentAuthor.getInverseRelationshipsFromProperty() =>
        *        because Comment.author is inherited from Content.author, it will returns
        *        an array with the User.contents and User.comments properties
        *
        *
        * @return an array with all inverse relationships
        */

    }, {
        key: 'getInverseRelationshipsFromProperty',
        value: function getInverseRelationshipsFromProperty() {
            var db = this.modelSchema.db;
            var modelMixinsChain = this.modelSchema.modelClass.mixinsChain;

            if (this.isRelation() && !this.isInverseRelationship()) {
                var inverseRelationships = db[this.type].schema.inverseRelationships;


                var results = inverseRelationships.map(function (invRel) {
                    if (_lodash2.default.includes(modelMixinsChain, invRel.type)) {
                        return invRel;
                    }
                });
                return _lodash2.default.compact(results);
            }
        }

        /** returns the property that match the inverse relationship
         *
         * @returns an array of properties
         */

    }, {
        key: 'getPropertyFromInverseRelationship',
        value: function getPropertyFromInverseRelationship() {
            var db = this.modelSchema.db;

            var _$get = _lodash2.default.get(this.config, 'abstract.fromReverse', {});

            var property = _$get.property;
            var type = _$get.type;

            return db[type].schema._properties[property];
        }
    }, {
        key: 'validate',
        value: function validate(value) {
            return this._validator.validate(value);
        }
    }, {
        key: 'validateItem',
        value: function validateItem(value) {
            if (!this.isArray()) {
                throw new Error('validateItem: the property ' + this.name + ' is not an array');
            }
            value = [value];

            var _validator$validate = this._validator.validate(value);

            var error = _validator$validate.error;
            var validatedValue = _validator$validate.value;

            value = validatedValue[0];
            return { error: error, value: value };
        }
    }, {
        key: 'fixture',
        value: function fixture() {
            var value;
            if (this.isRelation()) {
                return undefined;
            }
            if (this.isArray()) {
                value = [];
                for (var i = 0; i < _lodash2.default.random(1, 8); i++) {
                    value.push(this._getFixtureValue());
                }
            } else {
                value = this._getFixtureValue();
            }
            return value;
        }
    }, {
        key: '_fixtureValue',
        value: function _fixtureValue() {
            if (this.config.fixture) {
                return this.config.fixture();
            }

            // generate fixture from type
            var today = new Date();
            var lorem = _lodash2.default.words('Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.');
            var pickInLorem = _lodash2.default.random(0, 40);
            var type2faker = {
                string: lorem.slice(pickInLorem, pickInLorem + _lodash2.default.random(4, 10)).join(' '),
                number: _lodash2.default.random(0, 100, true),
                integer: _lodash2.default.random(0, 100), // TODO REMOVE
                float: _lodash2.default.random(0, 100, true), // TODO REMOVE
                boolean: Boolean(_lodash2.default.random()),
                date: new Date(today.getFullYear(), today.getMonth(), _lodash2.default.random(1, 29)),
                datetime: new Date(today.getFullYear(), today.getMonth(), _lodash2.default.random(1, 29), _lodash2.default.random(1, 23), _lodash2.default.random(1, 59), _lodash2.default.random(1, 59))
            };
            return type2faker[this.type];
        }
    }, {
        key: 'type',
        get: function get() {
            if (this.isArray()) {
                return this.config.items.type;
            }
            return this.config.type;
        }
    }, {
        key: 'meta',
        get: function get() {
            return this.config.meta || {};
        }
    }, {
        key: 'validationConstraints',
        get: function get() {
            var validations = this.config.validate || [];
            var baseConstraints = [];
            if (this.isArray() || !this.isRelation()) {
                baseConstraints.push(this.config.type);
            }
            return baseConstraints.concat(validations);
        }
    }, {
        key: 'itemValidationConstraints',
        get: function get() {
            var items = this.config.items || {};
            var validations = items.validate || [];
            var baseConstraints = [];
            if (!this.isRelation() && items.type) {
                baseConstraints.push(items.type);
            }
            return baseConstraints.concat(validations);
        }
    }, {
        key: '_validator',
        get: function get() {
            var propertyName = this.name;
            var modelName = this.modelSchema.name;
            var constraints;

            var relationConstraints;
            if (this.isRelation()) {
                relationConstraints = _joi2.default.alternatives(_joi2.default.object().keys({
                    _id: _joi2.default.string().required().label(propertyName + '._id'),
                    _type: _joi2.default.string().required().label(propertyName + '._type')
                }), _joi2.default.string());
            }

            constraints = constraints2joi(modelName, propertyName, this.validationConstraints);

            if (this.isArray()) {

                var itemsConstraints;
                if (this.isRelation()) {
                    itemsConstraints = relationConstraints;
                } else {
                    itemsConstraints = constraints2joi(modelName, propertyName, this.itemValidationConstraints);
                }
                constraints = constraints.items(itemsConstraints);
            } else {

                if (this.isRelation()) {
                    constraints = relationConstraints;
                }
            }

            return constraints.label(this.name);
        }
    }]);

    return ModelSchemaProperty;
}();

exports.default = ModelSchemaProperty;