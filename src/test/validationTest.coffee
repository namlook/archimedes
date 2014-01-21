
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect
should = chai.should()

Model = require('../interface').Model
Database = require('../interface').Database

describe 'Model validation:', ()->

    models = {}

    class models.A extends Model
        schema:
            string:
                type: 'string'
            integer:
                type: 'integer'
            float:
                type: 'float'
            boolean:
                type: 'boolean'
            date:
                type: 'date'
            url:
                type: 'url'

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

    db = new Database

    db.registerModels models

    describe 'literals', () ->
        it 'should validate a string', () ->
            a = new db.A
            expect(-> a.set 'string', 'hello').to.not.throw()
            expect(-> a.set 'string', 1).to.throw(
                /ValidationError: A.string must be a string/)

        it 'should validate an integer', () ->
            a = new db.A
            expect(-> a.set 'integer', 10).to.not.throw()
            # expect(-> a.set 'integer', 1.0).to.throw(
            #     /ValidationError: A.integer must be a integer/)
            expect(-> a.set 'integer', "hello").to.throw(
                /ValidationError: A.integer must be a integer/)

        it 'should validate an float', () ->
            a = new db.A
            expect(-> a.set 'float', 1.0).to.not.throw()
            # expect(-> a.set 'float', 10).to.throw(
            #     /ValidationError: A.float must be a float/)
            expect(-> a.set 'float', "hello").to.throw(
                /ValidationError: A.float must be a float/)

        it 'should validate an boolean', () ->
            a = new db.A
            expect(-> a.set 'boolean', true).to.not.throw()
            expect(-> a.set 'boolean', 10).to.throw(
                /ValidationError: A.boolean must be a boolean/)
            expect(-> a.set 'boolean', "hello").to.throw(
                /ValidationError: A.boolean must be a boolean/)

    describe 'complexe types', () ->
        it 'should validate a date', () ->
            a = new db.A
            date = new Date()
            datestring = Date()
            dateint = Date.now()
            # expect(-> a.set 'date', date).to.not.throw()
            error = /ValidationError: A.date must be a date/
            expect(-> a.set 'date', datestring).to.not.throw()
            expect(-> a.set 'date', dateint).to.throw(error)



    describe '.set()', () ->
        it 'should throw an error if the relation type doesnt match', (done) ->
            blog = new db.Blog {title: 'My blog'}
            blog.save (err) ->
                expect(err).to.be.null
                author = new db.Author {login: 'nico'}
                author.save (err) ->
                    expect(err).to.be.null
                    blogPost = new db.BlogPost {title: {'en', 'hello world'}}
                    expect(-> blogPost.set 'author', blog).to.throw(
                        /BlogPost.author must be a Author/)
                    blogPost.set 'blog', blog
                    expect(-> blogPost.set 'content', blog).to.throw(
                        /BlogPost.title must be a string/)








