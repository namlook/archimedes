'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _wreck = require('wreck');

var _wreck2 = _interopRequireDefault(_wreck);

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _streamStream = require('stream-stream');

var _streamStream2 = _interopRequireDefault(_streamStream);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var sparqlClient = function sparqlClient(endpoint) {

    return {
        execute: function execute(sparql) {
            return new _bluebird2['default'](function (resolve, reject) {
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

                _wreck2['default'].post(endpoint, options, function (err, response, payload) {
                    if (payload) {
                        payload = payload.toString();
                    }

                    if (err) {
                        return reject(err);
                    }

                    if (response.statusCode >= 400) {
                        return reject(payload);
                    }

                    var data = undefined;
                    try {
                        data = JSON.parse(payload);
                    } catch (e) {
                        data = undefined;
                    }
                    resolve(data);
                });
            });
        },

        stream: function stream(sparql) {
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