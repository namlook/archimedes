import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
var expect = Code.expect;

import archimedes from '../lib';
import modelSchemas from './fixtures-model-schemas';

describe('Model instance persistance', function() {

    var db;
    before(function(done) {
        db = archimedes();
        db.register(modelSchemas);
        done();
    });


    describe('#find()', function() {
        it('should return a promise');
        it('should return the all results');
        it('should return results that match the query');
        it('should return an empty array when no results match');
    });


    describe('#first()', function() {
        it('should return a promise');
        it('should return a document that match a query');
        it('should return undefined when no results match');
    });

    describe('#update()', function() {
        it('should return a promise');
        it('should update a document');
    });

    describe('#talk()', function() {
        it('should return a promise');
        it('should talk directly to the store');
    });


});
