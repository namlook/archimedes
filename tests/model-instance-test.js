
import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
var expect = Code.expect;

import _ from 'lodash';

import store from './db';

describe('Model Instance', function() {

    var db;
    before(function(done) {
        store().then((registeredDB) => {
            db = registeredDB;
            done();
        }).catch((error) => {
            console.log(error.stack);
        });
    });

    describe('#get()', function() {
        it('should get the property value', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.get('title')).to.be.undefined();
            blogPost.set('title', 'the title');
            expect(blogPost.get('title')).to.equal('the title');
            done();
        });
    });



    describe('#set()', function() {

        it('should set an property value', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().title).to.not.exist();
            blogPost.set('title', 'the title');
            expect(blogPost.attrs().title).to.equal('the title');
            blogPost.set('title', 'a new title');
            expect(blogPost.attrs().title).to.equal('a new title');
            done();
        });

        it('should replace a property array', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().tags).to.not.exist();
            blogPost.set('tags', ['foo', 'bar']);
            expect(blogPost.attrs().tags).to.only.include(['foo', 'bar']);
            blogPost.set('tags', ['toto', 'titi']);
            expect(blogPost.attrs().tags).to.only.include(['toto', 'titi']);
            blogPost.set('tags', 'foo');
            expect(blogPost.attrs().tags).to.be.an.array();
            blogPost.validate().then(() => {
                done();
            });
        });

        it('should return the model instance', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().title).to.not.exist();
            let modelInstance = blogPost.set('title', 'the title');
            expect(blogPost.attrs().title).to.equal('the title');
            expect(modelInstance._archimedesModelInstance).to.be.true();
            expect(modelInstance.attrs().title).to.equal('the title');
            done();
        });
    });



    describe('#unset()', function() {
        it('should unset an property', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().title).to.be.undefined();
            blogPost.set('title', 'the title');
            expect(blogPost.attrs().title).to.equal('the title');
            blogPost.unset('title');
            expect(blogPost.attrs().title).to.be.undefined();
            done();
        });


        it('should be able to unset an undefined property value', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().title).to.be.undefined();
            blogPost.unset('title');
            expect(blogPost.attrs().title).to.be.undefined();
            blogPost.unset('title');
            expect(blogPost.attrs().title).to.be.undefined();
            done();
        });

        it('should return the model instance', (done) => {
            let blogPost = db.BlogPost.create();
            blogPost.set('title', 'the title');
            let modelInstance = blogPost.unset('title');
            expect(blogPost.attrs().title).to.be.undefined();
            expect(modelInstance._archimedesModelInstance).to.be.true();
            expect(modelInstance.attrs().title).to.be.undefined();
            done();
        });

    });



    describe('#push()', function() {
        it('should push a value to a property array', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().tags).to.be.undefined();
            blogPost.push('tags', 'foo');
            expect(blogPost.attrs().tags).to.be.an.array();
            expect(blogPost.attrs().tags).to.only.include(['foo']);
            blogPost.push('tags', 'bar');
            expect(blogPost.attrs().tags).to.only.include(['foo', 'bar']);
            done();
        });


        it('should push multiple values to a property array', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().tags).to.be.undefined();
            blogPost.push('tags', ['foo', 'bar']);
            expect(blogPost.attrs().tags).to.be.an.array();
            expect(blogPost.attrs().tags).to.only.include(['foo', 'bar']);
            blogPost.push('tags', 'baz');
            expect(blogPost.attrs().tags).to.only.include(['foo', 'bar', 'baz']);
            done();
        });


        it('should not create an array if the value is null', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().tags).to.be.undefined();
            blogPost.push('tags', '');
            expect(blogPost.attrs().tags).to.be.undefined();
            blogPost.push('tags', null);
            expect(blogPost.attrs().tags).to.be.undefined();
            blogPost.push('tags', undefined);
            expect(blogPost.attrs().tags).to.be.undefined();
            blogPost.push('tags');
            expect(blogPost.attrs().tags).to.be.undefined();
            done();
        });


        it('should returns the model instance', (done) => {
            let blogPost = db.BlogPost.create();
            let modelInstance = blogPost.push('tags', 'foo').push('tags', 'bar');
            expect(blogPost.attrs().tags).to.be.an.array();
            expect(blogPost.attrs().tags).to.only.include(['foo', 'bar']);
            expect(modelInstance._archimedesModelInstance).to.be.true();
            expect(modelInstance.attrs().tags).to.only.include(['foo', 'bar']);
            done();
        });
    });



    describe('#pull()', function() {
        it('should remove a value to a property array', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().tags).to.be.undefined();
            blogPost.push('tags', ['foo', 'bar', 'baz']);
            blogPost.pull('tags', 'foo');
            expect(blogPost.attrs().tags).to.be.an.array();
            expect(blogPost.attrs().tags).to.only.include(['bar', 'baz']);
            done();
        });


        it('should remove multiple values to a property array', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().tags).to.be.undefined();
            blogPost.push('tags', ['foo', 'bar', 'baz']);
            blogPost.pull('tags', ['foo', 'baz']);
            expect(blogPost.attrs().tags).to.only.include(['bar']);
            done();
        });


        it('should unset the property value if the array is empty', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().tags).to.be.undefined();
            blogPost.push('tags', ['foo', 'bar', 'baz']);
            blogPost.pull('tags', ['foo', 'bar', 'baz']);
            expect(blogPost.attrs().tags).to.be.undefined();
            done();
        });


        it('should returns the model instance', (done) => {
            let blogPost = db.BlogPost.create();
            expect(blogPost.attrs().tags).to.be.undefined();
            blogPost.push('tags', ['foo', 'bar', 'baz']);
            let modelInstance = blogPost.pull('tags', 'foo').pull('tags', 'baz');
            expect(blogPost.attrs().tags).to.only.include(['bar']);
            expect(modelInstance._archimedesModelInstance).to.be.true();
            expect(modelInstance.attrs().tags).to.only.include(['bar']);
            done();
        });
    });

    describe('inverse relationships', function() {
        it('should be a promise', (done) => {
            let instance = db.BlogPost.create({title: 'bla'});
            instance.save().then((savedInstance) => {
                let promise = savedInstance.comments();
                expect(promise.then).to.be.a.function();
                done();
            });
        });


        it('should return the relations', (done) => {
            let blogPosts = [
                {
                    _id: 'theblogpost0',
                    _type: 'BlogPost',
                    title: 'hello world'
                },
                {
                    _id: 'theblogpost1',
                    _type: 'BlogPost',
                    title: 'salut monde'
                }
            ];

            let batchComments = _.range(0, 10).map((index) => {
                return {
                    _id: `comment${index}`,
                    _type: 'Comment',
                    target: {_id: `theblogpost${index % 2}`, _type: 'BlogPost'},
                    body: `hello ${index}`
                };
            });

            Promise.all([
                db.batchSync('Comment', batchComments),
                db.batchSync('BlogPost', blogPosts)
            ]).then(() => {
                return db.BlogPost.fetch('theblogpost0');
            }).then((blogPost) => {
                return blogPost.comments();
            }).then((comments) => {
                expect(comments.length).to.equal(5);
                let commentIds = comments.map((comment) => comment._id);
                expect(commentIds).to.only.include([
                    'comment0',
                    'comment2',
                    'comment4',
                    'comment6',
                    'comment8'
                ]);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should filter the relations', (done) => {
            let blogPosts = [
                {
                    _id: 'theblogpost0',
                    _type: 'BlogPost',
                    title: 'hello world'
                },
                {
                    _id: 'theblogpost1',
                    _type: 'BlogPost',
                    title: 'salut monde'
                }
            ];

            let batchComments = _.range(0, 10).map((index) => {
                return {
                    _id: `comment${index}`,
                    _type: 'Comment',
                    target: {_id: `theblogpost${index % 2}`, _type: 'BlogPost'},
                    body: `hello ${index % 3}`
                };
            });

            Promise.all([
                db.batchSync('Comment', batchComments),
                db.batchSync('BlogPost', blogPosts)
            ]).then(() => {
                return db.BlogPost.fetch('theblogpost0');
            }).then((blogPost) => {
                return blogPost.comments({'body': 'hello 2'});
            }).then((comments) => {
                expect(comments.length).to.equal(2);
                let commentIds = comments.map((comment) => comment._id);
                expect(commentIds).to.only.include(['comment2', 'comment8']);
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });
    });

    describe('#toCsv()', function() {
        it('should be a promise', (done) => {
            let instance = db.BlogPost.create();
            let promise = instance.toCsv();
            expect(promise.then).to.be.a.function();
            promise.then(() => {
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should return only specified property values', (done) => {
            let blogPost = db.BlogPost.create({
                _id: 'thepost',
                title: 'the post',
                publishedDate: new Date(Date.UTC(2015, 8, 14)),
                updatedDate: new Date(Date.UTC(2015, 9, 14)),
                isPublished: true,
                ratting: 3,
                tags: ['foo', 'bar'],
                author: {_id: 'user1', _type: 'User'},
                credits: [
                    {_id: 'user1', _type: 'User'},
                    {_id: 'user2', _type: 'User'}
                ]
            });

            blogPost.toCsv({fields: ['ratting', 'isPublished']}).then((data) => {
                expect(data).to.equal('thepost,BlogPost,true,3');
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should throw an error if the property specified is unknown', (done) => {
            let blogPost = db.BlogPost.create({
                _id: 'thepost',
                title: 'the post',
                publishedDate: new Date(Date.UTC(2015, 8, 14)),
                updatedDate: new Date(Date.UTC(2015, 9, 14)),
                isPublished: true,
                ratting: 3,
                tags: ['foo', 'bar'],
                author: {_id: 'user1', _type: 'User'},
                credits: [
                    {_id: 'user1', _type: 'User'},
                    {_id: 'user2', _type: 'User'}
                ]
            });

            blogPost.toCsv({fields: ['unknown']}).catch((error) => {
                expect(error.message).to.equal('fields: unknown property "unknown"');
                done();
            });
        });

        it('should return the property values into csv format', (done) => {
            let blogPost = db.BlogPost.create({
                _id: 'thepost',
                title: 'the post',
                publishedDate: new Date(Date.UTC(2015, 8, 14)),
                updatedDate: new Date(Date.UTC(2015, 9, 14)),
                isPublished: true,
                ratting: 3,
                tags: ['foo', 'bar'],
                author: {_id: 'user1', _type: 'User'},
                credits: [
                    {_id: 'user1', _type: 'User'},
                    {_id: 'user2', _type: 'User'}
                ]
            });

            blogPost.toCsv().then((data) => {
                expect(data).to.equal('thepost,BlogPost,user1,,,,user1|user2,true,"Mon, 14 Sep 2015 00:00:00 GMT",3,,foo|bar,the post,"Wed, 14 Oct 2015 00:00:00 GMT"');
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

        it('should custom the delimiter', (done) => {
            let blogPost = db.BlogPost.create({
                _id: 'thepost',
                title: 'the post',
                publishedDate: new Date(Date.UTC(2015, 8, 14)),
                updatedDate: new Date(Date.UTC(2015, 9, 14)),
                isPublished: true,
                ratting: 3,
                tags: ['foo', 'bar'],
                author: {_id: 'user1', _type: 'User'},
                credits: [
                    {_id: 'user1', _type: 'User'},
                    {_id: 'user2', _type: 'User'}
                ]
            });

            blogPost.toCsv({delimiter: '\t'}).then((data) => {
                expect(data).to.equal('thepost\tBlogPost\tuser1\t\t\t\tuser1|user2\ttrue\tMon, 14 Sep 2015 00:00:00 GMT\t3\t\tfoo|bar\tthe post\tWed, 14 Oct 2015 00:00:00 GMT');
                done();
            }).catch((error) => {
                console.log(error);
                console.log(error.stack);
            });
        });

    });

    describe('#toJsonApi()', function() {
        it('should convert an instance into json api format', (done) => {
            let blogPost = db.BlogPost.create({
                _id: 'thepost',
                title: 'the post',
                publishedDate: new Date(2015, 8, 14),
                isPublished: true,
                ratting: 3,
                tags: ['foo', 'bar'],
                author: {_id: 'user1', _type: 'User'},
                credits: [
                    {_id: 'user1', _type: 'User'},
                    {_id: 'user2', _type: 'User'}
                ]
            });

            let jsonApi = blogPost.toJsonApi();
            expect(jsonApi.data).to.be.an.object();
            expect(jsonApi.data.type).to.equal('BlogPost');
            expect(jsonApi.data.id).to.equal('thepost');
            expect(jsonApi.data.title).to.not.exist();
            expect(jsonApi.data.attributes).to.be.an.object();
            expect(jsonApi.data.attributes.title).to.equal('the post');
            expect(jsonApi.data.attributes).to.only.include([
                'title', 'publishedDate', 'isPublished', 'ratting', 'tags']);
            expect(jsonApi.data.attributes.tags).to.be.an.array();
            expect(jsonApi.data.attributes.tags).to.only.include(['foo', 'bar']);
            expect(jsonApi.data.relationships).to.be.an.object();
            expect(jsonApi.data.relationships).to.only.include(['author', 'credits']);
            expect(jsonApi.data.relationships.author.data).to.be.an.object();
            expect(jsonApi.data.relationships.author.data.id).to.equal('user1');
            expect(jsonApi.data.relationships.author.data.type).to.equal('User');
            expect(jsonApi.data.relationships.credits.data).to.be.an.array();
            expect(jsonApi.data.relationships.credits.data[0].id).to.equal('user1');
            expect(jsonApi.data.relationships.credits.data[0].type).to.equal('User');
            done();
        });

        it('should not include the id if not exists', (done) => {
            let blogPost = db.BlogPost.create({
                title: 'the post'
            });

            let jsonApi = blogPost.toJsonApi();
            expect(jsonApi.data.id).to.not.exist();
            expect(jsonApi.data.type).to.equal('BlogPost');
            expect(jsonApi.data.attributes.title).to.equal('the post');
            expect(jsonApi.data.relationships).to.not.exist();
            done();
        });

        it('should not include attributes if not needed', (done) => {
            let blogPost = db.BlogPost.create({
                author: {_id: 'user1', _type: 'User'}
            });

            let jsonApi = blogPost.toJsonApi();
            expect(jsonApi.data.id).to.not.exist();
            expect(jsonApi.data.type).to.equal('BlogPost');
            expect(jsonApi.data.attributes).to.not.exist();
            done();
        });

        it('should include links whe a base uri is passed', (done) => {
          let blogPost = db.BlogPost.create({
                _id: 'thepost',
                title: 'the post',
                author: {_id: 'user1', _type: 'User'},
                credits: [
                    {_id: 'user1', _type: 'User'},
                    {_id: 'user2', _type: 'User'}
                ]
            });

            let baseUri = 'http://testuri.org/blog-post/thepost';

            let jsonApi = blogPost.toJsonApi(baseUri);
            expect(jsonApi.data.id).to.exist();
            expect(jsonApi.data.type).to.equal('BlogPost');
            expect(jsonApi.data.links).to.be.an.object();
            expect(jsonApi.data.links.self).to.equal(baseUri);
            expect(jsonApi.data.attributes).to.be.an.object();

            let author = jsonApi.data.relationships.author;
            expect(author.data.id).to.equal('user1');
            expect(author.links).to.be.an.object();
            expect(author.links.self).to.equal(`${baseUri}/relationships/author`);
            expect(author.links.related).to.equal(`${baseUri}/author`);

            let credits = jsonApi.data.relationships.credits;
            expect(credits.data[0].id).to.equal('user1');
            expect(credits.links.self).to.equal(`${baseUri}/relationships/credits`);
            expect(credits.links.related).to.equal(`${baseUri}/credits`);

            done();
        });

        it('should fill an array with all relationship references', (done) => {
            let blogPost = db.BlogPost.create({
                _id: 'thepost',
                title: 'the post',
                author: {_id: 'user1', _type: 'User'},
                credits: [
                    {_id: 'user1', _type: 'User'},
                    {_id: 'user3', _type: 'User'}
                ]
            });

            let baseUri = 'http://testuri.org/blog-post/thepost';
            let included = [];

            let jsonApi = blogPost.toJsonApi(baseUri, {properties: true, included: included});
            expect(jsonApi.data.id).to.equal('thepost');
            expect(jsonApi.data.type).to.equal('BlogPost');
            expect(jsonApi.data.links).to.be.an.object();
            expect(jsonApi.data.links.self).to.equal(baseUri);
            expect(jsonApi.data.attributes).to.be.an.object();

            expect(included.length).to.equal(2);
            expect(included).to.deep.equal([
                {id: 'user1', type: 'User'},
                {id: 'user3', type: 'User'}
            ]);
            done();
        });

        it('should fill an array with only specified relations', (done) => {
            let blogPost = db.BlogPost.create({
                _id: 'thepost',
                title: 'the post',
                author: {_id: 'user1', _type: 'User'},
                credits: [
                    {_id: 'user1', _type: 'User'},
                    {_id: 'user3', _type: 'User'}
                ]
            });

            let baseUri = 'http://testuri.org/blog-post/thepost';
            let included = [];

            let jsonApi = blogPost.toJsonApi(baseUri, {properties: 'author', included: included});
            expect(jsonApi.data.id).to.equal('thepost');
            expect(jsonApi.data.type).to.equal('BlogPost');
            expect(jsonApi.data.links).to.be.an.object();
            expect(jsonApi.data.links.self).to.equal(baseUri);
            expect(jsonApi.data.attributes).to.be.an.object();

            expect(included.length).to.equal(1);
            expect(included).to.deep.equal([
                {id: 'user1', type: 'User'}
            ]);
            done();
        });


        it('should fill the relationships array with only uniq values', (done) => {
            let blogPost = db.BlogPost.create({
                _id: 'thepost',
                title: 'the post',
                author: {_id: 'user1', _type: 'User'},
                credits: [
                    {_id: 'user3', _type: 'User'},
                    {_id: 'user1', _type: 'User'}
                ]
            });

            let baseUri = 'http://testuri.org/blog-post/thepost';
            let included = [];
            let jsonApi = blogPost.toJsonApi(baseUri, included);

            expect(included.length).to.equal(2);
            expect(jsonApi.data.id).to.equal('thepost');

            let blogPost2 = db.BlogPost.create({
                _id: 'thepost2',
                title: 'the post 2',
                author: {_id: 'user2', _type: 'User'},
                credits: [
                    {_id: 'user1', _type: 'User'},
                    {_id: 'user3', _type: 'User'}
                ]
            });

            let jsonApi2 = blogPost2.toJsonApi(baseUri, included);
            expect(jsonApi2.data.id).to.equal('thepost2');
            expect(_.sortBy(included, 'id')).to.deep.equal([
                {id: 'user1', type: 'User'},
                {id: 'user2', type: 'User'},
                {id: 'user3', type: 'User'}
            ]);

            done();
        });
    });
});