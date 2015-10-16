
import request from 'request';
import querystring from 'querystring';
import _ from 'lodash';

import Promise from 'bluebird';

let sparqlClient = function(endpoint) {
    let requestDefaults = {
        url: endpoint,
        method: 'POST',
        encoding: 'utf8',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/sparql-results+json'
            // 'Accept': 'application/json'
        }
    };

    return {
        execute(sparql) {
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

            let requestOptions = Object.assign({}, requestDefaults, {
                body: querystring.stringify(body)
            });
            return new Promise((resolve, reject) => {
                process.nextTick(function() {
                    request.post(requestOptions, (err, response, resbody) => {
                        if (err) {
                            return reject(err);
                        }

                        if (response.statusCode >= 400) {
                            return reject(resbody);
                        }

                        process.nextTick(function() {

                            let data;
                            try {
                                data = JSON.parse(resbody);
                            } catch (e) {
                                data = undefined;
                            }
                            resolve(data);
                        });
                    });
                });
            });
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
