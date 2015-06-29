import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
var expect = Code.expect;

import archimedes from '../lib';
import {ValidationError} from '../lib/errors';
import modelSchemas from './fixtures-model-schemas';

describe('Model Schema', function() {

    var db;
    before(function(done) {
        db = archimedes();
        db.register(modelSchemas);
        done();
    });

    describe('[schema]', function(){
        it('should accept empty schema', (done) => {
            let database = archimedes();

            database.register({
                EmptyModel: {}
            });
            expect(database.EmptyModel.properties).to.be.empty();
            done();
        });

        it('should throw an error if the schema are unknown properties', (done) => {
            let database = archimedes();

            var throws = function() {
                database.register({
                    BadModel: {
                        mixin: ['UnknownModel']
                    }
                });
            };

            expect(throws).to.throw(ValidationError, 'BadModel ValidationError: "mixin" is not allowed');
            done();
        });

    });


    describe('[mixins]', function() {

        it('should aggregate properties', (done) => {
            expect(db.BlogPost.properties).to.include([
                'title', 'body', 'author', 'tags', 'comments', 'backlinks'
            ]);
            expect(db.Book.properties).to.include([
                'title', 'body', 'author', 'isbn'
            ]);
            done();
        });

        it('should aggregate static methods', (done) => {
            expect(db.Book.generateSlug).to.not.exist();
            expect(db.Book.checkIsbn).to.be.a.function();
            let blogPost = db.BlogPost.create();
            expect(blogPost.generateSlug).to.be.a.function();
            done();
        });

        it('should throw an error if the mixins are not registered', (done) => {
            let database = archimedes();

            let throws = function() {
                database.register({
                    BadModel: {
                        mixins: ['UnknownModel']
                    }
                });
            };

            expect(throws).to.throw(ValidationError, 'BadModel: unknown mixin "UnknownModel"');
            done();
        });
    });

    describe('[methods]', function() {

        it('should have access to the attributes', (done) => {
            let blogPost = db.BlogPost.create();
            blogPost.set('title', 'the post');
            expect(blogPost.generateSlug()).to.equal('the-post');
            done();
        });

        it('should not be called from model class', (done) => {
            expect(db.BlogPost.generateSlug).to.not.exist();
            done();
        });
    });

    describe('[statics]', function() {

        it('should be called on model class', (done) => {
            let isbn = db.Book.checkIsbn('isbn:foo');
            expect(isbn).to.be.true();
            done();
        });

        it('should not be called on model instance', (done) => {
            let book = db.Book.create();
            expect(book.checkIsbn).to.not.exist();
            done();
        });

    });


});

