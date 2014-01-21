
chai = require('chai')
expect = chai.expect
sinon = require 'sinon'
should = chai.should()

RdfModel = require('../rdf').Model
RdfDatabase = require('../rdf').Database

describe 'RdfModel', ()->

    models = {}

    class models.Author extends RdfModel
        schema:
            login:
                type: 'string'
                required: true

    class models.Blog extends RdfModel
        schema:
            title:
                type: 'string'
            i18ntags:
                type: 'string'
                multi: true
                i18n: true
                label: 'tags'


    class models.BlogPost extends RdfModel
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

    db = new RdfDatabase {
        store: 'stardog'
        namespace: 'http://onto.example.org'
        defaultInstancesNamespace: 'http://data.example.org'
        graphURI: 'http://example.org'
        credentials: {login: 'admin', password: 'admin'}
    }

    db.registerModels models

    afterEach (done) ->
        db.clear done

    describe 'constructor()', () ->
        it 'should take customs namespace', ()->

            class GoodClass extends RdfModel
                meta:
                    propertiesNamespace: 'http://props.example.org/properties'
                schema: {}

            class GoodClass2 extends RdfModel
                meta:
                    uri: 'http://example.org/type/GoodClass2'
                schema: {}

            class GoodClass3 extends GoodClass
                meta:
                    instancesNamespace: 'http://example.org/data'
                schema: {}

            db.registerClasses {
                GoodClass: GoodClass,
                GoodClass2: GoodClass2,
                GoodClass3: GoodClass3
            }

            propertiesNS = 'http://props.example.org/properties'
            new GoodClass().meta.propertiesNamespace.should.equal propertiesNS

            uri = 'http://example.org/type/GoodClass2'
            new GoodClass2().meta.uri.should.equal uri

            instancesNS = 'http://example.org/data'
            new GoodClass3().meta.instancesNamespace.should.equal instancesNS

        it 'should have @meta.graphURI', () ->
            graphURI = 'http://example.org'
            new db.Author().meta.graphURI.should.equal graphURI


        it 'should have @meta.uri', () ->
            uri = 'http://onto.example.org/classes/Author'
            new db.Author().meta.uri.should.equal uri


        it 'should have @meta.propertiesNamespace', () ->
            propertiesNS = 'http://onto.example.org/properties'
            new db.Author().meta.propertiesNamespace.should.equal propertiesNS


        it 'should have @meta.instancesNamespace', () ->
            instancesNS = 'http://data.example.org/author'
            new db.Author().meta.instancesNamespace.should.equal instancesNS

        it 'should generate an URI as id when the is is passed to the constructor', () ->
            blog = new db.Blog {_id: 'test', 'title': 'test'}
            expect(blog.get '_id').to.be.equal 'http://data.example.org/blog/test'
            expect(blog.id).to.be.equal 'http://data.example.org/blog/test'


    describe '.find()', () ->
        it 'should fetch a model instance by its id', (done) ->
            blog = new db.Blog
            blog.set 'title', 'hello world'
            blog.save (err) ->
                expect(err).to.be.null
                db.Blog.find [blog.id], (err, results) ->
                    expect(results.length).to.be.equal 1
                    newBlog = results[0]
                    expect(newBlog.id).to.be.equal blog.id
                    expect(newBlog.get 'title').to.be.equal 'hello world'
                    done()

        it 'should fetch a model instances by their ids', (done) ->
            blog = new db.Blog
            blog.set 'title', 'hello world'
            blog.save (err) ->
                expect(err).to.be.null
                blog2 = new db.Blog
                blog2.set 'title', 'second blog'
                blog2.save (err) ->
                    db.Blog.find [blog.id, blog2.id], (err, results) ->
                        expect(results.length).to.be.equal 2
                        newBlog = results[0]
                        expect(newBlog.id).to.be.equal blog.id
                        expect(newBlog.get 'title').to.be.equal 'hello world'
                        newBlog2 = results[1]
                        expect(newBlog2.id).to.be.equal blog2.id
                        expect(newBlog2.get 'title').to.be.equal 'second blog'
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
            blogPost.get('keyword').should.include 'foo', 'bar'
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
                expect(blogPost.id).to.match(/^http:\/\/data.example.org\/blogpost/)
                blogPost.db.length (err, total) ->
                    expect(err).to.be.null
                    expect(total).to.be.equal 6
                    done()

        it 'should generate an id from a specified field if no id is set', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'title', 'salut monde', 'fr'
            blogPost.set 'content', 'first post'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set '_id', 'HelloWorld'
            expect(blogPost.isNew()).to.be.true
            id = 'http://data.example.org/blogpost/HelloWorld'
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
                db.store.query "select * {?s ?p ?o .}", (err, data) ->
                    expect(err).to.be.null
                    expect(model.id).to.be.equal blogPost.id
                    results = (
                        "#{i.s.value}::#{i.p.value}::#{i.o.value}" for i in data)
                    nsprop = 'http://onto.example.org/properties'
                    typeprop = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
                    typeuri = 'http://onto.example.org/classes/BlogPost'
                    expect(results).to.include(
                        "#{blogPost.id}::#{typeprop}::#{typeuri}"
                        "#{blogPost.id}::#{nsprop}/title::hello world",
                        "#{blogPost.id}::#{nsprop}/keyword::hello",
                        "#{blogPost.id}::#{nsprop}/keyword::world",
                        "#{blogPost.id}::#{nsprop}/content::article")
                    db.length (err, total) ->
                        expect(total).to.be.equal 5
                        done()

        it 'should fire a store request only once if there is changes', (done) ->
            store = db.store
            spy = sinon.spy(store, 'update')
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set 'content', 'article'
            blogPost.save (err) ->
                expect(spy.calledOnce).to.be.true
                spy.restore()
                done()

        it "shouldn't fire a store request if there is no value changes", (done) ->
            store = db.store
            spy = sinon.spy(store, 'update')
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set 'content', 'article'
            blogPost.save (err) ->
                blogPost.set 'title', 'salut monde', 'fr'
                blogPost.rollback()
                expect(blogPost.hasChanged()).to.be.false
                blogPost.save (err) ->
                    expect(spy.calledOnce).to.be.true
                    spy.restore()
                    done()

    describe '.delete()', ()->
        it 'should remove a saved instance from the database', (done) ->
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set 'content', 'article'
            blogPost.save (err) ->
                expect(err).to.be.null
                blogPost.db.length (err, total) ->
                    expect(err).to.be.null
                    expect(total).to.be.equal 5
                    blogPost.delete (err) ->
                        expect(err).to.be.null
                        blogPost.db.length (err, total) ->
                            expect(total).to.be.equal 0
                            done()

        it 'should throw an error if we try to delete a non-saved model', (done) ->
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
