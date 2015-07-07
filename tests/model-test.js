
import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
var expect = Code.expect;

import {database} from './db';
import store from './db';

describe('Model', function() {

    var db;
    before(function(done) {
        store().then((registeredDb) => {
            db = registeredDb;
            done();
        }).catch((error) => {
            console.log(error.stack);
        });
    });


    describe('[schema]', function(){
        it('should accept empty schema', (done) => {
            database().register({
                EmptyModel: {}
            }).then((registeredDb) => {
                expect(registeredDb.EmptyModel.properties).to.be.empty();
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });


        it('should throw an error if the schema have unknown properties', (done) => {

            database().register({
                BadModel: {
                    mixin: ['UnknownModel']
                }
            }).catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('BadModel "mixin" is not allowed');
                done();
            });
        });

        it('should throw an error if the properties have no type', (done) => {
            database().register({
                BadModel: {
                    properties: {
                        title: {
                        }
                    }
                }
            }).catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('BadModel invalid type for property "title"');
                done();
            });
        });


        it("should throw an error if the properties' type are not string", (done) => {
            database().register({
                BadModel: {
                    properties: {
                        title: {
                            type: true
                        }
                    }
                }
            }).catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('BadModel invalid type for property "title"');
                done();
            });
        });


        it("should throw an error if the properties' type is an array and items is not defined", (done) => {
            database().register({
                BadModel: {
                    properties: {
                        title: {
                            type: 'array'
                        }
                    }
                }
            }).catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal("BadModel if property's type is \"array\" then \"items\" should be specified (properties.title)");
                done();
            });
        });


        it('should throw an error if the properties have an unknown field', (done) => {
            database().register({
                BadModel: {
                    properties: {
                        title: {
                            type: 'string',
                            arf: 'foo'
                        }
                    }
                }
            }).catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('BadModel "arf" is not allowed (properties.title)');
                done();
            });
        });


        it('should throw an error if property type is not valid', (done) => {
            database().register({
                BadModel: {
                    properties: {
                        title: {
                            type: 'foo'
                        }
                    }
                }
            }).catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('BadModel invalid type for property "title"');
                done();
            });
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
            database().register({
                BadModel: {
                    mixins: ['UnknownModel']
                }
            }).catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('BadModel: unknown mixin "UnknownModel"');
                done();
            });
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


        it('should  an error is methods are not functions', (done) => {
            database().register({
                BadModel: {
                    methods: {
                        badMethod: 'foo'
                    }
                }
            }).catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('BadModel "badMethod" must be a Function (methods.badMethod)');
                done();
            });
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


        it('should  an error is statics are not functions', (done) => {
            database().register({
                BadModel: {
                    statics: {
                        badStaticMethod: 'foo'
                    }
                }
            }).catch((error) => {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('BadModel "badStaticMethod" must be a Function (statics.badStaticMethod)');
                done();
            });
        });
    });


    describe('#create()', function() {

        it('should create a model instance', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost._archimedesModelInstance).to.be.true();
            expect(blogPost._type).to.equal('BlogPost');
            expect(blogPost._id).to.not.exist();
            done();
        });


        it('should create a model instance with specified values', (done) => {
            let blogPost = db.BlogPost.create({
                title: 'the title'
            });
            expect(blogPost.get('title')).to.equal('the title');
            done();
        });


        it('should create a model instance with no _id (even if passed)', (done) => {
            let blogPost = db.BlogPost.create({
                _id: 'thepost',
                title: 'the title'
            });
            expect(blogPost.get('_id')).to.equal('thepost');
            expect(blogPost._id).to.not.exist();
            expect(blogPost.get('title')).to.equal('the title');
            done();
        });
    });


});