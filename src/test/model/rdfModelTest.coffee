
chai = require('chai')
expect = chai.expect

config = require('../config')
RdfModel = config.Model
db = config.Database()

if db.dbtype isnt 'rdf'
    console.log db.dbtype
    console.log "Database is not an RDF database (got #{db.dbtype}). Skipping..."
    return

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

    class models.Group extends RdfModel
        schema:
            authors:
                type: 'Author'
                multi: true

    db.registerModels models

    beforeEach (done) ->
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
            goodClass = new GoodClass()
            expect(goodClass.meta.propertiesNamespace).to.be.equal propertiesNS

            uri = 'http://example.org/type/GoodClass2'
            goodClass = new GoodClass2()
            expect(goodClass.meta.uri).to.be.equal uri

            instancesNS = 'http://example.org/data'
            goodClass = new GoodClass3()
            expect(goodClass.meta.instancesNamespace).to.be.equal instancesNS

        it 'should have @meta.graphURI', () ->
            graphURI = 'http://example.org'
            author = new db.Author()
            expect(author.meta.graphURI).to.be.equal graphURI


        it 'should have @meta.uri', () ->
            uri = 'http://onto.example.org/classes/Author'
            author = new db.Author()
            expect(author.meta.uri).to.be.equal uri


        it 'should have @meta.propertiesNamespace', () ->
            propertiesNS = 'http://onto.example.org/properties'
            author = new db.Author()
            expect(author.meta.propertiesNamespace).to.be.equal propertiesNS


        it 'should have @meta.instancesNamespace', () ->
            instancesNS = 'http://data.example.org/author'
            author = new db.Author()
            expect(author.meta.instancesNamespace).to.be.equal instancesNS

        it 'should generate an URI as id when the is is passed to the constructor', () ->
            blog = new db.Blog {_id: 'test', 'title': 'test'}
            expect(blog.get '_id').to.be.equal 'test'
            expect(blog.get '_type').to.be.equal 'Blog'
            expect(blog.get '_uri').to.be.equal 'http://data.example.org/blog/test'
            expect(blog.get '_class').to.be.equal 'http://onto.example.org/classes/Blog'
            expect(blog.id).to.be.equal 'test'
            expect(blog.uri).to.be.equal 'http://data.example.org/blog/test'


    describe '.save()', () ->
        it 'should save a model and fill the id, uri, type and class fields', (done) ->
            blog = new db.Blog
            blog.set 'title', 'hello world'
            blog.save (err, blog2) ->
                expect(err).to.be.null
                expect(blog2.id).to.be.not.undefined
                expect(blog.id).to.be.not.undefined
                expect(blog2.id).to.be.equal blog.id
                expect(blog.uri).to.be.equal "http://data.example.org/blog/#{blog.id}"
                done()

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
                expect(blogPost.id).to.not.be.undefined
                expect(blogPost.uri).to.match(/^http:\/\/data.example.org\//)
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
            blogPost.set '_id', 'HelloWorld'
            expect(blogPost.isNew()).to.be.true
            uri = 'http://data.example.org/blogpost/HelloWorld'
            expect(blogPost.id).to.be.equal 'HelloWorld'
            expect(blogPost.uri).to.be.equal uri
            blogPost.save (err, newBlogPost) ->
                expect(err).to.be.null
                expect(newBlogPost.id).to.be.equal blogPost.id
                expect(blogPost.id).to.be.equal 'HelloWorld'
                expect(newBlogPost.uri).to.be.equal uri
                done()

    describe '.find()', () ->
        it 'should fetch model of the same type if no query is specified', (done) ->
            blog = new db.Blog
            blog.set 'title', 'hello world'
            blog.save (err, blog2) ->
                expect(err).to.be.null
                db.Blog.find (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    newBlog = results[0]
                    expect(blog.type).to.be.not.undefined
                    expect(blog.type).to.be.equal newBlog.type
                    expect(newBlog.id).to.be.equal blog.id
                    expect(newBlog.get 'title').to.be.equal 'hello world'
                    done()

    describe '.find(id)', () ->
        it 'should fetch model instance by its id', (done) ->
            blog = new db.Blog
            blog.set 'title', 'hello world'
            blog.save (err, blog2) ->
                expect(err).to.be.null
                db.Blog.find blog.id, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    newBlog = results[0]
                    expect(blog.type).to.be.not.undefined
                    expect(blog.type).to.be.equal newBlog.type
                    expect(newBlog.id).to.be.equal blog.id
                    expect(newBlog.get 'title').to.be.equal 'hello world'
                    done()


    describe '.find(uri)', () ->
        it 'should fetch a model instance by its uri', (done) ->
            blog = new db.Blog
            blog.set 'title', 'hello world'
            blog.save (err, blog2) ->
                expect(err).to.be.null
                db.Blog.find blog.uri, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    newBlog = results[0]
                    expect(newBlog.id).to.be.equal blog.id
                    expect(newBlog.get 'title').to.be.equal 'hello world'
                    done()

        it 'should fetch a model instance with i18n fields by its uri', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'title', 'salut monde', 'fr'
            blogPost.set 'content', 'first post'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.save (err) ->
                expect(err).to.be.null
                db.BlogPost.find blogPost.uri, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    newBlogPost = results[0]
                    expect(newBlogPost.id).to.not.be.undefined
                    expect(newBlogPost.id).to.be.equal blogPost.id
                    expect(newBlogPost.uri).to.not.be.undefined
                    expect(newBlogPost.uri).to.be.equal blogPost.uri
                    expect(newBlogPost.get('title', 'en')).to.be.equal 'hello world'
                    expect(newBlogPost.get('title', 'fr')).to.be.equal 'salut monde'
                    done()

        it 'should fetch a model instance with muti-i18n fields by its uri', (done) ->
            blog = new db.Blog
            blog.set 'title', 'test'
            blog.set 'i18ntags', ['hello', 'world'], 'en'
            blog.set 'i18ntags', ['salut', 'monde'], 'fr'
            blog.save (err) ->
                expect(err).to.be.null
                db.Blog.find [blog.uri], (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    newBlog = results[0]
                    expect(newBlog.id).to.be.equal blog.id
                    expect(newBlog.get 'title').to.be.equal 'test'
                    expect(newBlog.get 'i18ntags', 'en').to.be.include 'hello', 'world'
                    expect(newBlog.get 'i18ntags', 'fr').to.be.include 'salut', 'monde'
                    done()


    describe '.find(uris)', () ->

        it 'should fetch a model instances by their ids', (done) ->
            blog = new db.Blog
            blog.set 'title', 'hello world'
            blog.save (err) ->
                expect(err).to.be.null
                blog2 = new db.Blog
                blog2.set 'title', 'second blog'
                blog2.save (err) ->
                    db.Blog.find [blog.uri, blog2.uri], (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 2
                        newBlog = results[0]
                        expect(newBlog.uri).to.not.be.undefined
                        expect(newBlog.uri).to.be.equal blog.uri
                        expect(newBlog.get 'title').to.be.equal 'hello world'
                        newBlog2 = results[1]
                        expect(newBlog2.uri).to.not.be.undefined
                        expect(newBlog2.uri).to.be.equal blog2.uri
                        expect(newBlog2.get 'title').to.be.equal 'second blog'
                        done()

    describe '.find(query)', () ->
        it 'should fetch all models instances via a mongo-like query'


    describe 'get()', ()->
        it 'should return the related instance id of a relation field'
        it 'should return the related instances ids of multi relation field'

    describe 'getInstance()', () ->
        it 'should return the related populated instance'
        it 'should return the related populated instances on a multi-field'



    describe 'set()', ()->
        it 'should set the value of a relation field', () ->
            blog = new db.Blog {title: 'the blog'}
            blogPost = new db.BlogPost
            blogPost.set 'blog', blog
            sblog = blogPost.toSerializableObject()['http://onto.example.org/properties/blog']
            expect(sblog._uri).to.be.equal 'http://data.example.org/blog/undefined'
            expect(blogPost.get('blog').get('title')).to.be.equal 'the blog'

        it 'should set the value of a relation field via its id', () ->
            blogPost = new db.BlogPost
            blogPost.set 'blog', 'TheBlog'
            sblog = blogPost.toSerializableObject()['http://onto.example.org/properties/blog']
            expect(sblog._uri).to.be.equal 'http://data.example.org/blog/TheBlog'
            expect(blogPost.serialize().indexOf('<http://data.example.org/blog/TheBlog>')).to.be.gt 0
            expect(blogPost.get('blog')).to.be.equal 'TheBlog'

        it 'should set the values of a relation field'


    describe 'unset()', ()->
        it 'should unset a relation field'
        it 'should unset a multi relation field', () ->
            blogPost = new db.BlogPost
            blogPost.push 'keyword', 'foo'
            blogPost.push 'keyword', 'bar'
            expect(blogPost.get('keyword')).to.include.members ['foo', 'bar']
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



    describe '.getSerializableObject()', () ->
        it 'should convert the uri _id to the regular _id', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            expect(blogPost.id).to.be.undefined
            blogPost.save (err, model, dbtouched) ->
                expect(err).to.be.null
                serializedModel = model.toSerializableObject()
                expect(serializedModel._id).to.be.equal model.id
                expect(serializedModel['http://onto.example.org/properties/_id']).to.be.undefined
                done()

        it 'should serialize an object with multi relations', () ->
            group = new db.Group
            group.push 'authors', 'bob'
            group.push 'authors', 'timy'
            group.push 'authors', 'jimy'
            raw = group.serialize()
            expect(raw.indexOf('<http://data.example.org/author/bob>')).to.be.gt -1
            expect(raw.indexOf('<http://data.example.org/author/timy>')).to.be.gt -1
            expect(raw.indexOf('<http://data.example.org/author/jimy>')).to.be.gt -1


    describe 'relationship', () ->
        it 'should store relations uri into the db', (done) ->
            blog = new db.Blog {title: 'My blog'}
            author = new db.Author {login: 'nico'}
            blogPost = new db.BlogPost
            blogPost.set 'title', {en: 'hello world', fr: 'salut monde'}
            blogPost.set 'content', 'first post'
            blogPost.set 'author', author
            blogPost.set 'blog', blog
            blogPost.save (err, model, dbtouched) ->
                expect(err).to.be.null
                db.first model.uri, (err, rawBloPost) ->
                    expect(err).to.be.null
                    expect(rawBloPost['http://onto.example.org/properties/blog']).to.have.property '_uri'
                    expect(rawBloPost['http://onto.example.org/properties/author']).to.have.property '_uri'
                    expect(rawBloPost['http://onto.example.org/properties/title']).to.not.have.property '_uri'
                    done()

    describe '.getJSONObject()', () ->
        it 'should return a jsonable object with related instance ids'
        it 'should not be modified if the model has relation and changes'
        it 'should return a jsonable object with multi relations', (done) ->
            group = new db.Group
            group.push 'authors', new db.Author {login: 'bob'}
            group.push 'authors', new db.Author {login: 'timy'}
            group.push 'authors', new db.Author {login: 'jimy'}
            group.save (err, model) ->
                expect(err).to.be.null
                jsonobject = model.toJSONObject()
                expect(jsonobject._id).to.be.equal model.id
                expect(jsonobject.authors.length).to.be.equal 3
                done()


    describe '.getJSON()', () ->
        it 'should return a json string of the model', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            jsonObject = {
                "_type": blogPost.get('_type')
                "_class": blogPost.get('_class')
                "title":{"en":"hello world"}
                "keyword":["foo","bar"]
            }
            expect(blogPost.toJSON()).to.be.equal JSON.stringify jsonObject

        it 'should include the id', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.save (err) ->
                expect(err).to.be.null
                jsonBlogPost = JSON.parse blogPost.toJSON()
                expect(jsonBlogPost._id).to.not.be.undefined
                expect(jsonBlogPost._uri).to.not.be.undefined
                expect(jsonBlogPost.id).to.be.undefined
                done()

        it 'should return a json string of the model with related instance ids'
