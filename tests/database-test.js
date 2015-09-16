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

    describe('#findProperties()', function() {

        it('should return a list of properties that match the name', (done) => {
            let isPublished = db.findProperties('isPublished');
            expect(isPublished.length).to.equal(1);
            expect(isPublished[0].modelSchema.name).to.equal('BlogPost');

            let title = db.findProperties('title');
            expect(title.length).to.equal(4);
            let modelNames = title.map(o => o.modelSchema.name);
            expect(modelNames).to.include(['Ebook', 'Book', 'BlogPost', 'Content']);

            done();
        });

        it('should return a list of reverse properties that match the name', (done) => {
            let contents = db.findProperties('contents');
            expect(contents.length).to.equal(1);
            expect(contents[0].name).to.equal('contents');
            expect(contents[0].modelSchema.name).to.equal('User');

            let reversedProperties = contents[0].fromReversedProperties();
            expect(reversedProperties.length).to.equal(4);
            let modelNames = reversedProperties.map(o => o.modelSchema.name);
            expect(modelNames).to.include([
                'Content', 'Ebook', 'Book', 'BlogPost'
            ]);

            let propNames = reversedProperties.map(o => o.name);
            expect(propNames.length).to.equal(4);
            expect(propNames).to.include(['author']);

            done();
        });

        it('should return only the properties that match a mixin', (done) => {
            let title = db.findProperties('title', 'Book');
            expect(title.length).to.equal(2);
            let modelNames = title.map(o => o.modelSchema.name);
            expect(modelNames).to.include(['Ebook', 'Book']);

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
            let promise = db.fetch('BlogPost', 'foo');
            expect(promise.then).to.be.a.function();
            promise.then(() => {
                done();
            }).catch((error) => {
                console.log(error);
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
            let promise = db.update('BlogPost', 'thepost', []);
            expect(promise.then).to.be.a.function();
            promise.then(() => {
                done();
            }).catch((error) => {
                console.log(error);
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


        it('should reject if the document are not valid', (done) => {
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

    describe('#stream()', () => {
        it.skip('should return a readable stream', (done) => {
            let users = [];
            for (let i = 0; i < 300; i++) {
                users.push({
                    _id: `user${i}`,
                    _type: 'User',
                    name: `user ${i}`
                });
            }

            db.batchSync('User', users).then(() => {
                db.stream('User').then((stream) => {
                    stream.pipe(process.stdout);
                    done();
                });
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });
    });

    describe('#execute()', function() {
        it('should return a promise');
        it('should talk directly to the store');
    });
});
