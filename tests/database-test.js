import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var beforeEach = lab.beforeEach;
var expect = Code.expect;

import archimedes from '../lib';
import modelSchemas from './fixtures-model-schemas';

describe('Model instance persistance', function() {

    var db;
    before(function(done) {
        db = archimedes();
        db.register(modelSchemas);
        done();
    });

    beforeEach(function(done) {
        db.clear().then(done).catch((error) => {
            console.log(error.stack);
        });
    });


    describe('#find()', function() {
        it('should return a promise', (done) => {
            expect(db.find('BlogPost').then).to.be.a.function();
            done();
        });

        it('should return the all results', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: i % 5});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                expect(savedData).to.deep.equal(data);
                return db.find('BlogPost');
            }).then((results) => {
                expect(results).to.deep.equal(data);
                done();
            }).catch((error) => {
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
                console.log(error.stack);
            });
        });
    });



    describe('#first()', function() {
        it('should return a promise', (done) => {
            expect(db.first('BlogPost').then).to.be.a.function();
            done();
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
    });

    describe('#update()', function() {
        it('should return a promise', (done) => {
            expect(db.update('BlogPost', []).then).to.be.a.function();
            done();
        });


        it('should update a document', (done) => {
            db.sync('BlogPost', {_id: 'thepost', title: 'the post'}).then(() => {
                db.update('BlogPost', 'thepost', [
                    {operator: 'set', property: 'isPublished', value: true},
                    {operator: 'set', property: 'title', value: 'new title'}
                ]).then((updatedDoc) => {
                    expect(updatedDoc.title).to.equal('new title');
                    expect(updatedDoc.isPublished).to.be.true();

                    return db.first('BlogPost', {_id: 'thepost'});
                }).then((doc) => {
                    expect(doc.title).to.equal('new title');
                    expect(doc.isPublished).to.be.true();
                    done();
                }).catch((error) => {
                    console.log(error.stack);
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
            expect(db.sync('BlogPost', {title: 'the post'}).then).to.be.a.function();
            done();
        });


        it('should sync a document', (done) => {
            var savedPojoId;
            db.find('BlogPost').then((results) => {
                expect(results.length).to.equal(0);
                return db.sync('BlogPost', {title: 'the post'});
            }).then((savedPojo) => {
                savedPojoId = savedPojo._id;
                expect(savedPojo._id).to.exist();
                expect(savedPojo._type).to.equal('BlogPost');
                expect(savedPojo.title).to.equal('the post');
                return db.find('BlogPost');
            }).then((results) => {
                expect(results.length).to.equal(1);
                expect(results[0]._id).to.equal(savedPojoId);
                done();
            }).catch((error) => {
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
            expect(db.batchSync('BlogPost', [{title: 'the post'}]).then).to.be.a.function();
            done();
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
                expect(results).to.deep.equal(data);
                done();
            }).catch((error) => {
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
                return db.BlogPost.find();
            }).then((results) => {
                expect(results.length).to.equal(10);
                expect(results.map(o => o.get('ratting'))).to.only.include([0, 1, 2, 3, 4]);
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
                expect(error.extra[0].message).to.equal('"isPublished" must be a boolean');
                done();
            });
        });
    });

    describe('#talk()', function() {
        it('should return a promise');
        it('should talk directly to the store');
    });
});
