'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.findOptionsValidator = undefined;

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var findOptionsSchemaValidator = {
    limit: _joi2.default.number().integer().positive().greater(-1),
    offset: _joi2.default.number().integer().greater(-1),
    sort: _joi2.default.alternatives().try(_joi2.default.array().items(_joi2.default.string()), _joi2.default.string()),
    fields: _joi2.default.alternatives().try(_joi2.default.array().items(_joi2.default.string()), _joi2.default.string()),
    distinct: _joi2.default.boolean().default(false)
};

var findOptionsValidator = exports.findOptionsValidator = function findOptionsValidator(options, db, modelType) {
    var _joi$validate = _joi2.default.validate(options, findOptionsSchemaValidator);

    var error = _joi$validate.error;
    var value = _joi$validate.value;


    if (error) {
        return { error: error };
    }

    if (value.fields) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = value.fields[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var property = _step.value;

                if (!db[modelType].schema.getProperty(property)) {
                    error = 'fields: unknown property "' + property + '" on model "' + modelType + '"';
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

    if (value.sort) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = value.sort[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var _property = _step2.value;

                if (_property[0] === '-') {
                    _property = _property.slice(1);
                }
                if (!db[modelType].schema.getProperty(_property)) {
                    error = 'sort: unknown property "' + _property + '" on model "' + modelType + '"';
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
    }

    if (error) {
        return { error: error };
    }

    return { value: value };
};