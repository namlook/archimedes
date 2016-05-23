'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (operations) {
    return new _bluebird2.default(function (resolve, reject) {
        _joi2.default.validate(operations, operationSchema, function (error) {
            if (error) {
                return reject(error);
            }
            return resolve();
        });
    });
};

var _joi = require('joi');

var _joi2 = _interopRequireDefault(_joi);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var operationSchema = _joi2.default.array().items(_joi2.default.object().keys({
    operator: _joi2.default.string().required(),
    property: _joi2.default.string().required(),
    value: _joi2.default.any()
}));