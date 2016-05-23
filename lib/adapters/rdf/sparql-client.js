'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _wreck = require('wreck');

var _wreck2 = _interopRequireDefault(_wreck);

var _got = require('got');

var _got2 = _interopRequireDefault(_got);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _streamStream = require('stream-stream');

var _streamStream2 = _interopRequireDefault(_streamStream);

var _highland = require('highland');

var _highland2 = _interopRequireDefault(_highland);

var _JSONStream = require('JSONStream');

var _JSONStream2 = _interopRequireDefault(_JSONStream);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var internals = {};

var sparqlClient = function sparqlClient(endpoint, config) {

    internals.getConfig = function (sparql) {
        if (!sparql) {
            throw new Error('sparql is required');
        }
        var queryOperators = ['select', 'construct', 'describe', 'ask'];
        var isQuery = _lodash2.default.compact(queryOperators.map(function (op) {
            return _lodash2.default.startsWith(_lodash2.default.trim(sparql.toLowerCase()), op);
        })).length;

        var body = { query: sparql };
        if (!isQuery) {
            if (config.engine !== 'stardog') {
                body = { update: sparql };
            }
        }

        // console.log('sparql>>>>>>>');
        // console.log(sparql);
        // console.log('<<<<<<<<<<sparql');

        // console.log('........', body);

        var options = {
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'accept': 'application/sparql-results+json'
            },
            body: _querystring2.default.stringify(body)
        };

        if (config.auth) {
            var auth = 'Basic ' + new Buffer('admin:admin').toString('base64');
            // delete conf.options.auth;
            options.headers.Authorization = auth;
            // options.auth = `${config.auth.user}:${config.auth.password}`;
        }

        // var startTime = Date.now();
        // console.log(endpoint, options);

        return { endpoint: endpoint, options: options };
        // return got.post(endpoint, options);
    };

    return {
        execute: function execute(sparql) {
            return new _bluebird2.default(function (resolve, reject) {
                var conf = internals.getConfig(sparql);

                _request2.default.post(conf.endpoint, conf.options, function (error, response, body) {
                    if (error) {
                        console.log('xxx', error);
                        return reject(error);
                    }

                    var payload = body;
                    if (response.statusCode > 400) {
                        return reject(new Error(payload));
                    }

                    var data = void 0;
                    try {
                        data = JSON.parse(payload);
                    } catch (e) {
                        data = undefined;
                    }

                    if (data && data.results) {
                        resolve(data);
                    } else {
                        resolve();
                    }

                    // console.log(Date.now() - startTime);
                });
            });
        },
        _execute: function _execute(sparql) {
            return new _bluebird2.default(function (resolve, reject) {
                var conf = internals.getConfig(sparql);
                // if (conf.options.headers.auth) {
                //     conf.options.auth = `${config.auth.user}:${config.auth.password}`;
                // }
                _got2.default.post(conf.endpoint, conf.options).then(function (response) {
                    var payload = response.body;
                    console.log(response.statusCode);
                    if (response.statusCode > 400) {
                        return reject(new Error(payload));
                    }

                    var data = void 0;
                    try {
                        data = JSON.parse(payload);
                    } catch (e) {
                        data = undefined;
                    }

                    console.log('data>', data);
                    if (data && data.results) {
                        resolve(data);
                    } else {
                        resolve();
                    }

                    // console.log(Date.now() - startTime);
                }).catch(function (error) {
                    console.log('xxx', error);
                    reject(error);
                });
            });
        },
        stream: function stream(sparql) {
            var conf = internals.getConfig(sparql);
            return _request2.default.post(conf.endpoint, conf.options);
            // .pipe(JSONStream.parse('results.bindings.*'))
            // return got.stream(conf.endpoint, conf.options);
        },


        queryStream: function queryStream(sparql) {
            var conf = internals.getConfig(sparql);
            // console.log('***', conf);
            var stream = _request2.default.post(conf.endpoint, conf.options);
            stream.on('response', function (response) {
                var statusCode = response.statusCode;

                if (statusCode !== 200) {
                    if (statusCode === 400) {
                        console.error(sparql);
                        throw new Error('bad sparql query');
                    } else if (statusCode === 404) {
                        throw new Error('unknown endpoint: ' + conf.endpoint);
                    } else {
                        throw new Error('database error: ' + statusCode);
                    }
                }
            });
            return (0, _highland2.default)(stream);
        },

        n3WriterStream: function n3WriterStream(sparql) {
            var config = {
                headers: {
                    // 'content-type': 'text/x-nquads'
                    'content-type': 'application/x-trig'
                }
            };
            var stream = _request2.default.post(endpoint, config);
            stream.on('response', function (response) {
                if (response.statusCode !== 200) {
                    (0, _highland2.default)(stream).toArray(function (o) {
                        var message = o.toString();
                        if (response.statusCode === 400) {
                            throw new Error('bad rdf data: ' + message);
                        } else {
                            throw new Error('database error: ' + response.statusCode + ': ' + message);
                        }
                    });
                }
            });
            return stream;
        },

        _stream: function _stream(sparql) {
            var queryOperators = ['select', 'construct', 'describe', 'ask'];
            var isQuery = _lodash2.default.compact(queryOperators.map(function (op) {
                return _lodash2.default.startsWith(_lodash2.default.trim(sparql.toLowerCase()), op);
            })).length;

            var body = void 0;
            if (isQuery) {
                body = { query: sparql };
            } else {
                body = { update: sparql };
            }

            // console.log('sparql>>>>>>>');
            // console.log(sparql);
            // console.log('<<<<<<<<<<sparql');

            var options = {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'accept': 'application/sparql-results+json'
                },
                payload: _querystring2.default.stringify(body)
            };

            var stream = (0, _streamStream2.default)();

            _wreck2.default.request('post', endpoint, options, function (err, response) {
                if (err) {
                    stream.end();
                    throw err;
                }
                stream.write(response);
                stream.end();
            });

            return stream;
        }
    };
};

exports.default = sparqlClient;

// let client = sparqlClient(`http://192.168.99.100:32771/bigdata/sparql`);
// let query = `DELETE { GRAPH <http://test.org> { <http://test.org/instances/bp3> ?p ?o. } }
// WHERE { <http://test.org/instances/bp3> ?p ?o. }`;
// console.log('fire!!!');
// client.execute(query).then((result) => {
//     console.log('done>', result);
// }).catch((error) => {
//     console.log('xxx', error);
// });