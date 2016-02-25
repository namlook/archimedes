
import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
var expect = Code.expect;

import {triplestore} from '../lib';
import modelSchemas from './schemas';

import _ from 'lodash';

describe('Rdf adapter', function() {

    var db;
    before(function(done) {
        triplestore({
            engine: 'stardog', // not used here
            graphUri: 'http://tests.archimedes.org',
            host: 'localhost',
            port: 5820
        }).register(modelSchemas)
          .then((registeredDb) => {
            db = registeredDb;
            done();
        }).catch((error) => {
            console.log(error.stack);
        });
    });



    describe('init', function(){
        it('should fill models meta', (done) => {
            expect(db.BlogPost.meta).to.exist();
            expect(db.BlogPost.meta.classRdfUri).to.equal('http://tests.archimedes.org/classes/BlogPost');
            expect(db.BlogPost.meta.instanceRdfPrefix).to.equal('http://tests.archimedes.org/instances');
            _.forOwn(db.BlogPost.properties, (propConf, propName) => {
                expect(propConf.meta.rdfUri).to.equal(`http://tests.archimedes.org/properties/${propName}`);
            });
            done();
        });
    });
});
