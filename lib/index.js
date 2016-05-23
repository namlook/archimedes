'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.memory = exports.triplestore = exports.queryValidator = undefined;

var _database = require('./database');

var _database2 = _interopRequireDefault(_database);

var _rdf = require('./adapters/rdf');

var _rdf2 = _interopRequireDefault(_rdf);

var _memory = require('./adapters/memory');

var _memory2 = _interopRequireDefault(_memory);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _query = require('./validators/query');

var _query2 = _interopRequireDefault(_query);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.queryValidator = _query2.default;
var triplestore = exports.triplestore = function triplestore(config) {
    if (!config.engine) {
        throw new Error('archimedes: engine not found');
    }

    var baseUri = void 0;
    if (!config.port) {
        baseUri = 'http://' + config.host;
    } else {
        baseUri = 'http://' + config.host + ':' + config.port;
    }

    var endpoint = void 0,
        databaseName = void 0;
    switch (config.engine) {

        case 'virtuoso':
            endpoint = baseUri + '/sparql';
            break;

        case 'blazegraph':
            // endpoint = `${baseUri}/blazegraph/sparql`;
            databaseName = _lodash2.default.words(_url2.default.parse(config.graphUri).host).join('');
            endpoint = baseUri + '/blazegraph/namespace/' + databaseName + '/sparql';
            break;

        case 'stardog':
            databaseName = _url2.default.parse(config.graphUri).host;
            databaseName = _lodash2.default.words(databaseName).join('');
            endpoint = baseUri + '/annex/' + databaseName + '/sparql/query';
            break;

        default:
            throw new Error('archimedes: unknown engine "' + config.engine + '"');
    }

    var rdf = (0, _rdf2.default)({
        graphUri: config.graphUri,
        endpoint: endpoint,
        engine: config.engine,
        auth: config.auth
    });

    return (0, _database2.default)(rdf, config);
};

var memory = exports.memory = function memory(config) {
    return (0, _database2.default)((0, _memory2.default)(), config);
};

exports.default = _database2.default;