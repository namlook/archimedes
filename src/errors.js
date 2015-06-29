
import NodeUtil from 'util';

var errorFactory = function(errorType) {

    var error = function(message, extra) {
      Error.captureStackTrace(this, this.constructor);
      this.name = errorType; //this.constructor.name;
      this.message = message;
      this.extra = extra;
    };

    NodeUtil.inherits(error, Error);
    return error;
};


export var ValidationError = errorFactory('ValidationError');
