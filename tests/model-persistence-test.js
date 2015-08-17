
import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var beforeEach = lab.beforeEach;
var expect = Code.expect;

import store from './db';

describe('Model persistence', function() {

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

    describe('#find()', function(){
        it('should be a promise', (done) => {
            let promise = db.BlogPost.find();
            expect(promise.then).to.be.a.function();
            promise.then(() => {
                done();
            }).catch((error) => {
                console.log(error);
            });
        });


        it('should return an array if no results are found', (done) => {
            db.BlogPost.find().then((results) => {
                expect(results).to.be.an.array();
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should return a list of model instances', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, isPublished: Boolean(i % 2)});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                return db.BlogPost.find();
            }).then((results) => {
                expect(results.length).to.equal(10);
                expect(results[0]._archimedesModelInstance).to.be.true();
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });


        it('should return a list of model instances that match the query', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, isPublished: Boolean(i % 2)});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                return db.BlogPost.find({isPublished: true});
            }).then((results) => {
                expect(results.length).to.equal(5);
                expect(results.map(o => o.get('isPublished'))).to.only.include([true]);
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });


        it('should reject if the query isnt valid', (done) => {
            return db.BlogPost.find({arf: true}).catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('malformed query');
                expect(error.extra).to.equal('unknown property "arf" on model "BlogPost"');
                done();
            });
        });



        it('should validate the query and cast values if needed', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({_id: `bp${i}`, _type: 'BlogPost', title: `post ${i}`, ratting: i % 5});
            }
            db.batchSync('BlogPost', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                return db.BlogPost.find({ratting: '3'});
            }).then((results) => {
                expect(results.length).to.equal(2);
                expect(results.map(o => o.get('ratting'))).to.only.include([3]);
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });
    });

    describe('#groupBy()', function() {
        it('should group the result by a property', (done) => {
            var data = [];
            for (let i = 0; i < 10; i++) {
                data.push({
                    _id: `user${i}`,
                    _type: 'User',
                    name: `user ${i}`,
                    gender: i % 3 && 'male' || 'female'
                });
            }
            db.batchSync('User', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                return db.User.groupBy({property: 'gender', aggregation: 'count'});
            }).then((results) => {
                expect(results).to.deep.equal([
                    { label: 'female', value: '4' },
                    { label: 'male', value: '6' }
                ]);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should group with a query', (done) => {
            let data = [];
            for (let i = 0; i < 10; i++) {
                data.push({
                    _id: `user${i}`,
                    _type: 'User',
                    name: `user ${i}`,
                    gender: i % 3 && 'male' || 'female'
                });
            }
            db.batchSync('User', data).then((savedData) => {
                expect(savedData.length).to.equal(10);
                return db.User.groupBy(
                    {property: 'gender', aggregation: 'count'},
                    {gender: 'male'});
            }).then((results) => {
                expect(results).to.deep.equal([{ label: 'male', value: '6' }]);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should group with a deep relation property', (done) => {
            let users = [];
            for (let i = 0; i < 10; i++) {
                users.push({
                    _id: `user${i}`,
                    _type: 'User',
                    name: `user ${i}`,
                    gender: i % 3 && 'male' || 'female'
                });
            }

            let blogPosts = [];
            for (let i = 0; i < 10; i++) {
                blogPosts.push({
                    _id: `bp${i}`,
                    _type: 'BlogPost',
                    title: `blog post ${i}`,
                    author: {_type: 'User', _id: `user${i % 3}`}
                });
            }

            Promise.all([
                db.batchSync('User', users),
                db.batchSync('BlogPost', blogPosts)
            ]).then(() => {
                return db.BlogPost.groupBy(
                    {property: 'author.gender', aggregation: 'count'}
                );
            }).then((results) => {
                expect(results).to.deep.equal([
                    { label: 'female', value: '4' },
                    { label: 'male', value: '6' }
                ]);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should use the avg operator', (done) => {
            let blogPosts = [];
            for (let i = 0; i < 10; i++) {
                blogPosts.push({
                    _id: `bp${i}`,
                    _type: 'BlogPost',
                    title: `blog post ${i}`,
                    isPublished: Boolean(i % 2),
                    ratting: i % 3
                });
            }

            db.batchSync('BlogPost', blogPosts).then(() => {
                return db.BlogPost.groupBy({
                    property: 'isPublished',
                    aggregation: {operator: 'avg', target: 'ratting'}
                });
            }).then((results) => {
                expect(results).to.deep.equal([
                    { label: 'false', value: '1' },
                    { label: 'true', value: '0.8' }
                ]);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should throw an error if the property is unknown', (done) => {
            return db.User.groupBy({
                property: 'ratting'
            }).catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('unknown property "ratting" on model "User"');
                done();
            });
        });

        it('should throw an error if the operator is unknown', (done) => {
            return db.BlogPost.groupBy({
                property: 'isPublished',
                aggregation: {operator: 'blah', target: 'ratting'}
            }).catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('malformed aggregator');
                done();
            });
        });
    });
});