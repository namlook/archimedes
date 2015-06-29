
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

describe('Model Instance', function() {

    var db;
    before(function(done) {
        db = archimedes();
        db.register(modelSchemas);
        done();
    });


    describe('#get()', function() {
        it('should get the property value', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.get('title')).to.be.undefined();
            blogPost.attrs.title = 'the title';
            expect(blogPost.get('title')).to.equal('the title');
            done();
        });
    });



    describe('#set()', function() {

        it('should set an property value', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs.title).to.not.exist();
            blogPost.set('title', 'the title');
            expect(blogPost.attrs.title).to.equal('the title');
            blogPost.set('title', 'a new title');
            expect(blogPost.attrs.title).to.equal('a new title');
            done();
        });


        it('should return the model instance', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs.title).to.not.exist();
            let modelInstance = blogPost.set('title', 'the title');
            expect(blogPost.attrs.title).to.equal('the title');
            expect(modelInstance._archimedesModelInstance).to.be.true();
            expect(modelInstance.attrs.title).to.equal('the title');
            done();
        });

    });



    describe('#unset()', function() {
        it('should unset an property', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs.title).to.be.undefined();
            blogPost.set('title', 'the title');
            expect(blogPost.attrs.title).to.equal('the title');
            blogPost.unset('title');
            expect(blogPost.attrs.title).to.be.undefined();
            done();
        });


        it('should be able to unset an undefined property value', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs.title).to.be.undefined();
            blogPost.unset('title');
            expect(blogPost.attrs.title).to.be.undefined();
            blogPost.unset('title');
            expect(blogPost.attrs.title).to.be.undefined();
            done();
        });

        it('should return the model instance', (done) => {
            let blogPost = db.BlogPost.create();
            blogPost.set('title', 'the title');
            let modelInstance = blogPost.unset('title');
            expect(blogPost.attrs.title).to.be.undefined();
            expect(modelInstance._archimedesModelInstance).to.be.true();
            expect(modelInstance.attrs.title).to.be.undefined();
            done();
        });

    });



    describe('#push()', function() {
        it('should push a value to a property array', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs.tags).to.be.undefined();
            blogPost.push('tags', 'foo');
            expect(blogPost.attrs.tags).to.be.an.array();
            expect(blogPost.attrs.tags).to.only.include(['foo']);
            blogPost.push('tags', 'bar');
            expect(blogPost.attrs.tags).to.only.include(['foo', 'bar']);
            done();
        });


        it('should push multiple values to a property array', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs.tags).to.be.undefined();
            blogPost.push('tags', ['foo', 'bar']);
            expect(blogPost.attrs.tags).to.be.an.array();
            expect(blogPost.attrs.tags).to.only.include(['foo', 'bar']);
            blogPost.push('tags', 'baz');
            expect(blogPost.attrs.tags).to.only.include(['foo', 'bar', 'baz']);
            done();
        });


        it('should not create an array if the value is null', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs.tags).to.be.undefined();
            blogPost.push('tags', '');
            expect(blogPost.attrs.tags).to.be.undefined();
            blogPost.push('tags', null);
            expect(blogPost.attrs.tags).to.be.undefined();
            blogPost.push('tags', undefined);
            expect(blogPost.attrs.tags).to.be.undefined();
            blogPost.push('tags');
            expect(blogPost.attrs.tags).to.be.undefined();
            done();
        });


        it('should returns the model instance', (done) => {
            let blogPost = db.BlogPost.create();
            let modelInstance = blogPost.push('tags', 'foo').push('tags', 'bar');
            expect(blogPost.attrs.tags).to.be.an.array();
            expect(blogPost.attrs.tags).to.only.include(['foo', 'bar']);
            expect(modelInstance._archimedesModelInstance).to.be.true();
            expect(modelInstance.attrs.tags).to.only.include(['foo', 'bar']);
            done();
        });
    });



    describe('#pull()', function() {
        it('should remove a value to a property array', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs.tags).to.be.undefined();
            blogPost.push('tags', ['foo', 'bar', 'baz']);
            blogPost.pull('tags', 'foo');
            expect(blogPost.attrs.tags).to.be.an.array();
            expect(blogPost.attrs.tags).to.only.include(['bar', 'baz']);
            done();
        });


        it('should remove multiple values to a property array', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs.tags).to.be.undefined();
            blogPost.push('tags', ['foo', 'bar', 'baz']);
            blogPost.pull('tags', ['foo', 'baz']);
            expect(blogPost.attrs.tags).to.only.include(['bar']);
            done();
        });


        it('should unset the property value if the array is empty', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs.tags).to.be.undefined();
            blogPost.push('tags', ['foo', 'bar', 'baz']);
            blogPost.pull('tags', ['foo', 'bar', 'baz']);
            expect(blogPost.attrs.tags).to.be.undefined();
            done();
        });


        it('should returns the model instance', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs.tags).to.be.undefined();
            blogPost.push('tags', ['foo', 'bar', 'baz']);
            let modelInstance = blogPost.pull('tags', 'foo').pull('tags', 'baz');
            expect(blogPost.attrs.tags).to.only.include(['bar']);
            expect(modelInstance._archimedesModelInstance).to.be.true();
            expect(modelInstance.attrs.tags).to.only.include(['bar']);
            done();
        });
    });



    describe('#validate()', function() {});
    describe('#save()', function() {});

});