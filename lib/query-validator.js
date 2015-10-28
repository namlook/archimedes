'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _defineProperty = require('babel-runtime/helpers/define-property')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _errors = require('./errors');

var allowedOperators = ['$eq', '$lt', '$lte', '$gt', '$gte', '$regex', '$iregex', '$year', '$month', '$day', '$ne', '$in', '$nin', '$all', '$nall', '$exists'];

// var arrayOperators = ['$all', '$nall', '$in', '$nin'];

var operatorValidator = _joi2['default'].object().keys({
    $eq: _joi2['default'].any(),
    $gt: _joi2['default'].alternatives()['try'](_joi2['default'].number(), _joi2['default'].date()),
    $lt: _joi2['default'].alternatives()['try'](_joi2['default'].number(), _joi2['default'].date()),
    $gte: _joi2['default'].alternatives()['try'](_joi2['default'].number(), _joi2['default'].date()),
    $lte: _joi2['default'].alternatives()['try'](_joi2['default'].number(), _joi2['default'].date()),
    $regex: _joi2['default'].string(),
    $iregex: _joi2['default'].string(),
    $ne: _joi2['default'].any(),
    $in: _joi2['default'].array(_joi2['default'].any()).min(1),
    $nin: _joi2['default'].array(_joi2['default'].any()).min(1),
    $all: _joi2['default'].array(_joi2['default'].any()).min(1),
    $nall: _joi2['default'].array(_joi2['default'].any()).min(1),
    $exists: _joi2['default'].boolean(),

    // to remove later ?
    $year: _joi2['default'].number(),
    $month: _joi2['default'].number(),
    $day: _joi2['default'].number()
}).unknown(true);

var QueryValidator = (function () {
    function QueryValidator(modelSchema) {
        _classCallCheck(this, QueryValidator);

        this._modelSchema = modelSchema;
        this._db = modelSchema.db;
        this.errors = [];
    }

    /**
     * Returns true if the property is present in other models (via mixin)
     *
     * exemple for the reversed property 'contents.isPublish' of Author:
     *   'contents' target the model Content but 'isPublished' is defined
     *   in BlogPost model. But Content is a mixin of BlogPost then return true
     *
     * @params {string} propertyName
     * returns a boolean
     */
    // __isInheritedPropertyName(propertyName) {
    //     console.log('=====', this._modelSchema.name, '(', propertyName, ')=====');
    //     let models = _.values(this._db.registeredModels);
    //     let inheritedProperties = models.map((model) => {
    //         if (_.includes(model.mixinsChain, this._modelSchema.name)) {
    //             return this._db[model.name].schema.getProperty(propertyName);
    //         }
    //     });
    //     console.log('$$$', _.flatten(_.compact(inheritedProperties)).map((o)=> o && o.modelSchema.name));
    //     return !!_.compact(inheritedProperties).length;
    // }

    _createClass(QueryValidator, [{
        key: '_validateValue',
        value: function _validateValue(value, propertyName, operator) {
            var _this = this;

            if (operator) {
                if (!_lodash2['default'].contains(allowedOperators, operator)) {
                    this.errors.push({
                        message: 'unknown operator "' + operator + '"',
                        path: propertyName
                    });
                }
            }

            if (propertyName[0] === '_') {
                return value;
            }

            var property = this._modelSchema.getProperty(propertyName);

            if (!property) {
                this.errors.push({
                    message: 'unknown property "' + propertyName + '" on model "' + this._modelSchema.name + '"',
                    path: propertyName
                });
                return null;
            } else if (_lodash2['default'].isArray(property)) {
                return value;
            }

            var castedValue;
            if (_lodash2['default'].isArray(value)) {
                castedValue = [];
                var validation;
                value.forEach(function (val) {
                    validation = property.validate(val);
                    if (validation.error) {
                        validation.error.details.forEach(function (detail) {
                            _this.errors.push(detail);
                        });
                    } else {
                        castedValue.push(validation.value);
                    }
                });
            } else if (operator === '$exists') {
                castedValue = value;
            } else {
                validation = property.validate(value);
                if (validation.error) {
                    validation.error.details.forEach(function (detail) {
                        _this.errors.push(detail);
                    });
                } else {
                    castedValue = validation.value;
                }
            }
            return castedValue;
        }
    }, {
        key: 'validate',
        value: function validate(query) {
            var _this2 = this;

            var filter = {};

            _lodash2['default'].forOwn(query, function (value, propertyName) {

                /**
                 * allow to omit '_id' where querying a relation.
                 *
                 * In the following example, the two queries are the same:
                 *
                 *      db.User.find({'author._id': 'joe'});
                 *      db.User.find({'author': 'joe'});
                 */
                if (!_lodash2['default'].endsWith(propertyName, '_id')) {
                    var property = _this2._modelSchema.getProperty(propertyName);
                    if (property && property.isRelation() && !_lodash2['default'].isObject(value)) {
                        propertyName = propertyName + '._id';
                    }
                }

                if (_lodash2['default'].contains(propertyName, '.')) {
                    var _ret = (function () {
                        var relationName = propertyName.split('.')[0];
                        var propRelation = _this2._modelSchema.getProperty(relationName);
                        if (!propRelation) {
                            _this2.errors.push({
                                path: '' + relationName,
                                message: 'unknown property "' + relationName + '" on model "' + _this2._modelSchema.name + '"'
                            });
                            return {
                                v: undefined
                            };
                            // } else if (_.isArray(propRelation)) {
                            //     filter[propertyName] = value;
                            //     return;
                        }

                        if (!propRelation.isRelation()) {
                            throw new _errors.ValidationError('malformed query', 'cannot reach ' + propertyName + ' on ' + _this2._modelSchema.name + ': ' + propRelation.name + ' is not a relation');
                        }

                        var relationValidator = new QueryValidator(_this2._db[propRelation.type].schema);
                        var relationPropertyName = propertyName.split('.').slice(1).join('.');
                        var relfilter = relationValidator.validate(_defineProperty({}, relationPropertyName, value));
                        _lodash2['default'].forOwn(relfilter, function (relValue, relName) {
                            filter[relationName + '.' + relName] = relValue;
                        });
                        _this2.errors = _this2.errors.concat(relationValidator.errors);
                    })();

                    if (typeof _ret === 'object') return _ret.v;
                } else if (_lodash2['default'].isObject(value) && !_lodash2['default'].isDate(value)) {
                    var validation = _joi2['default'].validate(value, operatorValidator);
                    if (validation.error) {
                        _this2.errors.push(validation.error);
                    }
                    _lodash2['default'].forOwn(validation.value, function (val, operator) {
                        _lodash2['default'].set(filter, propertyName + '.' + operator, _this2._validateValue(val, propertyName, operator));
                    });
                } else {
                    _lodash2['default'].set(filter, propertyName, _this2._validateValue(value, propertyName));
                }
            });

            return filter;
        }
    }]);

    return QueryValidator;
})();

exports['default'] = function (modelSchema, query) {
    var validator = new QueryValidator(modelSchema);
    var value = validator.validate(query);
    var error = validator.errors;
    if (error.length) {
        return { error: error };
    }
    return { value: value };
};

module.exports = exports['default'];