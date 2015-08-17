
import NodeUtil from 'util';
import _ from 'lodash';

var errorFactory = function(errorType) {

    var error = function(message, extra) {
        Error.captureStackTrace(this, this.constructor);
        this.name = errorType; //this.constructor.name;
        this.message = message;
        if (extra) {
            if (_.isArray(extra)) {
                extra = extra[0];
            }
            this.extra = extra.message || extra;
        }
    };

    NodeUtil.inherits(error, Error);
    return error;
};


export var ValidationError = errorFactory('ValidationError');
export var StructureError = errorFactory('StructureError');
