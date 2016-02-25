
import {memory, triplestore} from '../lib';
import modelSchemas from './schemas';

var graphUri = 'http://tests.archimedes.org';


var databases = {
    triplestores: {
        virtuoso: function() {
            return triplestore({
                engine: 'virtuoso',
                /* WARNING for tests when using Virtuoso
                *  type DEFINE sql:log-enable 2 in conductor
                */
                graphUri: graphUri,
                host: 'docker.dev',
                port: 8890
                // endpoint: `http://192.168.99.100:8890/sparql`
            });
        },
        blazegraph: function() {
            return triplestore({
                engine: 'blazegraph',
                graphUri: graphUri,
                host: 'localhost',
                port: 9999
                // endpoint: `http://192.168.99.100:9999/blazegraph/sparql`
            });
        },
        stardog: function() {
            return triplestore({
                engine: 'stardog',
                graphUri: graphUri,
                host: 'localhost',
                port: 5820,
                auth: {user: 'admin', password: 'admin'}
                // endpoint: 'http://localhost:5820/annex/testsarchimedesorg/sparql/query',
            });
        }
    },
    memory: function() {
        return memory();
    }
};


export var database = databases.triplestores.blazegraph;


export var store = function() {
    return new Promise((resolve) => {
        return resolve(database().register(modelSchemas));
    });
};

export default store;
