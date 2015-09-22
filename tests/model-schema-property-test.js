import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
var expect = Code.expect;

import store from './db';

describe('ModelSchemaProperty', function() {

    var db;
    before(function(done) {
        store().then((registeredDB) => {
            db = registeredDB;
            done();
        }).catch((error) => {
            console.log(error.stack);
        });
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

        let reviewedBooks = db.User.schema.getProperty('reviewedBooks');
        expect(reviewedBooks.type).to.equal('Book');

        done();
    });


    it('should return the property meta', (done) => {
        let backlinks = db.BlogPost.schema.getProperty('backlinks');
        expect(backlinks.meta).to.exist();
        let ratting = db.BlogPost.schema.getProperty('ratting');
        expect(ratting.meta.deprecated).to.be.true();
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

        let comments = db.BlogPost.schema.getProperty('credits');
        expect(comments.isRelation()).to.be.true();

        let ratting = db.BlogPost.schema.getProperty('ratting');
        expect(ratting.isRelation()).to.be.false();
        done();
    });

    it('should return true if the property is a reversed property', (done) => {
        let reversedProperty = db.User.schema.getProperty('contents');
        let isReversed = reversedProperty.isReversed();
        expect(isReversed).to.be.true();


        let property = db.User.schema.getProperty('name');
        let isReversed2 = property.isReversed();
        expect(isReversed2).to.be.false();
        done();
    });

    it('should return all properties that match the reversed property', (done) => {
        let reverseProperty = db.User.schema.getProperty('contents');
        let properties = reverseProperty.fromReversedProperties();
        expect(properties.length).to.equal(6);
        let modelNames = properties.map(o => o.modelSchema.name);
        expect(modelNames).to.include([
            'Content',
            'OnlineContent',
            'Comment',
            'Book',
            'Ebook',
            'BlogPost'
        ]);
        done();
    });

    it('should return true if the property is abstract', (done) => {
        let reviewedBooks = db.User.schema.getProperty('reviewedBooks');
        expect(reviewedBooks.isAbstract()).to.be.true();

        let author = db.BlogPost.schema.getProperty('author');
        expect(author.isAbstract()).to.be.false();

        let ratting = db.BlogPost.schema.getProperty('ratting');
        expect(ratting.isAbstract()).to.be.false();
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