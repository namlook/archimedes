import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var beforeEach = lab.beforeEach;
var expect = Code.expect;

import store from './db';
import archimedes from '../lib/database';

import _ from 'lodash';
import uuid from 'uuid';
import Promise from 'bluebird';
import fs from 'fs';

let stream2promise = function(stream) {
    return new Promise((resolve, reject) => {

        let results = [];
        stream.on('data', function(doc) {
            results.push(doc);
        });

        stream.on('end', function() {
            resolve(results);
        });

        stream.on('error', function(error) {
            reject(error);
        });
    });
};


describe('Database', function() {

    var db;
    before(function(done) {
        store().then((registeredDB) => {
            db = registeredDB;
            done();
        }).catch((error) => {
            console.log(error.stack);
        });
    });

    beforeEach(function(done) {
        db.clear().then(() => {
            done();
        }).catch((error) => {
            console.log(error);
            console.log(error.stack);
        });
    });


    it('should throw an error if no adapter are found', (done) => {
        var throws = function() {
            archimedes();
        };

        expect(throws).to.throws('database: no adapter found');
        done();
    });

    describe('#getModelFromPlural()', function() {
        it('should return the model by its plural', (done) => {
            let model = db.getModelFromPlural('blog-posts');
            expect(model.name).to.equal('BlogPost');

            let model2 = db.getModelFromPlural('users');
            expect(model2.name).to.equal('User');

            done();
        });
    });

    describe('#findProperties()', function() {

        it('should return a list of properties that match the name', (done) => {
            let isPublished = db.findProperties('isPublished');
            expect(isPublished.length).to.equal(1);
            expect(isPublished[0].modelSchema.name).to.equal('BlogPost');

            let title = db.findProperties('body');
            expect(title.length).to.equal(1);
            let modelNames = title.map(o => o.modelSchema.name);
            expect(modelNames).to.only.include([
                'Content'
            ]);

            done();
        });

        it('should return a list of reverse properties that match the name', (done) => {
            let contents = db.findProperties('contents');
            expect(contents).to.be.an.array();
            expect(contents.length).to.equal(1);
            expect(contents[0].name).to.equal('contents');
            expect(contents[0].modelSchema.name).to.equal('User');

            let reversedProperty = contents[0].getPropertyFromInverseRelationship();
            expect(reversedProperty.modelSchema.name).to.equal('Content');
            expect(reversedProperty.name).to.equal('author');

            done();
        });

        it('should return only the properties that match a mixin', (done) => {
            let body = db.findProperties('body', 'Book');
            expect(body.modelSchema.name).to.equal('Content');

            done();
        });

        it('should return all properties that match a child mixin', (done) => {
            let property = db.findProperties('isPublished', 'Content');
            expect(property.modelSchema.name).to.equal('BlogPost');

            let property2 = db.findProperties('reviewer', 'Content');
            expect(property2.modelSchema.name).to.equal('Book');
            done();
        });

    });


    describe('#find()', function() {
        it('should return a promise', (done) => {
            let promise = db.find('BlogPost');
            expect(promise.then).to.be.a.function();
            promise.then(() => {
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should return all results', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: i % 5});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData).to.deep.equal(data);
                return db.find('BlogPost');
            }).then((results) => {
                expect(_.sortBy(results, '_id')).to.deep.equal(data);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should return results that match the query', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({
                    _id: `bp${i}`,
                    _type: 'BlogPost',
                    title: `post ${i}`,
                    ratting: i % 5
                });
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData).to.deep.equal(data);
                return db.find('BlogPost', {ratting: 4});
            }).then((results) => {
                expect(results.length).to.equal(2);
                expect(results.map(o => o.ratting)).to.only.include([4]);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should return an empty array when no results match', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({
                    _id: `bp${i}`,
                    _type: 'BlogPost',
                    title: `post ${i}`,
                    ratting: i % 5
                });
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData).to.deep.equal(data);
                return db.find('BlogPost', {title: 'bla'});
            }).then((results) => {
                expect(results).to.be.an.array();
                expect(results.length).to.equal(0);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should fetch a float with a certain precision', (done) => {
            let data = [
                {
                    _id: 'post1',
                    ratting: 2.434
                },
                {
                    _id: 'post2',
                    ratting: 2.436
                },
                {
                    _id: 'post3',
                    ratting: 2.2
                }
            ];


            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData).to.deep.equal([
                    { _id: 'post1', ratting: 2.43, _type: 'BlogPost' },
                    { _id: 'post2', ratting: 2.44, _type: 'BlogPost' },
                    { _id: 'post3', ratting: 2.2, _type: 'BlogPost' }
                ]);
                return db.find('BlogPost');
            }).then((fetchedData) => {
                expect(fetchedData).to.deep.equal([
                    { _id: 'post1', ratting: 2.43, _type: 'BlogPost' },
                    { _id: 'post2', ratting: 2.44, _type: 'BlogPost' },
                    { _id: 'post3', ratting: 2.2, _type: 'BlogPost' }
                ]);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should fetch dates', (done) => {
            let date1 = new Date(Date.UTC(2015, 30, 6));
            let date2 = new Date(Date.UTC(1984, 7, 3));
            let date3 = new Date(Date.UTC(1987, 5, 1));
            let data = [
                {
                    _id: 'post1',
                    createdDate: date1
                },
                {
                    _id: 'post2',
                    createdDate: date2
                },
                {
                    _id: 'post3',
                    createdDate: date3
                }
            ];


            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData).to.deep.equal([
                    { _id: 'post1', createdDate: date1, _type: 'BlogPost' },
                    { _id: 'post2', createdDate: date2, _type: 'BlogPost' },
                    { _id: 'post3', createdDate: date3, _type: 'BlogPost' }
                ]);
                return db.find('BlogPost');
            }).then((fetchedData) => {
                expect(fetchedData).to.deep.equal([
                    { _id: 'post1', createdDate: date1, _type: 'BlogPost' },
                    { _id: 'post2', createdDate: date2, _type: 'BlogPost' },
                    { _id: 'post3', createdDate: date3, _type: 'BlogPost' }
                ]);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should fetch multiple ids', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: i % 5});
            }
            db.batchSync('BlogPost', data).then(() => {
                return db.find('BlogPost', {_id: {$in: ['bp2', 'bp5', 'bp8', 'bp9']}});
            }).then((results) => {
                expect(results.length).to.equal(4);
                expect(results.map((o) => o._id)).to.only.include(
                    ['bp2', 'bp5', 'bp8', 'bp9']);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });
    });

    describe('#stream()', function() {
        it('should return a stream', (done) => {
            let stream = db.stream('BlogPost');
            expect(stream.pipe).to.be.a.function();
            done();
        });

        it('should return all results', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: i % 5});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData).to.deep.equal(data);

                let stream = db.stream('BlogPost');
                return stream2promise(stream);
            }).then((results) => {
                expect(_.sortBy(results, '_id')).to.deep.equal(data);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should return results that match the query', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({
                    _id: `bp${i}`,
                    _type: 'BlogPost',
                    title: `post ${i}`,
                    ratting: i % 5
                });
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData).to.deep.equal(data);
                let stream = db.stream('BlogPost', {ratting: 4});
                return stream2promise(stream);
            }).then((results) => {
                expect(results.length).to.equal(2);
                expect(results.map(o => o.ratting)).to.only.include([4]);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should return an empty array when no results match', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({
                    _id: `bp${i}`,
                    _type: 'BlogPost',
                    title: `post ${i}`,
                    ratting: i % 5
                });
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData).to.deep.equal(data);
                let stream = db.stream('BlogPost', {title: 'bla'});
                return stream2promise(stream);
            }).then((results) => {
                expect(results).to.be.an.array();
                expect(results.length).to.equal(0);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should fetch a float with a certain precision', (done) => {
            let data = [
                {
                    _id: 'post1',
                    ratting: 2.434
                },
                {
                    _id: 'post2',
                    ratting: 2.436
                },
                {
                    _id: 'post3',
                    ratting: 2.2
                }
            ];


            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData).to.deep.equal([
                    { _id: 'post1', ratting: 2.43, _type: 'BlogPost' },
                    { _id: 'post2', ratting: 2.44, _type: 'BlogPost' },
                    { _id: 'post3', ratting: 2.2, _type: 'BlogPost' }
                ]);
                let stream = db.stream('BlogPost');
                return stream2promise(stream);
            }).then((fetchedData) => {
                expect(fetchedData).to.deep.equal([
                    { _id: 'post1', ratting: 2.43, _type: 'BlogPost' },
                    { _id: 'post2', ratting: 2.44, _type: 'BlogPost' },
                    { _id: 'post3', ratting: 2.2, _type: 'BlogPost' }
                ]);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should fetch dates', (done) => {
            let date1 = new Date(Date.UTC(2015, 30, 6));
            let date2 = new Date(Date.UTC(1984, 7, 3));
            let date3 = new Date(Date.UTC(1987, 5, 1));
            let data = [
                {
                    _id: 'post1',
                    createdDate: date1
                },
                {
                    _id: 'post2',
                    createdDate: date2
                },
                {
                    _id: 'post3',
                    createdDate: date3
                }
            ];


            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData).to.deep.equal([
                    { _id: 'post1', createdDate: date1, _type: 'BlogPost' },
                    { _id: 'post2', createdDate: date2, _type: 'BlogPost' },
                    { _id: 'post3', createdDate: date3, _type: 'BlogPost' }
                ]);
                let stream = db.stream('BlogPost');
                return stream2promise(stream);
            }).then((fetchedData) => {
                expect(fetchedData).to.deep.equal([
                    { _id: 'post1', createdDate: date1, _type: 'BlogPost' },
                    { _id: 'post2', createdDate: date2, _type: 'BlogPost' },
                    { _id: 'post3', createdDate: date3, _type: 'BlogPost' }
                ]);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should fetch multiple ids', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: i % 5});
            }
            db.batchSync('BlogPost', data).then(() => {
                let stream = db.stream('BlogPost', {_id: {$in: ['bp2', 'bp5', 'bp8', 'bp9']}});
                return stream2promise(stream);
            }).then((results) => {
                expect(results.length).to.equal(4);
                expect(results.map((o) => o._id)).to.only.include(
                    ['bp2', 'bp5', 'bp8', 'bp9']);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });
    });

    describe('#first()', function() {
        it('should return a promise', (done) => {
            let promise = db.first('BlogPost');
            expect(promise.then).to.be.a.function();
            promise.then(() => {
                done();
            });
        });


        it('should return a document that match a query', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({
                    _id: `bp${i}`,
                    _type: 'BlogPost',
                    title: `post ${i}`,
                    ratting: i % 5
                });
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData).to.deep.equal(data);
                return db.first('BlogPost', {title: 'post 1'});
            }).then((doc) => {
                expect(doc).to.be.an.object();
                expect(doc.title).to.equal('post 1');
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });


        it('should return a document that match {_id: ...}', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({
                    _id: `bp${i}`,
                    _type: 'BlogPost',
                    title: `post ${i}`,
                    ratting: i % 5
                });
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData).to.deep.equal(data);
                return db.first('BlogPost', {_id: 'bp1'});
            }).then((doc) => {
                expect(doc).to.be.an.object();
                expect(doc.title).to.equal('post 1');
                return db.first('BlogPost', {_id: 'notfound'});
            }).then((notFoundDoc) => {
                expect(notFoundDoc).to.not.exist();
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should return undefined when no results match', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({
                    _id: `bp${i}`,
                    _type: 'BlogPost',
                    title: `post ${i}`,
                    ratting: i % 5
                });
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData).to.deep.equal(data);
                return db.first('BlogPost', {title: 'bla'});
            }).then((results) => {
                expect(results).to.be.undefined();
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });

        it('should return a pojo with only the specified fields', (done) => {
            db.sync('BlogPost', {
                _id: 'thepost',
                _type: 'BlogPost',
                title: 'the post',
                ratting: '4'
            }).then(() => {
                return db.first('BlogPost', {_id: 'thepost'}, {fields: ['ratting']});
            }).then((result) => {
                expect(result).to.be.an.object();
                expect(result._id).to.equal('thepost');
                expect(result.title).to.not.exists();
                expect(result.ratting).to.equal(4);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });
    });


    describe('#fetch()', function(){
        it('should return a promise', (done) => {
            db.sync('BlogPost', {
                _id: 'thepost',
                _type: 'BlogPost',
                title: 'the post'
            }).then(() => {
                let promise = db.fetch('BlogPost', 'thepost');
                expect(promise.then).to.be.a.function();
                promise.then(() => {
                    done();
                }).catch((error) => {
                    console.log(error);
                });
            });
        });


        it('should return a pojo that match the id', (done) => {
            db.sync('BlogPost', {
                _id: 'thepost',
                _type: 'BlogPost',
                title: 'the post'
            }).then(() => {
                return db.fetch('BlogPost', 'thepost');
            }).then((result) => {
                expect(result).to.be.an.object();
                expect(result._id).to.equal('thepost');
                expect(result.title).to.equal('the post');
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should return null if the id doesnt match', (done) => {
            db.sync('BlogPost', {
                _id: 'thepost',
                _type: 'BlogPost',
                title: 'the post'
            }).then(() => {
                return db.fetch('BlogPost', 'otherpost');
            }).then((result) => {
                expect(result).to.not.exists();
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should return a pojo with only the specified fields', (done) => {
            db.sync('BlogPost', {
                _id: 'thepost',
                _type: 'BlogPost',
                title: 'the post',
                ratting: '4'
            }).then(() => {
                return db.fetch('BlogPost', 'thepost', {fields: ['ratting']});
            }).then((result) => {
                expect(result).to.be.an.object();
                expect(result._id).to.equal('thepost');
                expect(result.title).to.not.exists();
                expect(result.ratting).to.equal(4);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should reject if no model type is specified', (done) => {
            db.fetch().catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('fetch: modelType is required and should be a string');
                done();
            });
        });

        it('should reject if no id is specified', (done) => {
            db.fetch('BlogPost').catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('fetch: id is required and should be a string');
                done();
            });
        });

    });


    describe('#update()', function() {
        it('should return a promise', (done) => {
            db.sync('BlogPost', {
                _id: 'thepost',
                _type: 'BlogPost',
                title: 'the post'
            }).then(() => {
                let promise = db.update('BlogPost', {_id: 'thepost'}, []);
                expect(promise.then).to.be.a.function();
                promise.then(() => {
                    done();
                }).catch((error) => {
                    console.log(error);
                });
            });
        });


        it('should update a document', (done) => {
            db.sync('BlogPost', {_id: 'thepost', title: 'the post'}).then(() => {
                return db.update('BlogPost', 'thepost', [
                    {operator: 'set', property: 'isPublished', value: true},
                    {operator: 'unset', property: 'title', value: 'the post'},
                    {operator: 'set', property: 'title', value: 'new title'}
                ]);
            }).then(() => {
                return db.fetch('BlogPost', 'thepost');
            }).then((doc) => {
                expect(doc.title).to.equal('new title');
                expect(doc.isPublished).to.be.true();
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should cast the values if needed', (done) => {
            db.sync('BlogPost', {_id: 'thepost', title: 'the post'}).then(() => {
                return db.update('BlogPost', 'thepost', [
                    {operator: 'set', property: 'isPublished', value: 'true'},
                    {operator: 'set', property: 'publishedDate', value: '1984-08-02T22:00:00.000Z'}
                ]);
            }).then(() => {
                return db.fetch('BlogPost', 'thepost');
            }).then((doc) => {
                expect(doc.isPublished).to.be.a.boolean();
                expect(doc.publishedDate).to.be.a.date();
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should unset values', (done) => {
            db.sync('BlogPost', {_id: 'thepost', title: 'the post'}).then(() => {
                return db.update('BlogPost', 'thepost', [
                    {operator: 'unset', property: 'isPublished'},
                    {operator: 'unset', property: 'title', value: 'the post'}
                ]);
            }).then(() => {
                return db.fetch('BlogPost', 'thepost');
            }).then((doc) => {
                expect(doc.isPublished).to.not.exist();
                expect(doc.title).to.not.exist();
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        describe('should validate the operations before syncing', function() {

            it('and throw an error when the property is unknown', (done) => {
                db.sync('BlogPost', {_id: 'thepost', title: 'the post'}).then(() => {
                    return db.update('BlogPost', 'thepost', [
                        {operator: 'set', property: 'unknownProperty', value: 'arf'}
                    ]);
                }).catch((error) => {
                    expect(error).to.exist();
                    expect(error.name).to.equal('ValidationError');
                    expect(error.message).to.equal('Unknown property');
                    expect(error.extra).to.equal('unknown property "unknownProperty" on model "BlogPost"');
                    done();
                });
            });

            it('and throw an error if the value is bad', (done) => {
                db.sync('BlogPost', {_id: 'thepost', title: 'the post'}).then(() => {
                    return db.update('BlogPost', 'thepost', [
                        {operator: 'set', property: 'isPublished', value: 'arf'}
                    ]);
                }).catch((error) => {
                    expect(error).to.exist();
                    expect(error.name).to.equal('ValidationError');
                    expect(error.message).to.equal('Bad value');
                    expect(error.extra).to.equal('"isPublished" must be a boolean');
                    done();
                });
            });
        });

        it('should reject if the operations are not an array', (done) => {
            db.update('BlogPost', 'foo').catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('update: operations should be an array');
                done();
            });
        });

        it('should reject if the model type is not specified', (done) => {
            db.update([]).catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('update: modelType should be a string');
                done();
            });
        });
    });

    describe('#sync()', function() {

        it('should return a promise', (done) => {
            let promise = db.sync('BlogPost', {title: 'the post'});
            expect(promise.then).to.be.a.function();
            promise.then(() => {
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should sync a document', (done) => {
            var savedPojoId;
            db.find('BlogPost').then((results) => {
                expect(results.length).to.equal(0);
                return db.sync('BlogPost', {title: 'the post', ratting: 4});
            }).then((savedPojo) => {
                savedPojoId = savedPojo._id;
                expect(savedPojo._id).to.exist();

                expect(uuid.parse(savedPojoId)[0]).to.not.equal(0);

                expect(savedPojo._type).to.equal('BlogPost');
                expect(savedPojo.title).to.equal('the post');
                expect(savedPojo.ratting).to.equal(4);
                return db.find('BlogPost');
            }).then((results) => {
                expect(results.length).to.equal(1);
                expect(results[0]._id).to.equal(savedPojoId);
                expect(results[0].title).to.equal('the post');
                expect(results[0].ratting).to.equal(4);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should keep the same id beetween syncs', (done) => {
            db.sync('BlogPost', {title: 'the post', _id: 'thepost'}).then((pojo) => {
                expect(pojo._id).to.equal('thepost');
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });

        it('should reject if the pojo is not an object', (done) => {
            db.sync('BlogPost', 'foo').catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('sync: the document should be an object');
                done();
            });
        });

        it('should reject if the model type is not specified', (done) => {
            db.sync([]).catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('sync: modelType should be a string');
                done();
            });
        });

    });

    describe('#batchSync()', function() {
        it('should return a promise', (done) => {
            let promise = db.batchSync('BlogPost', [{title: 'the post'}]);
            expect(promise.then).to.be.a.function();
            promise.then(() => {
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should sync a list of documents', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: i % 5});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData).to.deep.equal(data);
                return db.find('BlogPost');
            }).then((results) => {
                expect(_.sortBy(results, '_id')).to.deep.equal(data);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should reject if the documents is not a list', (done) => {
            db.batchSync('BlogPost', {foo: true}).catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('batchSync: data should be an array');
                done();
            });
        });


        it('should reject if no model type are specified', (done) => {
            db.batchSync([{title: 'foo'}]).catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('batchSync: modelType should be a string');
                done();
            });
        });


        it('should validate and cast the documents if needed', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: `${i % 5}`});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData.map(o => o.ratting)).to.only.include([0, 1, 2, 3, 4]);
                return db.find('BlogPost');
            }).then((results) => {
                expect(results.length).to.equal(10);
                expect(results.map(o => o.ratting)).to.only.include([0, 1, 2, 3, 4]);
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });


        it('should reject if the documents are not valid', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, isPublished: 'arf'});
            }
            db.batchSync('BlogPost', data).catch((error) => {
                expect(error).to.exist();
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('Bad value');
                expect(error.extra).to.equal('"isPublished" must be a boolean');
                done();
            });
        });

        it.skip('should handle 10000 records', (done) => {
            let users = [];
            for (let i = 0; i < 10000; i++) {
                users.push({
                    _id: `user${i}`,
                    _type: 'User',
                    name: `user ${i}`
                });
            }
            db.batchSync('User', users).then(() => {
                return db.count('User');
            }).then((total) => {
                console.log(total);
                expect(total).to.equal(10000);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });
    });


    describe('#delete()', function() {
        it('should return a promise', (done) => {
            let promise = db.delete('BlogPost', 'thepost');
            expect(promise.then).to.be.a.function();
            promise.then(() => {
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should remove a document from the db', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: `${i % 5}`});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData.map(o => o.ratting)).to.only.include([0, 1, 2, 3, 4]);
                return db.delete('BlogPost', 'bp3');
            }).then(() => {
                return db.fetch('BlogPost', 'bp3');
            }).then((doc) => {
                expect(doc).to.not.exist();
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should reject if no id is passed', (done) => {
            db.delete('BlogPost').catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('delete: id should be a string');
                done();
            });
        });


        it('should reject if no model type are specified', (done) => {
            db.delete().catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('delete: modelType should be a string');
                done();
            });
        });

    });

    describe('#count()', function() {
        it('should return a promise', (done) => {
            expect(db.count('BlogPost').then).to.be.a.function();
            done();
        });

        it('should return the number of documents', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: `${i % 5}`});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                return db.count('BlogPost');
            }).then((total) => {
                expect(total).to.equal(10);
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });

        it('should return the number of documents that match the query', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: `${i % 5}`});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                return db.count('BlogPost', {ratting: 3});
            }).then((total) => {
                expect(total).to.equal(2);
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });


        it('should validate an cast the query', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: `${i % 5}`});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                return db.count('BlogPost', {ratting: '3'});
            }).then((total) => {
                expect(total).to.equal(2);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should reject if the query is invalid', (done) => {
            db.count('BlogPost', {arf: true}).catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('malformed query');
                expect(error.extra).to.equal('unknown property "arf" on model "BlogPost"');
                done();
            });
        });


        it('should reject if query is not an object', (done) => {
            db.count('BlogPost', 'foo').catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('count: query should be an object');
                done();
            });
        });


        it('should reject if no model type are specified', (done) => {
            db.count().catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('count: modelType should be a string');
                done();
            });
        });

    });


    describe('#execute()', function() {
        it('should return a promise');
        it('should talk directly to the store');
    });

    describe('#clearResource()', function() {

        it('should return a promise', (done) => {
            expect(db.clearResource('BlogPost').then).to.be.a.function();
            done();
        });


        it('should reject an error if no modelType is passed', (done) => {
            db.clearResource().catch((err) => {
                expect(err).to.exist();
                expect(err.message).to.equal('clearResource: modelType should be a string');
                done();
            });
        });

        it('should reject an error if the modelType is unknown', (done) => {
            db.clearResource('UnknownModel').catch((err) => {
                expect(err).to.exist();
                expect(err.message).to.equal('clearResource: Unknown modelType: "UnknownModel"');
                done();
            });
        });


        it('should remove all selected resource', (done) => {
            var blogPosts = _.range(10).map((i) => {
                return {_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`};
            });

            var users = _.range(10).map((i) => {
                return {_id: `user${i}`, _type: 'User', name: `user ${i}`};
            });

            var comments = _.range(10).map((i) => {
                return {_id: `comment${i}`, _type: 'Comment', body: `comment ${i}`};
            });


            Promise.all([
                db.batchSync('BlogPost', blogPosts),
                db.batchSync('User', users),
                db.batchSync('Comment', comments)
            ]).then(() => {
                return Promise.all([
                    db.count('BlogPost'),
                    db.count('User'),
                    db.count('Comment')
                ]);
            }).then((counts) => {
                expect(counts[0]).to.equal(10);
                expect(counts[1]).to.equal(10);
                expect(counts[2]).to.equal(10);

                return db.clearResource('User');
            }).then(() => {

                return Promise.all([
                    db.count('BlogPost'),
                    db.count('User'),
                    db.count('Comment')
                ]);
            }).then((counts) => {
                expect(counts[0]).to.equal(10);
                expect(counts[1]).to.equal(0);
                expect(counts[2]).to.equal(10);

                return db.clearResource('Comment');
            }).then(() => {

                return Promise.all([
                    db.count('BlogPost'),
                    db.count('User'),
                    db.count('Comment')
                ]);
            }).then((counts) => {
                expect(counts[0]).to.equal(10);
                expect(counts[1]).to.equal(0);
                expect(counts[2]).to.equal(0);

                return db.clearResource('BlogPost');
            }).then(() => {

                return Promise.all([
                    db.count('BlogPost'),
                    db.count('User'),
                    db.count('Comment')
                ]);
            }).then((counts) => {
                expect(counts[0]).to.equal(0);
                expect(counts[1]).to.equal(0);
                expect(counts[2]).to.equal(0);

                done();
            }).catch((err) => {
                console.log(err);
                console.log(err.stack);
            });
        });
    });

    describe('#csvStreamParse()', function() {

        it('should import a csv file', (done) => {

            let data = _.range(3).map((i) => {

                return {
                    _id: `bp${i}`,
                    _type: 'BlogPost',
                    body: `hello from "${i}"`,
                    title: `post ${i}`,
                    ratting: i % 5,
                    isPublished: i % 2,
                    createdDate: new Date(2015, 7, i + 1),
                    author: {_id: 'namlook', _type: 'User'},
                    credits: _.range(i).map((o) => {
                        return {_id: `user${o}`, _type: 'User'};
                    }),
                    tags: _.range(i).map((o) => `tag${o}`)
                };

            });
            db.batchSync('BlogPost', data).then(() => {
                db.BlogPost.find().then((results) => {
                    let promises = [];
                    for (let instance of results) {
                        promises.push(instance.toCsv());
                    }

                    Promise.all(promises).then((csvLines) => {

                        const FILENAME = './tests/data_import.csv';
                        csvLines.unshift(db.BlogPost.csvHeader());

                        fs.writeFileSync(FILENAME, csvLines.join('\n'));

                        let stream = fs.createReadStream(FILENAME, { flags: 'r' });
                        let syncStream = db.writableStream('BlogPost');
                        let csvStream = db.csvStreamParse('BlogPost', stream);
                        let writerStream = csvStream.pipe(syncStream);

                        writerStream.on('end', function() {
                            db.find('BlogPost').then((savedResults) => {
                                expect(savedResults).to.deep.equal(
                                    [ { _id: 'bp0',
                                        title: 'post 0',
                                        ratting: 0,
                                        createdDate: new Date(2015, 7, 1),
                                        isPublished: false,
                                        author: { _id: 'namlook', _type: 'User' },
                                        body: 'hello from "0"',
                                        _type: 'BlogPost' },
                                      { _id: 'bp1',
                                        title: 'post 1',
                                        ratting: 1,
                                        createdDate: new Date(2015, 7, 2),
                                        isPublished: true,
                                        author: { _id: 'namlook', _type: 'User' },
                                        body: 'hello from "1"',
                                        credits: [ { _id: 'user0', _type: 'User' } ],
                                        tags: [ 'tag0' ],
                                        _type: 'BlogPost' },
                                      { _id: 'bp2',
                                        title: 'post 2',
                                        ratting: 2,
                                        createdDate: new Date(2015, 7, 3),
                                        isPublished: false,
                                        author: { _id: 'namlook', _type: 'User' },
                                        body: 'hello from "2"',
                                        credits:
                                         [ { _id: 'user0', _type: 'User' },
                                           { _id: 'user1', _type: 'User' } ],
                                        tags: [ 'tag0', 'tag1' ],
                                        _type: 'BlogPost' } ]
                                );
                                fs.unlinkSync(FILENAME);
                                done();
                            });
                        });
                    });
                });
            }).catch((error) => {
                console.error(error);
                console.error(error.details);
            });
        });

        it('should handle empty lines', (done) => {
            const FILENAME = './tests/csv/good_blogposts.csv';

            let stream = fs.createReadStream(FILENAME, { flags: 'r' });
            let csvStream = db.csvStreamParse('BlogPost', stream);
            let syncStream = db.writableStream('BlogPost');
            let writerStream = csvStream.pipe(syncStream);
            writerStream.on('end', function() {
                db.find('BlogPost').then((savedResults) => {
                    expect(savedResults).to.deep.equal(
                        [ { _id: 'bp0',
                            title: 'post 0',
                            ratting: 0,
                            createdDate: new Date(Date.UTC(2015, 7, 0, 22)),
                            isPublished: false,
                            author: { _id: 'namlook', _type: 'User' },
                            body: 'hello from "0"',
                            _type: 'BlogPost' },
                          { _id: 'bp1',
                            title: 'post 1',
                            ratting: 1,
                            createdDate: new Date(Date.UTC(2015, 7, 1, 22)),
                            isPublished: true,
                            author: { _id: 'namlook', _type: 'User' },
                            body: 'hello from "1"',
                            credits: [ { _id: 'user0', _type: 'User' } ],
                            tags: [ 'tag0' ],
                            _type: 'BlogPost' },
                          { _id: 'bp2',
                            title: 'post 2',
                            ratting: 2,
                            createdDate: new Date(Date.UTC(2015, 7, 2, 22)),
                            isPublished: false,
                            author: { _id: 'namlook', _type: 'User' },
                            body: 'hello from "2"',
                            credits:
                             [ { _id: 'user0', _type: 'User' },
                               { _id: 'user1', _type: 'User' } ],
                            tags: [ 'tag0', 'tag1' ],
                            _type: 'BlogPost' } ]
                    );
                    done();
                });
            });

            writerStream.on('error', function(error) {
                console.error('xxx', error);
            });
        });

        it('should handle bad values', (done) => {
            const FILENAME = './tests/csv/bad_blogposts.csv';

            let stream = fs.createReadStream(FILENAME, { flags: 'r' });
            let syncStream = db.writableStream('BlogPost');
            let writerStream = db.csvStreamParse('BlogPost', stream).pipe(syncStream);

            writerStream.on('error', function(error) {
                expect(error.name).to.equal('ValidationError');
                expect(error.message).to.equal('Bad value');
                expect(error.extra).to.equal('"ratting" must be a number');
                done();
            });
        });


        it('should throw an error when passing an unknown model type', (done) => {
            let throws = function() {
                db.csvStreamParse('Unknown');
            };

            expect(throws).to.throws('importCsv: Unknown modelType: "Unknown"');
            done();
        });

    });
});
