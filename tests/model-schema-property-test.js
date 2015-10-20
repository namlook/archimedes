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

    it('should return true if the property is an inverse relationship', (done) => {
        let reversedProperty = db.User.schema.getProperty('contents');
        let isInverseRel = reversedProperty.isInverseRelationship();
        expect(isInverseRel).to.be.true();


        let property = db.User.schema.getProperty('name');
        let isInverseRel2 = property.isInverseRelationship();
        expect(isInverseRel2).to.be.false();
        done();
    });

    it('should return all inverse relationship', (done) => {
        let commentAuthor = db.Comment.schema.getProperty('author');
        let inverseCommentAuthor = commentAuthor.getInverseRelationshipsFromProperty();
        expect(inverseCommentAuthor).to.be.an.array();
        expect(inverseCommentAuthor.length).to.equal(2);
        expect(inverseCommentAuthor.map((o) => o.name)).to.only.include(['comments', 'contents']);
        expect(inverseCommentAuthor.map((o) => o.modelSchema.name)).to.only.include(['User']);

        let contentAuthor = db.Content.schema.getProperty('author');
        let inverseContentAuthor = contentAuthor.getInverseRelationshipsFromProperty();
        expect(inverseContentAuthor).to.be.an.array();
        expect(inverseContentAuthor.length).to.equal(1);
        expect(inverseContentAuthor.map((o) => o.name)).to.only.include(['contents']);
        expect(inverseContentAuthor.map((o) => o.modelSchema.name)).to.only.include(['User']);
        done();
    });

    it('should return undefined when getting inverseRelationships from an inverse relationship', (done) => {
        let userComments = db.User.schema.getProperty('comments');
        expect(userComments.isInverseRelationship()).to.be.true();
        let inverseUserComments = userComments.getInverseRelationshipsFromProperty();
        expect(inverseUserComments).to.not.exists();
        done();
    });

    it('should return all properties that match the inverse relationship', (done) => {
        let userContents = db.User.schema.getProperty('contents');
        let contentAuthor = userContents.getPropertyFromInverseRelationship();
        expect(contentAuthor).to.be.an.object();
        expect(contentAuthor.name).to.equal('author');
        expect(contentAuthor.modelSchema.name).to.equal('Content');

        let userComments = db.User.schema.getProperty('comments');
        let commentAuthor = userComments.getPropertyFromInverseRelationship();
        expect(commentAuthor).to.be.an.object();
        expect(commentAuthor.name).to.equal('author');
        expect(commentAuthor.modelSchema.name).to.equal('Comment');
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

    it('should return true if the property propagate the deletion', (done) => {
        let bpComments = db.BlogPost.schema.getProperty('comments');
        expect(bpComments.propagateDeletion()).to.be.true();

        let userComments = db.User.schema.getProperty('comments');
        expect(userComments.propagateDeletion()).to.equal('author');
        done();
    });

});