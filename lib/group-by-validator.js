'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var groupByValidator = {
    property: _joi2['default'].string(),
    aggregation: _joi2['default'].object().keys({
        operator: _joi2['default'].string().only('count', 'sum', 'avg', 'min', 'max'),
        target: _joi2['default'].string()
    })
};

exports['default'] = function (groupBy) {
    return _joi2['default'].validate(groupBy, groupByValidator);
};

module.exports = exports['default'];