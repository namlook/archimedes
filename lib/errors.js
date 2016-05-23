'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.StructureError = exports.ValidationError = undefined;

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var errorFactory = function errorFactory(errorType) {

    var error = function error(message, extra) {
        Error.captureStackTrace(this, this.constructor);
        this.name = errorType; //this.constructor.name;
        this.message = message;
        if (extra) {
            if (_lodash2.default.isArray(extra)) {
                extra = extra[0];
            }
            this.extra = extra.message || extra;
        }
    };

    _util2.default.inherits(error, Error);
    return error;
};

var ValidationError = exports.ValidationError = errorFactory('ValidationError');
var StructureError = exports.StructureError = errorFactory('StructureError');