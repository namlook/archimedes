
import database from './database';
import rdfAdapter from './adapters/rdf';
import memoryAdapter from './adapters/memory';

export var triplestore = function(config) {

    let rdf = rdfAdapter({
        graphUri: config.graphUri,
        // host: config.host,
        // port: config.port,
        endpoint: config.endpoint
    });

    return database(rdf);
};

export var memory = function() {
    return database(memoryAdapter());
};

export default database;