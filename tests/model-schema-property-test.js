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

describe('ModelSchemaProperty', function() {

    var db;
    before(function(done) {
        db = archimedes();
        db.register(modelSchemas);
        done();
    });


    it('should return the property name', (done) => {
        let backlinks = db.BlogPost.schema.getProperty('backlinks');
        expect(backlinks.name).to.equal('backlinks');
        let ratting = db.BlogPost.schema.getProperty('ratting');
        expect(ratting.name).to.equal('ratting');
        done();
    });

    it('should return the property type', (done) => {
        let backlinks = db.BlogPost.schema.getProperty('backlinks');
        expect(backlinks.type).to.equal('string');
        let ratting = db.BlogPost.schema.getProperty('ratting');
        expect(ratting.type).to.equal('number');
        done();
    });

    it('should return true if the property is an array', (done) => {
        let backlinks = db.BlogPost.schema.getProperty('backlinks');
        expect(backlinks.isArray()).to.be.true();
        let ratting = db.BlogPost.schema.getProperty('ratting');
        expect(ratting.isArray()).to.be.false();
        done();
    });

    it('should return true if the property is a relation', (done) => {
        let author = db.BlogPost.schema.getProperty('author');
        expect(author.isRelation()).to.be.true();

        let comments = db.BlogPost.schema.getProperty('comments');
        expect(comments.isRelation()).to.be.true();

        let ratting = db.BlogPost.schema.getProperty('ratting');
        expect(ratting.isRelation()).to.be.false();
        done();
    });

    it('should validate a number', (done) => {
        let prop = db.BlogPost.schema.getProperty('ratting');
        let {error, value} = prop.validate(5);
        expect(error).to.not.exist();
        expect(value).to.equal(5);

        let {error: errorBis} = prop.validate(42);
        expect(errorBis).to.exist();
        done();
    });

});