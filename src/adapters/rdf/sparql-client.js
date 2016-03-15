
import wreck from 'wreck';
import got from 'got';
import request from 'request';
import querystring from 'querystring';
import _ from 'lodash';

import streamStream from 'stream-stream';

import highland from 'highland';
import JSONStream from 'JSONStream';

import Promise from 'bluebird';

var internals = {};

let sparqlClient = function(endpoint, config) {

    internals.getConfig = function(sparql) {
        if (!sparql) {
            throw new Error('sparql is required');
        }
        let queryOperators = ['select', 'construct', 'describe', 'ask'];
        let isQuery = _.compact(queryOperators.map((op) => {
            return _.startsWith(_.trim(sparql.toLowerCase()), op);
        })).length;

        let body = {query: sparql};
        if (!isQuery) {
            if (config.engine !== 'stardog') {
                body = {update: sparql};
            }
        }

        // console.log('sparql>>>>>>>');
        // console.log(sparql);
        // console.log('<<<<<<<<<<sparql');

        let options = {
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'accept': 'application/sparql-results+json'
            },
            body: querystring.stringify(body)
        };

        if (config.auth) {
            var auth = 'Basic ' + new Buffer('admin:admin').toString('base64');
            // delete conf.options.auth;
            options.headers.Authorization = auth;
            // options.auth = `${config.auth.user}:${config.auth.password}`;
        }

        // var startTime = Date.now();
        // console.log(endpoint, options);

        return {endpoint: endpoint, options: options};
        // return got.post(endpoint, options);
    };



    return {

        execute(sparql) {
            return new Promise((resolve, reject) => {
                let conf = internals.getConfig(sparql);

                request.post(conf.endpoint, conf.options, function(error, response, body) {
                    if (error) {
                        console.log('xxx', error);
                        return reject(error);
                    }

                    let payload = body;
                    if (response.statusCode > 400) {
                        return reject(new Error(payload));
                    }

                    let data;
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

        _execute(sparql) {
            return new Promise((resolve, reject) => {
                let conf = internals.getConfig(sparql);
                // if (conf.options.headers.auth) {
                //     conf.options.auth = `${config.auth.user}:${config.auth.password}`;
                // }
                got.post(conf.endpoint, conf.options).then(function(response) {
                    let payload = response.body;
                    console.log(response.statusCode);
                    if (response.statusCode > 400) {
                        return reject(new Error(payload));
                    }

                    let data;
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
                }).catch(function(error){
                    console.log('xxx', error);
                    reject(error);
                });
            });
        },

        stream(sparql) {
            let conf = internals.getConfig(sparql);
            return request.post(conf.endpoint, conf.options)
                // .pipe(JSONStream.parse('results.bindings.*'))
            // return got.stream(conf.endpoint, conf.options);
        },

        queryStream: function(sparql) {
            let conf = internals.getConfig(sparql);
            let stream = request.post(conf.endpoint, conf.options);
            stream.on('response', function(response) {
                if (response.statusCode !== 200) {
                    if (response.statusCode === 400) {
                        console.error(sparql);
                        throw new Error('bad sparql query');
                    } else {
                        throw new Error(`database error: ${response.statusCode}`);
                    }
                }
            });
            return highland(stream);
        },

        n3WriterStream: function(sparql) {
            let config = {
                headers: {
                    'content-type': 'text/x-nquads'
                }
            };
            let stream = request.post(endpoint, config);
            stream.on('response', function(response) {
                if (response.statusCode !== 200) {
                    highland(stream).toArray((o) => {
                        let message = o.toString();
                        if (response.statusCode === 400) {
                            throw new Error(`bad rdf data: ${message}`);
                        } else {
                            throw new Error(`database error: ${response.statusCode}: ${message}`);
                        }
                    });
                }
            });
            return stream;
        },

        _stream(sparql) {
            let queryOperators = ['select', 'construct', 'describe', 'ask'];
            let isQuery = _.compact(queryOperators.map((op) => {
                return _.startsWith(_.trim(sparql.toLowerCase()), op);
            })).length;

            let body;
            if (isQuery) {
                body = {query: sparql};
            } else {
                body = {update: sparql};
            }

            // console.log('sparql>>>>>>>');
            // console.log(sparql);
            // console.log('<<<<<<<<<<sparql');

            let options = {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'accept': 'application/sparql-results+json'
                },
                payload: querystring.stringify(body)
            };

            let stream = streamStream();

            wreck.request('post', endpoint, options, (err, response) => {
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

export default sparqlClient;

// let client = sparqlClient(`http://192.168.99.100:32771/bigdata/sparql`);
// let query = `DELETE { GRAPH <http://test.org> { <http://test.org/instances/bp3> ?p ?o. } }
// WHERE { <http://test.org/instances/bp3> ?p ?o. }`;
// console.log('fire!!!');
// client.execute(query).then((result) => {
//     console.log('done>', result);
// }).catch((error) => {
//     console.log('xxx', error);
// });
