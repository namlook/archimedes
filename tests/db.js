
import {memory, triplestore} from '../lib';
import modelSchemas from './fixtures-model-schemas';


var databases = {
    triplestore: function() {
        return triplestore({
            graphUri: 'http://test.org',
            // host: '192.168.99.100',
            // port: 8890,
            // endpoint: `http://192.168.99.100:8890/sparql` // virtuoso
            endpoint: `http://192.168.99.100:32772/bigdata/sparql` // blazegraph's bigdata
        });
    },
    memory: function() {
        return memory();
    }
};


export var database = databases.triplestore;


export var store = function() {
    return new Promise((resolve) => {
        return resolve(database().register(modelSchemas));
    });
};

export default store;
