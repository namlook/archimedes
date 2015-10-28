'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var errorFactory = function errorFactory(errorType) {

    var error = function error(message, extra) {
        Error.captureStackTrace(this, this.constructor);
        this.name = errorType; //this.constructor.name;
        this.message = message;
        if (extra) {
            if (_lodash2['default'].isArray(extra)) {
                extra = extra[0];
            }
            this.extra = extra.message || extra;
        }
    };

    _util2['default'].inherits(error, Error);
    return error;
};

var ValidationError = errorFactory('ValidationError');
exports.ValidationError = ValidationError;
var StructureError = errorFactory('StructureError');
exports.StructureError = StructureError;