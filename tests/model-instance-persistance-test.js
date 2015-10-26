import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var beforeEach = lab.beforeEach;
var expect = Code.expect;

import store from './db';
import _ from 'lodash';

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


        it('should delete cascade', (done) => {
            let users = _.range(0, 5).map((index) => {
                return {
                    _id: `user${index}`,
                    _type: 'User',
                    name: `user ${index}`,
                    genericStaff: {_id: `generic${index}`, _type: 'GenericType'}
                };
            });

            let genericTypes = _.range(0, 5).map((index) => {
                return {
                    _id: `generic${index}`,
                    _type: 'GenericType',
                    text: `hello ${index}`
                };
            });

            Promise.all([
                db.batchSync('User', users),
                db.batchSync('GenericType', genericTypes)
            ]).then(() => {
            /** remove a blog post **/

                return db.User.fetch('user1');

            }).then((user1) => {

                return user1.delete();

            }).then(() => {

                return db.find('User');

            }).then((fetchedUsers) => {

                expect(fetchedUsers).to.deep.equal([
                  { _id: 'user0',
                    name: 'user 0',
                    genericStaff: { _id: 'generic0', _type: 'GenericType' },
                    _type: 'User' },
                  { _id: 'user2',
                    name: 'user 2',
                    genericStaff: { _id: 'generic2', _type: 'GenericType' },
                    _type: 'User' },
                  { _id: 'user3',
                    name: 'user 3',
                    genericStaff: { _id: 'generic3', _type: 'GenericType' },
                    _type: 'User' },
                  { _id: 'user4',
                    name: 'user 4',
                    genericStaff: { _id: 'generic4', _type: 'GenericType' },
                    _type: 'User' }
                ]);

                return db.find('GenericType');

            }).then((fetchedGenericTypes) => {

                expect(fetchedGenericTypes).to.deep.equal([
                  { _id: 'generic0', text: 'hello 0', _type: 'GenericType' },
                  { _id: 'generic2', text: 'hello 2', _type: 'GenericType' },
                  { _id: 'generic3', text: 'hello 3', _type: 'GenericType' },
                  { _id: 'generic4', text: 'hello 4', _type: 'GenericType' }
                ]);

                done();

            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should delete cascade multi', (done) => {
            let users = _.range(0, 5).map((index) => {
                return {
                    _id: `user${index}`,
                    _type: 'User',
                    name: `user ${index}`,
                    genericStuff: [
                        {_id: `generic${index}`, _type: 'GenericType'},
                        {_id: `generic${index + 1}`, _type: 'GenericType'},
                        {_id: `generic${index + 2}`, _type: 'GenericType'}
                    ]

                };
            });

            let genericTypes = _.range(0, 10).map((index) => {
                return {
                    _id: `generic${index}`,
                    _type: 'GenericType',
                    text: `hello ${index}`
                };
            });

            Promise.all([
                db.batchSync('User', users),
                db.batchSync('GenericType', genericTypes)
            ]).then(() => {
            /** remove a blog post **/

                return db.User.fetch('user1');

            }).then((user1) => {

                return user1.delete();

            }).then(() => {

                return db.find('User');

            }).then((fetchedUsers) => {

                expect(fetchedUsers.length).to.equal(4);
                expect(fetchedUsers.map((o) => o._id)).to.only.include([
                    'user0', 'user2', 'user3', 'user4']);

                return db.find('GenericType');

            }).then((fetchedGenericTypes) => {

                expect(fetchedGenericTypes).to.deep.equal([
                  { _id: 'generic0', text: 'hello 0', _type: 'GenericType' },
                  { _id: 'generic4', text: 'hello 4', _type: 'GenericType' },
                  { _id: 'generic5', text: 'hello 5', _type: 'GenericType' },
                  { _id: 'generic6', text: 'hello 6', _type: 'GenericType' },
                  { _id: 'generic7', text: 'hello 7', _type: 'GenericType' },
                  { _id: 'generic8', text: 'hello 8', _type: 'GenericType' },
                  { _id: 'generic9', text: 'hello 9', _type: 'GenericType' }
                ]);

                done();

            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });


        it('should delete cascade inverse relationships', (done) => {
            let users = _.range(0, 5).map((index) => {
                return {
                    _id: `user${index}`,
                    _type: 'User',
                    name: `user ${index}`
                };
            });

            let blogposts = _.range(0, 10).map((index) => {
                return {
                    _id: `blogpost${index}`,
                    _type: 'BlogPost',
                    title: `hello ${index}`,
                    author: {_id: `user${index % 2}`, _type: 'User'}
                };
            });

            let comments = _.range(0, 10).map((index) => {
                return {
                    _id: `comment${index}`,
                    _type: 'Comment',
                    body: `comment ${index}`,
                    author: {_id: `user${index % 2}`, _type: 'User'},
                    target: {_id: `blogpost${index % 3}`, _type: 'BlogPost'}
                };
            });

            Promise.all([
                db.batchSync('User', users),
                db.batchSync('BlogPost', blogposts),
                db.batchSync('Comment', comments)
            ]).then(() => {
            /** remove a blog post **/

                return db.BlogPost.fetch('blogpost0');

            }).then((blogPost0) => {

                return blogPost0.delete();

            }).then(() => {

                return db.fetch('BlogPost', 'blogpost0');

            }).then((noBlogPost0) => {

                expect(noBlogPost0).to.not.exists();

                return db.find('Comment', {_id: {$in: [
                    'comment0', 'comment3', 'comment6', 'comment9']}});

            }).then((noComments) => {
                expect(noComments.length).to.equal(0);

                return db.find('Comment', {});

             }).then((fetchedComments) => {

                expect(fetchedComments.length).to.equal(6);

                return db.find('User', {});

            }).then((fetchedUsers) => {

                expect(fetchedUsers.length).to.equal(5);

                done();

            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should deep delete cascade inverse relationships', (done) => {
            let users = _.range(0, 5).map((index) => {
                return {
                    _id: `user${index}`,
                    _type: 'User',
                    name: `user ${index}`
                };
            });

            let blogposts = _.range(0, 10).map((index) => {
                return {
                    _id: `blogpost${index}`,
                    _type: 'BlogPost',
                    title: `hello ${index}`,
                    author: {_id: `user${index % 2}`, _type: 'User'}
                };
            });

            let comments = _.range(0, 10).map((index) => {
                return {
                    _id: `comment${index}`,
                    _type: 'Comment',
                    body: `comment ${index}`,
                    author: {_id: `user${index % 2}`, _type: 'User'},
                    target: {_id: `blogpost${index % 3}`, _type: 'BlogPost'}
                };
            });

            Promise.all([
                db.batchSync('User', users),
                db.batchSync('BlogPost', blogposts),
                db.batchSync('Comment', comments)
            ]).then(() => {

            /** remove a user **/
                return db.User.fetch('user1');

            }).then((user1) => {

                return user1.delete();

            /**
             *  it should remove:
             *
             *  - blogPosts (1, 3, 5, 7, 9)
             *  - comments:
             *      - from blogPosts: (1, 4, 7)
             *      - remove the author: (3, 5, 9)
             */

            }).then(() => {

                return db.fetch('User', 'user1');

            }).then((noUser1) => {

                expect(noUser1).to.not.exist();

               return db.find('BlogPost', {});

            }).then((blogPosts) => {

                expect(blogPosts).to.deep.equal([
                  { _id: 'blogpost0',
                    title: 'hello 0',
                    author: { _id: 'user0', _type: 'User' },
                    _type: 'BlogPost' },
                  { _id: 'blogpost2',
                    title: 'hello 2',
                    author: { _id: 'user0', _type: 'User' },
                    _type: 'BlogPost' },
                  { _id: 'blogpost4',
                    title: 'hello 4',
                    author: { _id: 'user0', _type: 'User' },
                    _type: 'BlogPost' },
                  { _id: 'blogpost6',
                    title: 'hello 6',
                    author: { _id: 'user0', _type: 'User' },
                    _type: 'BlogPost' },
                  { _id: 'blogpost8',
                    title: 'hello 8',
                    author: { _id: 'user0', _type: 'User' },
                    _type: 'BlogPost' } ]);

                return db.find('Comment', {});

            }).then((fetchedComments) => {
                expect(fetchedComments).to.deep.equal([
                  { _id: 'comment0',
                    author: { _id: 'user0', _type: 'User' },
                    body: 'comment 0',
                    target: { _id: 'blogpost0', _type: 'OnlineContent' },
                    _type: 'Comment' },
                  { _id: 'comment2',
                    author: { _id: 'user0', _type: 'User' },
                    body: 'comment 2',
                    target: { _id: 'blogpost2', _type: 'OnlineContent' },
                    _type: 'Comment' },
                  { _id: 'comment3',
                    body: 'comment 3',
                    target: { _id: 'blogpost0', _type: 'OnlineContent' },
                    _type: 'Comment' },
                  { _id: 'comment5',
                    body: 'comment 5',
                    target: { _id: 'blogpost2', _type: 'OnlineContent' },
                    _type: 'Comment' },
                  { _id: 'comment6',
                    author: { _id: 'user0', _type: 'User' },
                    body: 'comment 6',
                    target: { _id: 'blogpost0', _type: 'OnlineContent' },
                    _type: 'Comment' },
                  { _id: 'comment8',
                    author: { _id: 'user0', _type: 'User' },
                    body: 'comment 8',
                    target: { _id: 'blogpost2', _type: 'OnlineContent' },
                    _type: 'Comment' },
                  { _id: 'comment9',
                    body: 'comment 9',
                    target: { _id: 'blogpost0', _type: 'OnlineContent' },
                    _type: 'Comment' }
                ]);

                return db.find('User', {});

            }).then((fetchedUsers) => {

                expect(fetchedUsers.map((o) => o._id)).to.only.include([
                    'user0', 'user2', 'user3', 'user4']);

                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });
    });

});