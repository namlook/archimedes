'use strict';

var _toConsumableArray = require('babel-runtime/helpers/to-consumable-array')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _modelInstance = require('./model-instance');

var _modelInstance2 = _interopRequireDefault(_modelInstance);

var _errors = require('./errors');

var _modelSchema = require('./model-schema');

var _modelSchema2 = _interopRequireDefault(_modelSchema);

var _inflected = require('inflected');

var _inflected2 = _interopRequireDefault(_inflected);

var propertyConfigValidator = {
    type: _joi2['default'].string().required(),
    validate: _joi2['default'].array().items(_joi2['default'].alternatives()['try'](_joi2['default'].string(), _joi2['default'].object())),
    meta: _joi2['default'].object()
};

var modelClassSchemaValidator = _joi2['default'].object().keys({
    meta: _joi2['default'].object(),
    mixins: _joi2['default'].array().items(_joi2['default'].string()),
    properties: _joi2['default'].object().pattern(/.+/, _joi2['default'].alternatives()['try'](_joi2['default'].object().keys(propertyConfigValidator).keys({
        items: _joi2['default'].alternatives()['try'](_joi2['default'].string(), propertyConfigValidator),
        propagateDeletion: _joi2['default'].boolean(),
        label: _joi2['default'].string(),
        description: _joi2['default'].string(),
        abstract: _joi2['default'].alternatives()['try'](_joi2['default'].boolean()['default'](false), _joi2['default'].object().keys({
            fromReverse: _joi2['default'].object().keys({
                type: _joi2['default'].string(),
                property: _joi2['default'].string(),
                targets: _joi2['default'].array().items(_joi2['default'].string())
            })
        }))
    }), _joi2['default'].string())),
    inverseRelationships: _joi2['default'].object().pattern(/.+/, _joi2['default'].object().keys({
        type: _joi2['default'].string(),
        property: _joi2['default'].string(),
        label: _joi2['default'].string(),
        description: _joi2['default'].string(),
        propagateDeletion: _joi2['default'].alternatives()['try'](_joi2['default'].boolean(), _joi2['default'].string())
    })),
    methods: _joi2['default'].object().pattern(/.+/, _joi2['default'].func()),
    statics: _joi2['default'].object().pattern(/.+/, _joi2['default'].func())
});

