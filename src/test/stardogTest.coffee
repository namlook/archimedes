

chai = require 'chai'
expect = chai.expect
StardogDB = require('../rdf').Database
Model = require('../rdf').Model

describe 'StardogDatabase', ()->

    models = {}

    class models.Author extends Model
        schema:
            login:
                type: 'string'
                required: true

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


    db = new StardogDB {
        store: 'stardog'
        credentials: {login: 'admin', password: 'admin'}
        graphURI: 'http://example.org'
    }

    db.registerModels models

    beforeEach (done) ->
        db.clear done

    describe 'sync()', () ->
        it 'should store the model values into the db', (done) ->
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set 'content', 'article'
            db.sync blogPost, (err, id) ->
                expect(err).to.be.null
                db.store.query "select * {?s ?p ?o .}", (err, data) ->
                    expect(err).to.be.null
                    results = (
                        "#{i.s.value}::#{i.p.value}::#{i.o.value}" for i in data)
                    nsprop = 'http://example.org/properties'
                    expect(results).to.include(
                        "#{id}::#{nsprop}/title::hello world",
                        "#{id}::#{nsprop}/keyword::hello",
                        "#{id}::#{nsprop}/keyword::world",
                        "#{id}::#{nsprop}/content::article")
                    done()

    describe 'clear()', () ->
        it 'should empty the database', (done) ->
            db.store.update """insert data {
                <http://example/book1>  <http://example/price>  42 .
                <http://example/book2>  <http://example/price>  20 .
            }""", (err, ok) ->
                expect(err).to.be.null
                expect(ok).to.be.true
                db.store.query "select (count(*) as ?total) where {?s ?p ?o.}",
                  (err, data) ->
                    expect(data[0].total.value).to.be.equal '2'
                    db.clear (err, ok) ->
                        expect(err).to.be.null
                        expect(ok).to.be.ok
                        db.store.query "select (count(*) as ?total) where {?s ?p ?o.}",
                          (err, data) ->
                            expect(data[0].total.value).to.be.equal '0'
                        done();

    describe 'validate()', ()->
        it 'should throw an exception if <fieldName>.type is not specified'
        it 'should throw an exception if <fieldName>.uri is not specified'

    describe '.save()', ()->
        it 'should generate a generic id if no id is set', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            expect(blogPost.id).to.be.undefined
            blogPost.save()
            expect(blogPost.id).to.be.string

        it "shouldn't generate an id if the id is set", () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.id = 'http://blogPost.com'
            blogPost.save()
            expect(blogPost.id).to.be.equal 'http://blogPost.com'

            blogPost2 = new db.BlogPost
            blogPost2.set 'title', 'hello world', 'en'
            blogPost2.set 'keyword', ['foo', 'bar']
            blogPost2.id = 0
            blogPost2.save()
            expect(blogPost2.id).to.be.equal 0
