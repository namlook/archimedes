import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var beforeEach = lab.beforeEach;
var expect = Code.expect;

import store from './db';

describe('Model instance persistance', function() {

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

    describe('#pending()', function() {

        it('should return all pending operations', (done) => {
            let blogPost = db.BlogPost.create();
            blogPost.set('title', 'the title');
            blogPost.set('tags', ['foo', 'bar']);

            let pending = blogPost.pending();
            expect(pending.length).to.equal(3);

            expect(pending[0].operator).to.equal('set');
            expect(pending[0].property).to.equal('title');
            expect(pending[0].value).to.equal('the title');

            expect(pending[1].operator).to.equal('push');
            expect(pending[1].property).to.equal('tags');
            expect(pending[1].value).to.equal('foo');

            expect(pending[2].operator).to.equal('push');
            expect(pending[2].property).to.equal('tags');
            expect(pending[2].value).to.equal('bar');


            blogPost.set('title', 'new title');
            blogPost.set('tags', ['toto', 'titi']);

            pending = blogPost.pending();

            expect(pending[3].operator).to.equal('unset');
            expect(pending[3].property).to.equal('title');
            expect(pending[3].value).to.equal('the title');

            expect(pending[4].operator).to.equal('set');
            expect(pending[4].property).to.equal('title');
            expect(pending[4].value).to.equal('new title');

            expect(pending[5].operator).to.equal('pull');
            expect(pending[5].property).to.equal('tags');
            expect(pending[5].value).to.equal('bar');

            expect(pending[6].operator).to.equal('pull');
            expect(pending[6].property).to.equal('tags');
            expect(pending[6].value).to.equal('foo');

            expect(pending[7].operator).to.equal('push');
            expect(pending[7].property).to.equal('tags');
            expect(pending[7].value).to.equal('toto');

            expect(pending[8].operator).to.equal('push');
            expect(pending[8].property).to.equal('tags');
            expect(pending[8].value).to.equal('titi');

            blogPost.unset('title');
            blogPost.unset('tags');

            pending = blogPost.pending();

            expect(pending[9].operator).to.equal('unset');
            expect(pending[9].property).to.equal('title');
            expect(pending[9].value).to.equal('new title');

            expect(pending[10].operator).to.equal('pull');
            expect(pending[10].property).to.equal('tags');
            expect(pending[10].value).to.equal('titi');

            expect(pending[11].operator).to.equal('pull');
            expect(pending[11].property).to.equal('tags');
            expect(pending[11].value).to.equal('toto');

            done();
        });

        it('should not add operation if the value is the same', (done) => {
            let blogPost = db.BlogPost.create({title: 'the post'});
            blogPost.set('title', 'the post');
            expect(blogPost.pending()).to.be.empty();
            blogPost.set('isPublished', false);
            expect(blogPost.pending().length).to.equal(1);
            blogPost.set('isPublished', false);
            expect(blogPost.pending().length).to.equal(1);
            blogPost.set('publishedDate', new Date(Date.UTC(1984, 7, 3)));
            expect(blogPost.pending().length).to.equal(2);
            blogPost.set('publishedDate', '1984-08-03');
            expect(blogPost.pending().length).to.equal(2);
            done();
        });

        it('should not push operation if the value is already present', (done) => {
            let dates = [
                new Date(1984, 7, 3),
                new Date(1987, 5, 1),
                new Date(2015, 6, 30)];
            let blogPost = db.GenericType.create({dates: dates});
            expect(blogPost.pending()).to.be.empty();
            blogPost.push('dates', new Date(1984, 7, 3));
            expect(blogPost.pending()).to.be.empty();
            blogPost.push('dates', new Date(2011, 2, 25));
            expect(blogPost.pending().length).to.equal(1);
            done();
        });

    });


    describe('#save()', function() {
        it('should return a promise', (done) => {
            let blogPost = db.BlogPost.create();
            let promise = blogPost.save();
            expect(promise.then).to.be.a.function();
            promise.then(() => {
                done();
            }).catch((error) => {
                console.log(error);
            });
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
                return db.fetch(blogPost._type, blogPost._id);
            }).then((fetchedBlogPost) => {
                expect(fetchedBlogPost).to.deep.equal(blogPost.attrs());
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should keep the integrity after many operations', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost._id).to.not.exist();

            blogPost.set('title', 'the title')
                    .set('isPublished', true)
                    .push('tags', ['foo', 'bar'])
                    .push('tags', 'baz');


            blogPost.save().then(() => {
                expect(blogPost._id).to.exist();
                blogPost.set('isPublished', false);
                blogPost.pull('tags', ['baz', 'foo']);
                blogPost.push('tags', 'arf');
                return blogPost.save();
            }).then(() => {
                return db.fetch(blogPost._type, blogPost._id);
            }).then((fetchedBlogPost) => {
                expect(fetchedBlogPost).to.deep.equal(blogPost.attrs());
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should clear all pending operations', (done) => {
            let blogPost = db.BlogPost.create();
            blogPost.set('title', 'the title')
                    .set('isPublished', true)
                    .push('tags', ['foo', 'bar'])
                    .push('tags', 'baz');

            expect(blogPost.pending().length).to.equal(5);
            blogPost.save().then((savedBlogPost) => {
                expect(blogPost.pending().length).to.equal(0);
                expect(savedBlogPost.pending().length).to.equal(0);
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });


        it('should validate the model instance before saving', (done) => {
            let blogPost = db.BlogPost.create({
                title: 'the post',
                isPublished: 'arf'
            });
            blogPost.save().catch((error) => {
                expect(error).to.exist();
                expect(error.message).to.equal('Bad value');
                expect(error.extra).to.equal('"isPublished" must be a boolean');
                done();
            });
        });


        it('should have the same id over multiple save', (done) => {
            let blogPost = db.BlogPost.create({_id: 'thepost', title: 'the post'});
            expect(blogPost._id).to.not.exists();

            blogPost.save().then((bp) => {
                bp.set('title', 'new post');
                return bp.save();
            }).then((bp) => {
                expect(bp._id).to.equal(blogPost._id);
                expect(bp.get('title')).to.equal('new post');
                done();
            }).catch((error) => {
                console.log(error.stack);
            });
        });
    });

    describe('#delete()', () => {
        it('should delete a model instance', (done) => {
            let blogPost = db.BlogPost.create({_id: 'thepost', title: 'the post'});

            blogPost.save().then(() => {
                return db.BlogPost.fetch('thepost');
            }).then((bp) => {
                expect(bp.get('title')).to.equal('the post');
                return bp.delete();
            }).then(() => {
                return db.BlogPost.fetch('thepost');
            }).then((data) => {
                expect(data).to.not.exists();
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should throw an error when trying to delete a not saved model instance', (done) => {
            let blogPost = db.BlogPost.create({_id: 'thepost', title: 'the post'});

            blogPost.delete().catch((error) => {
                expect(error).to.exists();
                expect(error.message).to.equal("Can't delete a not saved model instance");
                done();
            });
        });


    });

});