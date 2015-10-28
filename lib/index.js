'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _database = require('./database');

var _database2 = _interopRequireDefault(_database);

var _adaptersRdf = require('./adapters/rdf');

var _adaptersRdf2 = _interopRequireDefault(_adaptersRdf);

var _adaptersMemory = require('./adapters/memory');

var _adaptersMemory2 = _interopRequireDefault(_adaptersMemory);

var triplestore = function triplestore(config) {
    var rdf = (0, _adaptersRdf2['default'])({
        graphUri: config.graphUri,
        // host: config.host,
        // port: config.port,
        endpoint: config.endpoint
    });

    return (0, _database2['default'])(rdf);
};

exports.triplestore = triplestore;
var memory = function memory() {
    return (0, _database2['default'])((0, _adaptersMemory2['default'])());
};

exports.memory = memory;
exports['default'] = _database2['default'];