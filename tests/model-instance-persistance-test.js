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
            let pending = blogPost.pending();
            expect(pending.length).to.equal(4);
            expect(pending).to.deep.equal([
                { operator: 'set', property: 'title', value: 'the title' },
                { operator: 'set', property: 'isPublished', value: true },
                { operator: 'push', property: 'tags', value: [ 'foo', 'bar' ] },
                { operator: 'push', property: 'tags', value: [ 'baz' ] }
            ]);
            done();
        });
    });


    describe('#save()', function() {
        it('should return a promise', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.save().then).to.be.a.function();
            done();
        });


        it('should save the instance in database an attach an _id', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost._id).to.not.exist();

            blogPost.set('title', 'the title')
                    .set('isPublished', true)
                    .push('tags', ['foo', 'bar'])
                    .push('tags', 'baz');

            blogPost.save().then((savedBlogPost) => {
                expect(blogPost._id).to.exist();

                expect(savedBlogPost._archimedesModelInstance).to.be.true();
                expect(savedBlogPost.attrs()).to.deep.equal(blogPost.attrs());
                expect(savedBlogPost._id).to.exist();

                let {_id, _type} = blogPost;
                let fetchedBlogPost = db.first(blogPost._type, {_id, _type});
                expect(fetchedBlogPost).to.deep.equal(blogPost.attrs());

                done();
            });
        });

        it('should clear all pending operations', (done) => {
            let blogPost = db.BlogPost.create();
            blogPost.set('title', 'the title')
                    .set('isPublished', true)
                    .push('tags', ['foo', 'bar'])
                    .push('tags', 'baz');

            expect(blogPost.pending().length).to.equal(4);
            blogPost.save().then((savedBlogPost) => {
                expect(blogPost.pending().length).to.equal(0);
                expect(savedBlogPost.pending().length).to.equal(0);
                done();
            });
        });

        it('should validate the model instance before saving', (done) => {
            let blogPost = db.BlogPost.create({title: 'the post', isPublished: 'arf'});
            blogPost.save().catch((error) => {
                expect(error).to.exist();
                expect(error[0].path).to.equal('isPublished');
                expect(error[0].message).to.equal('"isPublished" must be a boolean');
                done();
            });
        });

    });

});