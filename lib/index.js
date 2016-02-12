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
    if (!config.engine) {
        throw new Error('archimedes: engine not found');
    }

    var baseUri = undefined;
    if (!config.port) {
        baseUri = 'http://' + config.host;
    } else {
        baseUri = 'http://' + config.host + ':' + config.port;
    }

    var endpoint = undefined;
    switch (config.engine) {

        case 'virtuoso':
            endpoint = baseUri + '/sparql';
            break;

        case 'blazegraph':
            endpoint = baseUri + '/bigdata/sparql';
            break;

        default:
            throw new Error('archimedes: unknown engine "' + config.engine + '"');
    }

    var rdf = (0, _adaptersRdf2['default'])({
        graphUri: config.graphUri,
        endpoint: endpoint
    });

    return (0, _database2['default'])(rdf, config);
};

exports.triplestore = triplestore;
var memory = function memory(config) {
    return (0, _database2['default'])((0, _adaptersMemory2['default'])(), config);
};

exports.memory = memory;
exports['default'] = _database2['default'];