var modelFactory = function modelFactory(db, name, modelClassSchema) {

    /**
     * validate the model class schema
     */

    var _joi$validate = _joi2['default'].validate(modelClassSchema, modelClassSchemaValidator);

    var error = _joi$validate.error;
    var validatedSchema = _joi$validate.value;

    if (error) {
        var errorDetail = error.details[0];
        var path = ' (' + errorDetail.path + ')';
        if (!_lodash2['default'].contains(path, '.')) {
            path = '';
        }
        throw new _errors.StructureError(name + ' ' + errorDetail.message + path, error);
    }

    /**
     * process the mixins
     */
    validatedSchema.mixins = validatedSchema.mixins || [];

    var mixins = validatedSchema.mixins.map(function (mixinName) {
        if (!db.modelSchemas[mixinName]) {
            throw new _errors.StructureError(name + ': unknown mixin "' + mixinName + '"');
        }
        return modelFactory(db, mixinName, db.modelSchemas[mixinName]);
    });

    mixins.push(_lodash2['default'].omit(validatedSchema, 'mixins'));

    /**
     * process mixins chain
     */
    var mixinsChain = _lodash2['default'].flatten(mixins.map(function (mixin) {
        return mixin.mixinsChain;
    }));
    mixinsChain.push(name);

    /**
     * process the properties and aggregate them from mixins
     */
    // var properties = mixins.map(mixin => {
    // return mixin.properties;
    // });
    // properties = _.assign({}, ..._.compact(properties));

    /**
     * process the inversed relationships and aggregate them from mixins
     */
    var inverseRelationships = mixins.map(function (mixin) {
        return mixin.inverseRelationships;
    });
    inverseRelationships = _lodash2['default'].assign.apply(_lodash2['default'], [{}].concat(_toConsumableArray(_lodash2['default'].compact(inverseRelationships))));

    /**
     * process the methods and aggregate them from mixins
     */
    var methods = mixins.map(function (mixin) {
        return mixin.methods;
    });
    methods = _lodash2['default'].assign.apply(_lodash2['default'], [{}].concat(_toConsumableArray(_lodash2['default'].compact(methods))));

    /**
     * process the static methods and aggregate them from mixins
     */
    var staticMethods = mixins.map(function (mixin) {
        return mixin.statics;
    });
    staticMethods = _lodash2['default'].assign.apply(_lodash2['default'], [{}].concat(_toConsumableArray(_lodash2['default'].compact(staticMethods))));

    /**
     * fill meta stuff
     */

    var meta = validatedSchema.meta;
    var dasherizedName = _inflected2['default'].dasherize(_inflected2['default'].underscore(name));
    var plural = _lodash2['default'].get(meta, 'names.plural') || _inflected2['default'].pluralize(dasherizedName);
    _lodash2['default'].set(validatedSchema, 'meta.names.dasherized', dasherizedName);
    _lodash2['default'].set(validatedSchema, 'meta.names.plural', plural);

    /**
     * construct the Model
     */
    var inner = {
        name: name,
        db: db,
        _structure: new function () {
            return validatedSchema;
        }(),
        meta: new function () {
            return validatedSchema.meta;
        }(),
        mixins: mixins,
        mixinsChain: new function () {
            return _lodash2['default'].uniq(_lodash2['default'].compact(mixinsChain));
        }(),
        _archimedesModel: true,
        // properties: new function() {
        // return properties;
        // },
        inverseRelationships: new function () {
            return inverseRelationships;
        }(),
        methods: new function () {
            return methods;
        }(),
        statics: new function () {
            return staticMethods;
        }(),

        create: function create(pojo) {
            pojo = _lodash2['default'].omit(pojo, _lodash2['default'].isUndefined);
            return _lodash2['default'].assign({}, (0, _modelInstance2['default'])(db, this, pojo), methods);
        },

        /**
         * Wrap a pojo into a model instance. The difference beetween wrap
         * and create is wrap assign the _id to the model instance, simulating
         * a saved document
         *
         * @params {object} - initial values
         * @returns the model instance
         */
        wrap: function wrap(pojo) {
            var instance = this.create(pojo);
            instance._id = pojo._id;
            return instance;
        },

        // returns the list of model name which are mixed with this
        mixedWith: function mixedWith() {
            var results = [];
            _lodash2['default'].forOwn(this.db.registeredModels, function (model, modelName) {
                if (_lodash2['default'].contains(model.mixinsChain, modelName)) {
                    results.push(modelName);
                }
            });
            return results;
        },

        /**
         * Returns a promise which resolve a list of model instance
         * that match the query
         *
         * @params {?object} query - the query
         * @params {?object} options
         * @returns a promise
         */
        find: function find(query, options) {
            var _this = this;

            return db.find(name, query, options).then(function (results) {
                var data = results.map(function (o) {
                    return _this.wrap(o);
                });
                return data;
            });
        },

        /**
         * Returns a promise which resolve a model instance that match the query
         *
         * @params {?object} query - the query
         * @params {?object} options
         * @returns a promise
         */
        first: function first(query, options) {
            return this.find(query, options).then(function (results) {
                var result;
                if (results.length) {
                    result = results[0];
                }
                return result;
            });
        },

        /**
         * Returns a promise which resolve into a model instance that match
         * the id
         *
         * @params {string} id - the model id to fetch
         * @params {?object} options
         * @returns a promise
         */
        fetch: function fetch(id, options) {
            var _this2 = this;

            return db.fetch(name, id, options).then(function (pojo) {
                if (pojo) {
                    return _this2.wrap(pojo);
                }
                return pojo;
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
        count: function count(query) {
            return db.count(name, query);
        },

        groupBy: function groupBy(aggregation, query, options) {
            return db.groupBy(name, aggregation, query, options);
        },

        batchSync: function batchSync(data) {
            return db.batchSync(name, data);
        },

        csvHeader: function csvHeader(options) {
            var _this3 = this;

            options = options || {};

            var delimiter = options.delimiter || ',';
            var fields = options.fields;

            var propertyNames = undefined;
            if (fields) {
                propertyNames = fields.map(function (propName) {
                    var prop = _this3.schema.getProperty(propName);
                    if (prop) {
                        return prop.name;
                    }
                });
            } else {
                propertyNames = this.schema.properties.map(function (prop) {
                    return prop.name;
                });
            }

            propertyNames = _lodash2['default'].sortBy(propertyNames);

            propertyNames.unshift('_type');
            propertyNames.unshift('_id');
            return propertyNames.join(delimiter);
        }
    };

    var modelSchema = new _modelSchema2['default'](inner);

    return _lodash2['default'].assign({ schema: modelSchema }, inner, staticMethods);
};

exports['default'] = modelFactory;
module.exports = exports['default'];