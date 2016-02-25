
import database from './database';
import rdfAdapter from './adapters/rdf';
import memoryAdapter from './adapters/memory';
import url from 'url';
import _ from 'lodash';

export var triplestore = function(config) {
    if (!config.engine) {
        throw new Error('archimedes: engine not found');
    }

    let baseUri;
    if(!config.port) {
        baseUri = `http://${config.host}`;
    } else {
        baseUri = `http://${config.host}:${config.port}`;
    }

    let endpoint;
    switch (config.engine) {

        case 'virtuoso':
            endpoint = `${baseUri}/sparql`;
            break;

        case 'blazegraph':
            endpoint = `${baseUri}/blazegraph/sparql`;
            break;

        case 'stardog':
            let databaseName = url.parse(config.graphUri).host;
            databaseName = _.words(databaseName).join('');
            endpoint = `${baseUri}/annex/${databaseName}/sparql/query`;
            break;

        default:
            throw new Error(`archimedes: unknown engine "${config.engine}"`);
    }


    let rdf = rdfAdapter({
        graphUri: config.graphUri,
        endpoint: endpoint,
        engine: config.engine,
        auth: config.auth
    });

    return database(rdf, config);
};

export var memory = function(config) {
    return database(memoryAdapter(), config);
};

export default database;
