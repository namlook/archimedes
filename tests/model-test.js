
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

describe('Model', function() {

    var db;
    before(function(done) {
        db = archimedes();
        db.register(modelSchemas);
        done();
    });


    describe('#create()', function() {

        it('should create a model instance', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost._archimedesModelInstance).to.be.true();
            expect(blogPost._type).to.equal('BlogPost');
            done();
        });


        it('should create a model instance with specified values', (done) => {
            let blogPost = db.BlogPost.create({
                title: 'the title'
            });
            expect(blogPost.get('title')).to.equal('the title');
            done();
        });
    });


});