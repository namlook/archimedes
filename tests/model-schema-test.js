import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var expect = Code.expect;

import store from './db';

describe('ModelSchema', function() {

    var db;
    before(function(done) {
        store().then((registeredDB) => {
            db = registeredDB;
            done();
        }).catch((error) => {
            console.log(error.stack);
        });
    });


    it('should have a schema object', (done) => {
        expect(db.BlogPost.schema.name).to.equal('BlogPost');
        done();
    });


    it('should return all model property infos', (done) => {
        let properties = db.BlogPost.schema.properties;
        expect(properties.length).to.equal(12);
        done();
    });


    describe('#getProperty()', function() {

        it('should return a specific model property infos', (done) => {
            let properties = db.BlogPost.schema.getProperty('backlinks');
            expect(properties.name).to.equal('backlinks');
            expect(properties.config.type).to.equal('array');
            expect(properties.config.items.type).to.equal('string');
            expect(properties.modelSchema.name).to.equal('BlogPost');
            done();
        });


        it('should return undefined if a property is not specified', (done) => {
            let properties = db.BlogPost.schema.getProperty('unknownProperty');
            expect(properties).to.not.exist();
            done();
        });


        it('should return all potential properties from a mixin', (done) => {
            let properties = db.Content.schema.getProperty('isPublished');
            expect(properties.length).to.equal(1);
            expect(properties[0].modelSchema.name).to.equal('BlogPost');

            let properties2 = db.Content.schema.getProperty('reviewer');
            expect(properties2.length).to.equal(2);
            let modelNames = properties2.map((o) => o.modelSchema.name);
            expect(modelNames).to.include(['Ebook', 'Book']);
            done();
        });


        it('should return a reverse property', (done) => {
            let property = db.User.schema.getProperty('contents');
            expect(property.isAbstract()).to.be.true();
            done();
        });


        it('should return a deep related property', (done) => {
            let name = db.BlogPost.schema.getProperty('credits.name');
            expect(name.type).to.equal('string');
            done();
        });


        it('should return a reversed deep related property', (done) => {
            let nameProperties = db.User.schema.getProperty('reviewedBooks.author.name');
            expect(nameProperties).to.be.an.array();
            expect(nameProperties.length).to.equal(1);
            expect(nameProperties[0].type).to.equal('string');
            expect(nameProperties[0].modelSchema.name).to.equal('User');

            let isPublishedProperties = db.User.schema.getProperty('contents.isPublished');
            expect(isPublishedProperties).to.be.an.array();
            expect(isPublishedProperties.length).to.equal(1);
            expect(isPublishedProperties[0].type).to.equal('boolean');
            expect(isPublishedProperties[0].modelSchema.name).to.equal('BlogPost');

            let genderProperties = db.User.schema.getProperty('contents.author.gender');
            expect(genderProperties).to.be.an.array();
            expect(genderProperties.length).to.equal(1);
            expect(genderProperties[0].type).to.equal('string');
            expect(genderProperties[0].modelSchema.name).to.equal('User');
            done();
        });
    });


    describe('#hasProperty()', function() {

        it('should return true if the model schema has a property', (done) => {
            let hasBacklinks = db.BlogPost.schema.hasProperty('backlinks');
            expect(hasBacklinks).to.be.true();
            let hasUnknownProperty = db.BlogPost.schema.hasProperty('unknownProperty');
            expect(hasUnknownProperty).to.be.false();
            done();
        });


        it('should return true if the model schema has inherited propertyies', (done) => {
            let hasReviewer = db.Content.schema.hasProperty('reviewer');
            expect(hasReviewer).to.be.true();
            let hasNoReviewer = db.User.schema.hasProperty('reviewer');
            expect(hasNoReviewer).to.be.false();
            done();
        });
    });


    describe('#validate()', function() {

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

        it('should return an error when validating a pojo with unknown properties', (done) => {
            let pojo = {
                title: 'the string',
                unknownProperty: 'arf'
            };
            var {error} = db.BlogPost.schema.validate(pojo);
            expect(error[0].message).to.equal('"unknownProperty" is not allowed');
            expect(error[0].path).to.equal('.unknownProperty');
            done();
        });
    });
});

