import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
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


    describe('#pending()', function() {
        it('should return the pending operations', (done) => {
            let blogPost = db.BlogPost.create();
            blogPost.set('title', 'the title')
                    .set('isPublished', true)
                    .push('tags', ['foo', 'bar'])
                    .push('tags', 'baz');
            expect(blogPost.pending().length).to.equal(4);
            done();
        });
    });


    describe('#save()', function() {
        it('should save the instance in database an attach an _id', (done) => {
            let blogPost = db.BlogPost.create();
            blogPost.set('title', 'the title')
                    .set('isPublished', true)
                    .push('tags', ['foo', 'bar'])
                    .push('tags', 'baz');
            blogPost.save();
            expect(db.fetch(blogPost._id)).to.deep.equal(blogPost);
            done();
        });
    });

});