
import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var beforeEach = lab.beforeEach;
var expect = Code.expect;

import archimedes from '../lib';
import MemoryAdapter from '../lib/adapters/memory';
import modelSchemas from './fixtures-model-schemas';

describe('Model persistence', function() {

    var db;
    before(function(done) {
        db = archimedes(MemoryAdapter);
        db.register(modelSchemas);
        done();
    });


    beforeEach(function(done) {
        db.clear().then(done).catch((error) => {
            console.log(error.stack);
        });
    });

    describe('#find()', function(){
        it('should be a promise', (done) => {
            expect(db.BlogPost.find().then).to.be.a.function();
            done();
        });


        it('should return an array if no results are found', (done) => {
            db.BlogPost.find().then((results) => {
                expect(results).to.be.an.array();
                done();
            }).catch((error) => {
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
                expect(error.extra[0].message).to.equal('unknown property "arf" for model BlogPost');
                expect(error.extra[0].path).to.equal('arf');
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
});