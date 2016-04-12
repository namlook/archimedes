
import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
var expect = Code.expect;

import store from './db';

describe('Model Instance validation', function() {

    var db;
    before(function(done) {
        store().then((registeredDB) => {
            db = registeredDB;
            done();
        }).catch((error) => {
            console.log(error.stack);
        });
    });


    it('should validate a model instance', (done) => {
        let now = new Date();
        let blogPost = db.BlogPost.create({
            title: 'the title',
            body: 'the body',
            author: {_id: 'me', _type: 'User'},
            credits: [{_id: 'user1', _type: 'User'}, {_id: 'user2', _type: 'User'}],
            tags: ['super', 'content'],
            updatedDate: now,
            ratting: 5,
            isPublished: true
        });
        blogPost.validate().then((value) => {
            expect(value).to.be.an.object();
            done();
        }).catch((error) => {
            console.log(error);
        });
    });


    it('should return an error if the type is not a string', (done) => {
        let blogPost = db.BlogPost.create({title: 23});
        blogPost.validate().catch((error) => {
            expect(error.name).to.equal('ValidationError');
            expect(error.message).to.equal('Bad value');
            expect(error.extra).to.equal('"title" must be a string');
            done();
        });
    });


    it('should return an error if the type is not a number', (done) => {
        let blogPost = db.BlogPost.create({ratting: 'foo'});
        blogPost.validate().catch((error) => {
            expect(error.name).to.equal('ValidationError');
            expect(error.message).to.equal('Bad value');
            expect(error.extra).to.equal('"ratting" must be a number');
            done();
        });
    });


    it('should return an error if the type is not a boolean', (done) => {
        let blogPost = db.BlogPost.create({isPublished: 'foo'});
        blogPost.validate().catch((error) => {
            expect(error.name).to.equal('ValidationError');
            expect(error.message).to.equal('Bad value');
            expect(error.extra).to.equal('"isPublished" must be a boolean');
            done();
        });
    });


    it('should return an error if the type is not a date', (done) => {
        let blogPost = db.BlogPost.create({updatedDate: 'foo'});
        blogPost.validate().catch((error) => {
            expect(error.name).to.equal('ValidationError');
            expect(error.message).to.equal('Bad value');
            expect(error.extra).to.equal('"updatedDate" must be a number of milliseconds or valid date string');
            done();
        });
    });


    it('should return an error if the type is not an array of string', (done) => {
        let blogPost = db.BlogPost.create({tags: 23});
        blogPost.validate().catch((error) => {
            expect(error.name).to.equal('ValidationError');
            expect(error.message).to.equal('Bad value');
            expect(error.extra).to.equal('"tags" must be an array');
            done();
        });
    });

    describe('[relations]', () => {
        it('should allow a string as a relation reference', (done) => {
            const blogPost = db.BlogPost.create({ author: 'me' });
            blogPost.validate().then((value) => {
                expect(value).to.be.an.object();
                done();
            }).catch((error) => {
                console.log(error);
            });
        });


        it('should return an error if the relation is not saved', (done) => {
            let me = db.User.create({name: 'me'});
            let blogPost = db.BlogPost.create({author: me});
            blogPost.validate().catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('Bad value');
                expect(error.extra).to.equal('"author._id" is required');
                done();
            });
        });

        it('should return an error if the relation is not saved (even when _id is passed)', (done) => {
            let me = db.User.create({_id: 'me', name: 'me'});
            let blogPost = db.BlogPost.create({author: me});
            blogPost.validate().catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('Bad value');
                expect(error.extra).to.equal('"author._id" is required');
                done();
            });
        });


        it('should return an error if the type is not a list of model instances', (done) => {
            let blogPost = db.BlogPost.create({credits: ['foo', 2]});
            blogPost.validate().catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('Bad value');
                expect(error.extra).to.equal('"credits" must be an object');
                done();
            });
        });


        it('should return an error if the relations are not saved', (done) => {
            let good = db.Comment.create({body: 'good'});
            let ok = db.Comment.create({body: "it's ok"});
            let blogPost = db.BlogPost.create({credits: [good, ok]});
            blogPost.validate().catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('Bad value');
                expect(error.extra).to.equal('"credits._id" is required');
                done();
            });
        });

        it('should return an error if the relation is not saved (even when _id is passed)', (done) => {
            let good = db.Comment.create({_id: 'good', body: 'good'});
            let ok = db.Comment.create({_id: 'ok', body: "it's ok"});
            let blogPost = db.BlogPost.create({credits: [good, ok]});
            blogPost.validate().catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('Bad value');
                expect(error.extra).to.equal('"credits._id" is required');
                done();
            });
        });

    });

});
