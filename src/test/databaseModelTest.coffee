
chai = require('chai')
expect = chai.expect
Model = require('../interface').Model
Database = require('./config').Database

describe.skip 'Database', ()->

    models = {}

    class models.Author extends Model
        schema:
            login:
                type: 'string'
                required: true
            age:
                type: 'integer'

    class models.Blog extends Model
        schema:
            title:
                type: 'string'
            i18ntags:
                type: 'string'
                multi: true
                i18n: true
                label: 'tags'


    class models.BlogPost extends Model
        schema:
            title:
                i18n: true
                type: 'string'
                label:
                    'en': 'title'
                    'fr': 'titre'
            blog:
                type: 'Blog'
            author:
                type: 'Author'
            content:
                type: 'string'
            keyword:
                type: 'string'
                multi: true

    db = Database()

    db.registerModels models

    afterEach (done) ->
        db.clear (err, num) ->
            done()

    describe '.find(id)', () ->
        it 'should fetch a model instance by its id', (done) ->
            blog = new db.Blog
            blog.set 'title', 'hello world'
            blog.save (err) ->
                expect(err).to.be.null
                db.Blog.find blog.id, (err, results) ->
                    expect(results.length).to.be.equal 1
                    newBlog = results[0]
                    expect(newBlog.id).to.be.equal blog.id
                    expect(newBlog.get 'title').to.be.equal 'hello world'
                    done()

        it 'should fetch a model instance with i18n fields by its id', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'title', 'salut monde', 'fr'
            blogPost.set 'content', 'first post'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.save (err) ->
                expect(err).to.be.null
                db.BlogPost.find blogPost.id, (err, results) ->
                    expect(results.length).to.be.equal 1
                    newBlogPost = results[0]
                    expect(newBlogPost.id).to.be.equal blogPost.id
                    expect(newBlogPost.get('title', 'en')).to.be.equal 'hello world'
                    expect(newBlogPost.get('title', 'fr')).to.be.equal 'salut monde'
                    done()

        it 'should fetch a model instance with i18n fields by its id', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'title', 'salut monde', 'fr'
            blogPost.set 'content', 'first post'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.save (err) ->
                expect(err).to.be.null
                db.BlogPost.find [blogPost.id], (err, results) ->
                    expect(results.length).to.be.equal 1
                    newBlogPost = results[0]
                    expect(newBlogPost.id).to.be.equal blogPost.id
                    expect(newBlogPost.get('title', 'en')).to.be.equal 'hello world'
                    expect(newBlogPost.get('title', 'fr')).to.be.equal 'salut monde'
                    done()

        it 'should fetch a model instance with muti-i18n fields by its id', (done) ->
            blog = new db.Blog
            blog.set 'title', 'test'
            blog.set 'i18ntags', ['hello', 'world'], 'en'
            blog.set 'i18ntags', ['salut', 'monde'], 'fr'
            blog.save (err) ->
                expect(err).to.be.null
                db.Blog.find [blog.id], (err, results) ->
                    expect(results.length).to.be.equal 1
                    newBlog = results[0]
                    expect(newBlog.id).to.be.equal blog.id
                    expect(newBlog.get 'title').to.be.equal 'test'
                    expect(newBlog.get 'i18ntags', 'en').to.be.include 'hello', 'world'
                    expect(newBlog.get 'i18ntags', 'fr').to.be.include 'salut', 'monde'
                    done()


        it 'should fetch a model with its relation as ID', (done) ->
            blog = new db.Blog {title: 'hello world'}
            timy = new db.Author {login: 'timy', age: 18}

            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'author', timy
            blogPost.set 'blog', blog

            blogPost.save (err) ->
                expect(err).to.be.null
                db.BlogPost.first blogPost.id, (err, newBlogPost) ->
                    expect(err).to.be.null
                    expect(newBlogPost.get('author')).to.be.string
                    done()

        it 'should fetch and populate a model', (done) ->
            blog = new db.Blog {title: 'hello world'}
            timy = new db.Author {login: 'timy', age: 18}

            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'author', timy
            blogPost.set 'blog', blog

            blogPost.save (err) ->
                expect(err).to.be.null
                db.BlogPost.first blogPost.id, {populate: true}, (err, newBlogPost) ->
                    expect(err).to.be.null
                    expect(newBlogPost.get('author').get('login')).to.be.equal 'timy'
                    done()


    describe '.find(ids)', () ->

        it 'should fetch a model instances by their ids', (done) ->
            blog = new db.Blog
            blog.set 'title', 'hello world'
            blog.save (err) ->
                expect(err).to.be.null
                blog2 = new db.Blog
                blog2.set 'title', 'second blog'
                blog2.save (err) ->
                    expect(err).to.be.null
                    db.Blog.find [blog.id, blog2.id], (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 2
                        ids = (doc.id for doc in results)
                        expect(ids).to.include blog.id
                        expect(ids).to.include blog2.id
                        titles = (doc.get('title') for doc in results)
                        expect(titles).to.include 'hello world'
                        expect(titles).to.include 'second blog'
                        done()

    describe '.find(query)', () ->
        it 'should fetch all models instances via a mongo-like query', (done) ->
            pojos = [
                {login: 'bob', age: 20}
                {login: 'timy', age: 16}
                {login: 'timette', age: 22}
                {login: 'bobette', age: 40}
            ]
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                db.Author.find {age: {$gt: 16}}, (err, results) ->
                    expect(err).to.be.null
                    expect(r.id for r in results).to.not.include undefined
                    expect(results.length).to.be.equal 3
                    expect(r.get('age') for r in results).to.include 20, 22, 40
                    done()


    describe 'get()', ()->
        it 'should return the related instance id of a relation field'
        it 'should return the related instances ids of multi relation field'

    describe 'getInstance()', () ->
        it 'should return the related populated instance'
        it 'should return the related populated instances on a multi-field'

    describe 'set()', ()->
        it 'should set the value of a relation field'
        it 'should set the values of a relation field'


    describe 'unset()', ()->
        it 'should unset a relation field'
        it 'should unset a multi relation field', () ->
            blogPost = new db.BlogPost
            blogPost.push 'keyword', 'foo'
            blogPost.push 'keyword', 'bar'
            expect(blogPost.get('keyword')).to.include 'foo', 'bar'
            blogPost.unset 'keyword'
            expect(blogPost.get 'keyword' ).to.be.undefined


    describe '.push()', ()->
        it 'should add an instance to a multi relation field'


    describe '.pull()', ()->
        it 'should remove an instance of an i18n-multi relation field'


    describe '.has()', ()->
        it 'should return true if the instance of a relation field exists'

        it 'should return true if the instances of a multi-relation field exists'

    describe '.clear()', ()->
        it 'should remove all the values of an instance but not its id'

    describe '.clone()', ()->
        it 'should copy all the values of an instance but not its id'

    describe '.isNew()', ()->
        it 'should return true when the model has relations and  is not saved'
        it 'should return false when the model has relation and is already saved (ie: has an ID)'


    describe: '.populate()': ()->
        it 'should populate all fields which values are URIs'
        it 'should populate a specified field'
        it 'should populate all specified field passed as an array'
        it 'should return an error if a field was not able to be populated'

    describe: '.isPopulated()': ()->
        it 'should return true if the field is already populated'

    describe: '.validate()': ()->
        it 'should throw an error if a field marked as required is missing'

    describe '.save()', ()->
        it 'should generate a generic id if no id is set', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'title', 'salut monde', 'fr'
            blogPost.set 'content', 'first post'
            blogPost.set 'keyword', ['hello', 'world']
            expect(blogPost.isNew()).to.be.true
            expect(blogPost.id).to.be.undefined
            blogPost.save (err, newBlogPost) ->
                expect(err).to.be.null
                expect(blogPost.isNew()).to.be.false
                expect(newBlogPost.isNew()).to.be.false
                expect(newBlogPost.get '_id').to.be.equal blogPost.id
                expect(newBlogPost.id).to.be.equal blogPost.id
                expect(blogPost.id).to.be.string
                blogPost.db.count (err, total) ->
                    expect(err).to.be.null
                    expect(total).to.be.equal 1
                    done()

        it 'should generate an id from a specified field if no id is set', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'title', 'salut monde', 'fr'
            blogPost.set 'content', 'first post'
            blogPost.set 'keyword', ['hello', 'world']
            id =  'HelloWorld'
            blogPost.set '_id', id
            expect(blogPost.isNew()).to.be.true
            expect(blogPost.id).to.be.equal id
            blogPost.save (err, newBlogPost) ->
                expect(err).to.be.null
                expect(blogPost.id).to.be.equal id
                expect(newBlogPost.id).to.be.equal id
                done()

        it 'should store the values of an instance into the database', (done) ->
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set 'content', 'article'
            blogPost.save (err, model, synced) ->
                expect(err).to.be.null
                db.store.find {}, (err, data) ->
                    expect(err).to.be.null
                    expect(data[0].title.en).to.equal 'hello world'
                    expect(data[0].keyword).to.include 'hello', 'world'
                    expect(data[0].content).to.equal 'article'
                    db.count (err, total) ->
                        expect(err).to.be.null
                        expect(total).to.be.equal 1
                        done()

        it 'should fire a store request only once if there is changes', (done) ->
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set 'content', 'article'
            blogPost.save (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                done()

        it "shouldn't fire a store request if there is no value changes", (done) ->
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set 'content', 'article'
            blogPost.save (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                blogPost.set 'title', 'salut monde', 'fr'
                blogPost.rollback()
                expect(blogPost.hasChanged()).to.be.false
                blogPost.save (err, obj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.false
                    done()

        it 'should sync the changed saved model', (done) ->
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set 'content', 'article'
            blogPost.save (err) ->
                expect(err).to.be.null
                blogPost.set 'content', 'article and more'
                blogPost.save (err) ->
                    expect(err).to.be.null
                    db.BlogPost.find blogPost.id, (err, blogposts) ->
                        expect(err).to.be.null
                        expect(blogposts.length).to.be.equal 1
                        expect(blogposts[0].get 'content').to.be.equal 'article and more'
                        done()

    describe '.delete()', ()->
        it 'should remove a saved instance from the database', (done) ->
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set 'content', 'article'
            blogPost.save (err) ->
                expect(err).to.be.null
                blogPost.db.count (err, total) ->
                    expect(err).to.be.null
                    expect(total).to.be.equal 1
                    blogPost.delete (err) ->
                        expect(err).to.be.null
                        blogPost.db.count (err, total) ->
                            expect(err).to.be.null
                            expect(total).to.be.equal 0
                            done()

        it 'should return an error if we try to delete a non-saved model', (done) ->
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set 'content', 'article'
            blogPost.delete (err) ->
                expect(err).to.be.equal "can't delete a non-saved model"
                done()


    describe '.getJSONObject()', () ->
        it 'should return a jsonable object with related instance ids'
        it 'should not be modified if the model has relation and changes'

    describe '.getJSON()', () ->
        it 'should return a json string of the model with related instance ids'
