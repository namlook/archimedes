'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
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

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var internals = {};

var sparqlClient = function sparqlClient(endpoint, config) {

    internals.getConfig = function (sparql) {
        var queryOperators = ['select', 'construct', 'describe', 'ask'];
        var isQuery = _lodash2['default'].compact(queryOperators.map(function (op) {
            return _lodash2['default'].startsWith(_lodash2['default'].trim(sparql.toLowerCase()), op);
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

        var options = {
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'accept': 'application/sparql-results+json'
            },
            body: _querystring2['default'].stringify(body)
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
            return new _bluebird2['default'](function (resolve, reject) {
                var conf = internals.getConfig(sparql);

                _request2['default'].post(conf.endpoint, conf.options, function (error, response, body) {
                    if (error) {
                        console.log('xxx', error);
                        return reject(error);
                    }

                    var payload = body;
                    if (response.statusCode > 400) {
                        return reject(new Error(payload));
                    }

                    var data = undefined;
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
            return new _bluebird2['default'](function (resolve, reject) {
                var conf = internals.getConfig(sparql);
                // if (conf.options.headers.auth) {
                //     conf.options.auth = `${config.auth.user}:${config.auth.password}`;
                // }
                _got2['default'].post(conf.endpoint, conf.options).then(function (response) {
                    var payload = response.body;
                    console.log(response.statusCode);
                    if (response.statusCode > 400) {
                        return reject(new Error(payload));
                    }

                    var data = undefined;
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
                })['catch'](function (error) {
                    console.log('xxx', error);
                    reject(error);
                });
            });
        },

        stream: function stream(sparql) {
            var conf = internals.getConfig(sparql);
            return _request2['default'].post(conf.endpoint, conf.options);
            // return got.stream(conf.endpoint, conf.options);
        },

        _stream: function _stream(sparql) {
            var queryOperators = ['select', 'construct', 'describe', 'ask'];
            var isQuery = _lodash2['default'].compact(queryOperators.map(function (op) {
                return _lodash2['default'].startsWith(_lodash2['default'].trim(sparql.toLowerCase()), op);
            })).length;

            var body = undefined;
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
                payload: _querystring2['default'].stringify(body)
            };

            var stream = (0, _streamStream2['default'])();

            _wreck2['default'].request('post', endpoint, options, function (err, response) {
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

exports['default'] = sparqlClient;

// let client = sparqlClient(`http://192.168.99.100:32771/bigdata/sparql`);
// let query = `DELETE { GRAPH <http://test.org> { <http://test.org/instances/bp3> ?p ?o. } }
// WHERE { <http://test.org/instances/bp3> ?p ?o. }`;
// console.log('fire!!!');
// client.execute(query).then((result) => {
//     console.log('done>', result);
// }).catch((error) => {
//     console.log('xxx', error);
// });
module.exports = exports['default'];