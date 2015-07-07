
import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
var expect = Code.expect;

import {triplestore} from '../lib';
import modelSchemas from './fixtures-model-schemas';

import _ from 'lodash';

describe('Rdf adapter', function() {

    var db;
    before(function(done) {
        triplestore({
            graphUri: 'http://test.org',
            endpoint: 'http://localhost:8890/sparql' // not used here
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
            expect(db.BlogPost.meta.classRdfUri).to.equal('http://test.org/classes/BlogPost');
            expect(db.BlogPost.meta.instanceRdfPrefix).to.equal('http://test.org/instances');
            _.forOwn(db.BlogPost.properties, (propConf, propName) => {
                expect(propConf.meta.rdfUri).to.equal(`http://test.org/properties/${propName}`);
            });
            done();
        });
    });
});