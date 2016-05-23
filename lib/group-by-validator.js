'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (groupBy) {
    return _joi2.default.validate(groupBy, groupByValidator);
};

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var groupByValidator = {
    property: _joi2.default.array().items(_joi2.default.string()),
    aggregation: _joi2.default.object().keys({
        operator: _joi2.default.string().only('count', 'sum', 'avg', 'min', 'max'),
        target: _joi2.default.string()
    })
};