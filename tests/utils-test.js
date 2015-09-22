
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
import queryValidator from '../lib/query-validator';


describe('Utils', function() {

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

    describe('queryValidator', function(){
        it('should validate relations', (done) => {
            let query = {'author.gender': 'female'};
            let {error, value} = queryValidator(db.BlogPost.schema, query);
            expect(error).to.not.exist();
            expect(value).to.deep.equal(query);
            done();
        });


        it('should validate deep relations', (done) => {
            let query = {'comments.author.gender': 'female'};
            let {error, value} = queryValidator(db.BlogPost.schema, query);
            expect(error).to.not.exist();
            expect(value).to.deep.equal(query);
            done();
        });


        it('should validate inherited properties', (done) => {
            let query = {'isPublished': true, 'reviewer.name': 'Nico'};
            let {error, value} = queryValidator(db.Content.schema, query);
            expect(error).to.not.exist();
            expect(value).to.deep.equal(query);
            done();
        });


        it('should validate inverse relations', (done) => {
            let query = {'reviewedBooks.isbn': '1234'};
            let {error, value} = queryValidator(db.User.schema, query);
            expect(error).to.not.exist();
            expect(value).to.deep.equal(query);
            done();
        });

        it(`should validate an inverse relation on mixin's properties`, (done) => {
            // isPublished is defined on BlogPost not in Content
            let query = {'contents.isPublished': false};
            let {error, value} = queryValidator(db.User.schema, query);
            expect(error).to.not.exist();
            expect(value).to.deep.equal(query);
            done();
        });


        it('should throw an error if property is unknown', (done) => {
            let query = {'unknownProperty': true};
            let {error, value} = queryValidator(db.BlogPost.schema, query);
            expect(error[0].message).to.equal('unknown property "unknownProperty" on model "BlogPost"');
            expect(error[0].path).to.equal('unknownProperty');
            expect(value).to.not.exist();
            done();
        });


        it('should throw an error if an operator is not valid', (done) => {
            let query = {'isPublished': {$unknownOperator: true}};
            let {error, value} = queryValidator(db.BlogPost.schema, query);
            expect(error[0].message).to.equal('unknown operator "$unknownOperator"');
            expect(error[0].path).to.equal('isPublished');
            expect(value).to.not.exist();
            done();
        });
    });
});