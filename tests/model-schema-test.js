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

    it('should aggregate properties', (done) => {
        let blogPostPropertyNames = db.BlogPost.schema.properties.map((o) => o.name);

        expect(blogPostPropertyNames).to.only.include([
            'ratting',
            'author',
            'body',
            'createdDate',
            'slug',
            'title',
            'tags',
            'credits',
            'backlinks',
            'updatedDate',
            'publishedDate',
            'isPublished'
        ]);

        let bookPropertyNames = db.Book.schema.properties.map((o) => o.name);
        expect(bookPropertyNames).to.include([
            'author',
            'body',
            'createdDate',
            'isbn'
        ]);

        done();
    });

    it('should aggregate inverse relationships', (done) => {
        let blogPostPropertyNames = db.BlogPost.schema.inverseRelationships.map((o) => o.name);
        expect(blogPostPropertyNames).to.only.include([
            'comments'
        ]);

        let userPropertyNames = db.User.schema.inverseRelationships.map((o) => o.name);
        expect(userPropertyNames).to.include([
            'blogPosts',
            'comments',
            'contents',
            'reviewedBooks'
        ]);

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


        it('should return the child property', (done) => {
            let property = db.Content.schema.getProperty('isPublished');
            expect(property.modelSchema.name).to.equal('BlogPost');

            let property2 = db.Content.schema.getProperty('reviewer');
            expect(property2.modelSchema.name).to.equal('Book');
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
            let nameProperty = db.User.schema.getProperty('reviewedBooks.author.name');
            expect(nameProperty).to.be.an.object();
            expect(nameProperty.type).to.equal('string');
            expect(nameProperty.modelSchema.name).to.equal('User');

            let isPublishedProperty = db.User.schema.getProperty('contents.isPublished');
            expect(isPublishedProperty).to.be.an.object();
            expect(isPublishedProperty.type).to.equal('boolean');
            expect(isPublishedProperty.modelSchema.name).to.equal('BlogPost');

            let genderProperty = db.User.schema.getProperty('contents.author.gender');
            expect(genderProperty).to.be.an.object();
            expect(genderProperty.type).to.equal('string');
            expect(genderProperty.modelSchema.name).to.equal('User');
            done();
        });

        it('should undefined when trying to get an unknown property', (done) => {

            expect(
                db.BlogPost.schema.getProperty('unknownProperty')
            ).to.not.exists();

            expect(
                db.BlogPost.schema.getProperty('author.unknownProperty')
            ).to.not.exists();

            expect(
                db.BlogPost.schema.getProperty('author.comments.unknownProperty')
            ).to.not.exists();

            expect(
                db.User.schema.getProperty('comments.unknownProperty')
            ).to.not.exists();

            expect(
                db.User.schema.getProperty('comments.author.unknownProperty')
            ).to.not.exists();


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

    describe('#propagateDeletionProperties()', function() {
        it('should return all properties that propagate the deletion', (done) => {
            let properties = db.BlogPost.schema.propagateDeletionProperties;
            expect(properties.length).to.equal(1);
            expect(properties[0].name).to.equal('comments');
            expect(properties[0].modelSchema.name).to.equal('BlogPost');

            properties = db.User.schema.propagateDeletionProperties;
            let data = properties.map((p) => {
                return {
                    propName: p.name,
                    modelName: p.modelSchema.name
                };
            });

            expect(properties.length).to.equal(6);
            expect(data).to.deep.equal([
                {propName: 'genericStaff', modelName: 'User'},
                {propName: 'genericStuff', modelName: 'User'},
                {propName: 'blogPosts', modelName: 'User'},
                {propName: 'reviewedBooks', modelName: 'User'},
                {propName: 'contents', modelName: 'User'},
                {propName: 'comments', modelName: 'User'}
            ]);
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

