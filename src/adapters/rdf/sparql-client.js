
import wreck from 'wreck';
import querystring from 'querystring';
import _ from 'lodash';

import Promise from 'bluebird';

let sparqlClient = function(endpoint) {

    return {
        execute(sparql) {
            return new Promise((resolve, reject) => {
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

                wreck.post(endpoint, options, (err, response, payload) => {
                    payload = payload.toString();

                    if (err) {
                        return reject(err);
                    }

                    if (response.statusCode >= 400) {
                        return reject(payload);
                    }


                    let data;
                    try {
                        data = JSON.parse(payload);
                    } catch (e) {
                        data = undefined;
                    }
                    resolve(data);
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
