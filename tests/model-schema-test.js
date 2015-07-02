import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
var expect = Code.expect;

import archimedes from '../lib';
import MemoryAdapter from '../lib/adapters/memory';
import modelSchemas from './fixtures-model-schemas';

describe('ModelSchema', function() {

    var db;
    before(function(done) {
        db = archimedes(MemoryAdapter);
        db.register(modelSchemas);
        done();
    });


    it('should have a schema object', (done) => {
        expect(db.BlogPost.schema.name).to.equal('BlogPost');
        done();
    });


    it('should returns all model property infos', (done) => {
        let properties = db.BlogPost.schema.properties;
        expect(properties.length).to.equal(11);
        done();
    });


    it('should returns a specific model property infos', (done) => {
        let properties = db.BlogPost.schema.getProperty('backlinks');
        expect(properties.name).to.equal('backlinks');
        expect(properties.config.type).to.equal('array');
        expect(properties.config.items.type).to.equal('string');
        expect(properties.modelSchema.name).to.equal('BlogPost');
        done();
    });


    it('should returns undefined if a property is not specified', (done) => {
        let properties = db.BlogPost.schema.getProperty('unknownProperty');
        expect(properties).to.not.exist();
        done();
    });


    it('should returns true if the model schema has a property', (done) => {
        let hasBacklinks = db.BlogPost.schema.hasProperty('backlinks');
        expect(hasBacklinks).to.be.true();
        let hasUnknownProperty = db.BlogPost.schema.hasProperty('unknownProperty');
        expect(hasUnknownProperty).to.be.false();
        done();
    });


    it('should validate an pojo', (done) => {
        let pojo = {title: 'the string', isPublished: true};
        var {error, value} = db.BlogPost.schema.validate(pojo);
        expect(error).to.not.exist();
        expect(value).to.deep.equal(pojo);
        done();
    });

    it('should return an error when validating a bad pojo', (done) => {
        let pojo = {
            title: 'the string',
            isPublished: 'arf',
            ratting: 42
        };
        var {error} = db.BlogPost.schema.validate(pojo);
        expect(error[0].path).to.equal('ratting');
        expect(error[0].message).to.equal('"ratting" must be less than or equal to 5');
        expect(error[1].path).to.equal('isPublished');
        expect(error[1].message).to.equal('"isPublished" must be a boolean');
        done();
    });

});

