
_ = require 'underscore'
_.str = require 'underscore.string'

chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect
should = chai.should()

config = require('../config')
Model = config.Model
Database = config.Database

describe 'Model', ()->

    models = {}

    class models.BlogIndex extends Model
        schema:
            multiI18nBlogs:
                type: 'Blog'
                # i18n: true
                multi: true
            i18nAuthor:
                type: 'Author'
                # i18n: true
            multiBlogs:
                type: 'Blog'
                multi: true

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

    db = config.Database()

    db.registerModels models

    beforeEach (done) ->
        db.clear done

    afterEach (done) ->
        db.clear done

    describe '.constructor()', () ->

        it 'should be created without values', () ->
            author = new db.Author
            blog = new db.Blog
            blogPost = new db.BlogPost

        # it 'should have @meta.defaultLang if specified in database', () ->
        #     author = new db.Author()
        #     author.meta.defaultLang.should.equal 'en'

        it 'should have @meta.name set to the model name', () ->
            author = new db.Author()
            expect(author.meta.name).to.be.equal 'Author'

        it 'should have the database attached to model.db', () ->
            author = new db.Author()
            expect(author.db).to.be.equal db

        it 'should add properties to new instance of model', ()->
            author = new db.Author {login: 'namlook'}
            author.get('login').should.equal 'namlook'

        it 'should not have id', () ->
            author = new db.Author
            expect(author.id).to.be.undefined
            expect(author.get '_id').to.be.undefined

        it 'should accept null values', () ->
            blogPost = new db.BlogPost {content: null, blog: null}
            expect(blogPost.toJSONObject().content).to.be.undefined

    describe 'meta', () ->
        it 'should have the model name', () ->
            author = new db.Author
            expect(author.meta.name).to.be.equal 'Author'

    describe '.get()', ()->
        it 'should return the value of a field'
        it 'sould return the values of a multi-field'
        it 'should return the value of a i18n field'
        it 'should return the values of a i18n multi-field'
        it 'should return the related instance id of a relation field'
        it 'should return the related instances ids of multi relation field'


    describe '.getInstance()', () ->
        it 'should return the related populated instance'
        it 'should return the related populated instances on a multi-field'


    describe '.set()', ()->
        it 'should set the value of a field', ()->
            author = new db.Author
            author.set 'login', 'namlook'
            author.get('login').should.equal 'namlook'


        it 'should set the values of a multi field', ()->
            blogPost = new db.BlogPost
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.get('keyword').should.include 'foo', 'bar'


        it 'should set the value of an i18n field (options is object)', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', {lang: 'en'}
            blogPost.set 'title', 'bonjour monde', {lang: 'fr'}
            blogPost.get('title', {lang: 'en'}).should.equal 'hello world'
            blogPost.get('title', {lang: 'fr'}).should.equal 'bonjour monde'


        it 'should set the values of an i18n field by passing an object', ()->
            blog = new db.Blog
            blog.set 'i18ntags', {'en': ['foo'], 'fr': ['toto']}
            expect(blog.get 'i18ntags', 'en').to.include 'foo'
            expect(blog.get 'i18ntags', 'fr').to.include 'toto'


        it 'should throw an eror if the value is an object and the field non-i18n', () ->
            blog = new db.Blog
            expect(-> blog.set('title', {'en': 'foo', 'fr':' toto'})).to.throw(
                "Blog.title must be a string")
            blogPost = new db.BlogPost {'title': {'en': 'foo', 'fr': 'toto'}}
            expect(blogPost.get 'title', 'en').to.be.equal 'foo'
            expect(blogPost.get 'title', 'fr').to.be.equal 'toto'


        it 'should set the value of an i18n field (options is string)', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'title', 'bonjour monde', 'fr'
            blogPost.get('title', 'en').should.equal 'hello world'
            blogPost.get('title', 'fr').should.equal 'bonjour monde'

        it 'should set the values of an i18n multi-field', ()->
            blog = new db.Blog
            blog.set 'i18ntags', ['foo', 'bar', 'baz'], {lang: 'en'}
            blog.set 'i18ntags', ['toto', 'tata'], {lang: 'fr'}
            blog.get('i18ntags', {lang: 'en'}).should.include 'foo', 'bar', 'baz'
            blog.get('i18ntags', {lang: 'fr'}).should.include 'toto', 'tata'


        it 'should set the value of a relation field', () ->
            blog = new db.Blog {title: 'the blog'}
            blogPost = new db.BlogPost
            blogPost.set 'blog', blog
            expect(blogPost.get('blog').get('title')).to.be.equal 'the blog'


        it 'should set the value of a relation field via its id', () ->
            blogPost = new db.BlogPost
            blogPost.set 'blog', 'TheBlog'
            expect(blogPost.get('blog')).to.be.equal 'TheBlog'


        it 'should set the values of a relation field'


        it 'should throw an error if the value is an array and the field non-multi', () ->
            blogPost = new db.BlogPost
            expect(-> blogPost.set('title', ['foo', 'bar'])).to.throw(
                /BlogPost.title is i18n and need a language/)
            expect(-> blogPost.set('title', ['foo', 'bar'], 'en')).to.throw(
                /BlogPost.title doesn't accept array/)

        it "should throw an error when the field which don't exists", () ->
            blogPost = new db.BlogPost
            expect(-> blogPost.set 'dont-exists-field', 'foo').to.throw(
                /'BlogPost.dont-exists-field' not found/)

        it 'should accept null values', () ->
            blogPost = new db.BlogPost
            blogPost.set 'content', null
            blogPost.set 'keyword', null
            blogPost.set 'title', null
            blogPost.set 'blog', null


    describe '.unset()', ()->
        it 'should unset a value', ()->
            author = new db.Author
            author.set 'login', 'namlook'
            author.unset 'login'
            should.not.exist author.get 'login'

        it 'should process silently if no value are set', () ->
            blogPost = new db.BlogPost
            expect(-> blogPost.unset 'login').to.throw(
                /BlogPost.login' not found/)
            blogPost.unset 'title', 'fr'
            blogPost.unset 'keyword'


        it 'should unset a multi field value', ()->
            blogPost = new db.BlogPost
            blogPost.set 'keyword', ['foo', 'bar', 'baz']
            blogPost.unset 'keyword'
            should.not.exist blogPost.get 'keyword'


        it 'should unset an i18n value (options is object)', ()->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', {lang: 'en'}
            blogPost.set 'title', 'bonjour monde', {lang: 'fr'}
            blogPost.unset 'title', {lang: 'en'}
            should.not.exist blogPost.get('title', {lang: 'en'})
            blogPost.get('title', {lang: 'fr'}).should.equal 'bonjour monde'
            blogPost.unset 'title', {lang: 'fr'}
            should.not.exist blogPost.get('title', {lang: 'fr'})

        it 'should unset an i18n value (options is string)', ()->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'title', 'bonjour monde', 'fr'
            blogPost.unset 'title', 'en'
            should.not.exist blogPost.get('title', 'en')
            blogPost.get('title', 'fr').should.equal 'bonjour monde'
            blogPost.unset 'title', 'fr'
            should.not.exist blogPost.get('title', 'fr')

        it 'should unset an i18n multi field value', ()->
            blog = new db.Blog
            blog.set 'i18ntags', ['foo', 'bar', 'baz'], {lang: 'en'}
            blog.set 'i18ntags', ['toto', 'tata'], {lang: 'fr'}
            blog.unset('i18ntags', {lang: 'en'})
            should.not.exist blog.get 'i18ntags', {lang: 'en'}
            blog.get('i18ntags', {lang: 'fr'}).should.include 'toto', 'tata'
            blog.unset('i18ntags', {lang: 'fr'})
            should.not.exist blog.get 'i18ntags', {lang: 'fr'}

        it 'should unset a relation field'
        it 'should unset a multi relation field', () ->
            blogPost = new db.BlogPost
            blogPost.push 'keyword', 'foo'
            blogPost.push 'keyword', 'bar'
            blogPost.get('keyword').should.include 'foo', 'bar'
            blogPost.unset 'keyword'
            expect(blogPost.get 'keyword' ).to.be.undefined


    describe '.push()', ()->
        it 'should add a value to a multi field', ()->
            blogPost = new db.BlogPost
            blogPost.push 'keyword', 'baz'
            blogPost.get('keyword').should.include 'baz'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.push 'keyword', 'baz'
            blogPost.get('keyword').should.include 'foo', 'bar', 'baz'

        it 'should add a value to a i18n-multi field', ()->
            blog = new db.Blog
            blog.push 'i18ntags', 'foo', {lang: 'en'}
            blog.get('i18ntags', {lang: 'en'}).should.include 'foo'
            should.not.exist blog.get 'i18ntags', {lang: 'fr'}
            blog.push 'i18ntags', 'toto', {lang: 'fr'}
            blog.get('i18ntags', {lang: 'fr'}).should.include 'toto'
            blog.get('i18ntags', {lang: 'fr'}).should.not.include 'foo'
            blog.push 'i18ntags', 'baz', {lang: 'en'}
            blog.get('i18ntags', {lang: 'en'}).should.include 'foo', 'baz'
            blog.push 'i18ntags', 'tata', {lang: 'fr'}
            blog.get('i18ntags', {lang: 'fr'}).should.include 'toto', 'tata'

        it 'should throw an error if used on a non-multi field', () ->
            blogPost = new db.BlogPost
            expect(-> blogPost.push 'title', 'arf').to.throw(
                'BlogPost.title is i18n and need a language')


    describe '.pull()', ()->
        it 'should not throw an error if the field is null', ()->
            blogPost = new db.BlogPost
            blogPost.pull 'keyword', 'arf'

        it 'should remove a value of an i18n-multi field', ()->
            blog = new db.Blog
            blog.set 'i18ntags', ['foo', 'bar', 'baz'], {lang: 'en'}
            blog.set 'i18ntags', ['toto', 'tata'], {lang: 'fr'}
            blog.pull 'i18ntags', 'foo', {lang: 'en'}
            blog.get('i18ntags', {lang: 'en'}).should.not.include 'foo'
            blog.pull 'i18ntags', 'baz', {lang: 'en'}
            blog.get('i18ntags', {lang: 'en'}).should.not.include 'baz'
            blog.get('i18ntags', {lang: 'fr'}).should.include 'toto', 'tata'
            blog.pull 'i18ntags', 'toto', {lang: 'fr'}
            blog.get('i18ntags', {lang: 'fr'}).should.not.include 'toto'
            blog.get('i18ntags', {lang: 'fr'}).should.include 'tata'


        it 'should throw an error if used on a non-multi field', () ->
            blogPost = new db.BlogPost
            expect(-> blogPost.pull 'title', 'arf').to.throw(
                'BlogPost.title is i18n and need a language')
            expect(-> blogPost.pull 'title', 'arf', 'en').to.throw(
                'BlogPost.title is not a multi field')


        it 'should remove a value from a multi field', ()->
            blogPost = new db.BlogPost
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.pull 'keyword', 'bar'
            blogPost.get('keyword').should.not.include 'bar'
            blogPost.get('keyword').should.include 'foo'
            blogPost.push 'keyword', 'baz'
            blogPost.get('keyword').should.include 'foo', 'baz'
            blogPost.pull 'keyword', 'foo'
            blogPost.get('keyword').should.not.include 'foo'
            blogPost.get('keyword').should.include 'baz'


    describe '.has()', ()->
        it 'should return true if the value of a field exists', ()->
            blogPost = new db.BlogPost
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.set 'title', 'hello world', 'en'
            blogPost.has('keyword').should.be.true
            blogPost.has('author').should.be.false

        it 'should return true if the value of a i18n field exists', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'title', 'bonjour monde', {lang: 'fr'}

            blogPost.has('title', {lang: 'en'}).should.be.true
            blogPost.has('title', {lang: 'fr'}).should.be.true
            blogPost.has('title', {lang: 'es'}).should.be.false

            blogPost.has('title', 'en').should.be.true
            blogPost.has('title', 'fr').should.be.true
            blogPost.has('title', 'es').should.be.false

        it 'should throw an error if no language is specified for an i18n field', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'title', 'bonjour monde', {lang: 'fr'}
            expect(-> blogPost.has 'title').to.throw(/BlogPost.title is i18n and need a language/)

    describe '.clear()', ()->
        it 'should remove all the values of and instance but not its id', ()->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.has('title', 'en').should.be.true
            blogPost.has('keyword').should.be.true
            blogPost.clear()
            blogPost.has('title', 'en').should.be.false
            blogPost.has('keyword').should.be.false

    describe '.rollback', () ->
        it 'should return the model into its previous state (empty)', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.rollback()
            expect(blogPost.get('title', 'fr')).to.be.undefined
            expect(blogPost.get('title', 'en')).to.be.undefined
            expect(blogPost.get('keyword')).to.be.undefined

        it 'should return the model into its previous state (specified)', () ->
            blogPost = new db.BlogPost {
                title: {en: 'hello world'}
                keyword: ['foo', 'bar']
            }
            blogPost.set 'title', 'hi world', 'en'
            blogPost.set 'title', 'salut monde', 'fr'
            blogPost.pull 'keyword', 'foo'
            blogPost.rollback()
            expect(blogPost.get('title', 'fr')).to.be.undefined
            expect(blogPost.get('title', 'en')).to.be.equal 'hello world'
            expect(blogPost.get('keyword')).to.include.members ['foo', 'bar']


        it 'should return the model into its previous state (saved)', (done) ->
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.save (err, obj) ->
                expect(err).to.be.null
                blogPost.set 'title', 'hi world', 'en'
                blogPost.set 'title', 'salut monde', 'fr'
                blogPost.pull 'keyword', 'foo'
                blogPost.rollback()
                expect(blogPost.get('title', 'fr')).to.be.undefined
                expect(blogPost.get('title', 'en')).to.be.equal 'hello world'
                expect(blogPost.get('keyword')).to.include.members ['foo', 'bar']
                done()

    describe '.clone()', ()->
        it 'should copy all the values of an instance but not its id', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            expect(blogPost.id).to.be.undefined
            blogPost.save (err, model) ->
                expect(err).to.be.null
                expect(blogPost.id).to.not.be.undefined
                newBlogPost = blogPost.clone()
                newBlogPost.get('title', 'en').should.equal 'hello world'
                newBlogPost.get('keyword').should.include 'foo', 'bar'
                expect(newBlogPost.id).to.be.undefined


    describe '.isNew()', ()->
        it 'should return true when the model is not saved', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.isNew().should.be.true

        it 'should return false when the model is already saved (ie: has an ID)', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.save (err) ->
                expect(err).to.be.null
                blogPost.isNew().should.be.false
                done()

        it 'should return false if the model is saved and has 0 as id', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.id = 0
            blogPost.save (err) ->
                expect(err).to.be.null
                blogPost.isNew().should.be.false
                done()

        it 'should return true on a cloned model', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.save (err) ->
                expect(err).to.be.null
                blogPost.isNew().should.be.false
                newBlogPost = blogPost.clone()
                newBlogPost.isNew().should.be.true
                done()


    describe '.populate()', ()->
        it 'should populate all fields which values are URIs'
        it 'should populate a specified field'
        it 'should populate all specified field passed as an array'
        it 'should return an error if a field was not able to be populated'

    describe '.isPopulated()', ()->
        it 'should return true if the field is already populated'

    describe '.validate()', ()->
        it 'should throw an error if a field marked as required is missing'

    describe '.changes()', () ->
        it "should return null if the model hasn't changed", () ->
            blogPost = new db.BlogPost
            expect(blogPost.changes()).to.be.null

        it 'should return null if the model was bringed back to it original state', () ->
            blogPost = new db.BlogPost {'content': 'hello'}
            blogPost.set 'content', 'hi'
            blogPost.set 'content', 'hello'
            expect(blogPost.changes()).to.be.null

        it 'should return the added properties', () ->
            blogPost = new db.BlogPost
            blogPost.set 'content', 'hello'
            expect(blogPost.changes().added.content).to.be.equal 'hello'

        it 'should return the removed properties', () ->
            blogPost = new db.BlogPost {'content': 'hello'}
            blogPost.unset 'content'
            changes = blogPost.changes()
            expect(changes.added.content).to.be.undefined
            expect(changes.removed.content).to.be.equal 'hello'

        it 'should return the modified properties', () ->
            blogPost = new db.BlogPost {'content': 'hello'}
            blogPost.set 'content', 'hi'
            changes = blogPost.changes()
            expect(changes.removed.content).to.be.equal 'hello'
            expect(changes.added.content).to.be.equal 'hi'

        it 'should return added i18n properties', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'salut', 'fr'
            expect(blogPost.changes().added.title.fr).to.be.equal 'salut'
            blogPost.push 'keyword', 'foo'
            blogPost.push 'keyword', 'bar'
            expect(blogPost.changes().added.keyword).to.include.members ['foo', 'bar']

        it 'should return removed i18n properties', () ->
            blogPost = new db.BlogPost {
                'title': {'en': 'hello', }
                'content': 'hello world'
                'keyword': ['foo', 'bar']
            }
            blogPost.unset 'title', 'en'
            blogPost.unset 'content'
            blogPost.pull 'keyword', 'bar'

            changes = blogPost.changes()
            expect(changes.removed.title.en).to.be.equal 'hello'
            expect(changes.removed.content).to.be.equal 'hello world'
            expect(changes.removed.keyword).to.include 'bar'

        it 'should return modified i18n properties', () ->
            blogPost = new db.BlogPost {
                'title': {'en': 'hello'}
                'content': 'hello world'
                'keyword': ['foo', 'bar']
            }

            blogPost.set 'title', 'hi', 'en'
            blogPost.set 'content', 'hi world'
            blogPost.set 'keyword', ['toto', 'tata']

            changes = blogPost.changes()

            expect(changes.removed.title.en).to.be.equal 'hello'
            expect(changes.added.title.en).to.be.equal 'hi'
            expect(changes.removed.content).to.be.equal 'hello world'
            expect(changes.added.content).to.be.equal 'hi world'

            expect(changes.removed.keyword).to.include.members ['foo', 'bar']
            expect(changes.added.keyword).to.include.members ['toto', 'tata']

        it 'should return the added multi-i18n properties', () ->
            blog = new db.Blog
            blog.push 'i18ntags', 'hello', 'en'
            blog.push 'i18ntags', 'world', 'en'
            blog.push 'i18ntags', 'salut', 'fr'
            blog.push 'i18ntags', 'monde', 'fr'

            changes = blog.changes()
            expect(changes.added.i18ntags.en).to.include.members ['hello', 'world']
            expect(changes.added.i18ntags.fr).to.include.members ['salut', 'monde']

        it 'should return the removed multi-i18n properties', () ->
            blog = new db.Blog {
                i18ntags: {
                    'en': ['hello', 'world', 'foo']
                    'fr': ['salut', 'monde', 'toto']
                }
            }
            blog.pull 'i18ntags', 'hello', 'en'
            blog.pull 'i18ntags', 'world', 'en'
            blog.pull 'i18ntags', 'salut', 'fr'
            blog.pull 'i18ntags', 'monde', 'fr'

            changes = blog.changes()
            expect(changes.removed.i18ntags.en).to.include.members ['hello', 'world']
            expect(changes.removed.i18ntags.fr).to.include.members ['salut', 'monde']

        it 'should return the modified multi-i18n properties', () ->
            blog = new db.Blog {
                i18ntags: {
                    'en': ['hello', 'world', 'foo']
                    'fr': ['salut', 'monde', 'toto']
                }
            }
            blog.set 'i18ntags', ['foo', 'bar'], 'en'
            blog.set 'i18ntags', ['toto', 'tata'], 'fr'

            changes = blog.changes()

            expect(changes.removed.i18ntags.en).to.include.members ['hello', 'world']
            expect(changes.added.i18ntags.en).to.include 'bar'
            expect(changes.removed.i18ntags.fr).to.include.members ['salut', 'monde']
            expect(changes.added.i18ntags.fr).to.include 'tata'


    describe '.save()', ()->
        it 'should generate a generic id if no id is set', (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            expect(blogPost.id).to.be.undefined
            blogPost.save (err, model, dbtouched) ->
                expect(err).to.be.null
                expect(blogPost.get('_id')).to.be.equal blogPost.id
                expect(model.get('_id')).to.be.equal blogPost.id
                expect(model.id).to.be.equal blogPost.id
                expect(blogPost.id).to.be.not.undefined
                expect(blogPost.id).to.be.string
                done()

        it "shouldn't generate an id if the id is set", (done) ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.id = 'blogPost'
            blogPost.save (err) ->
                expect(err).to.be.null
                expect(blogPost.id).to.be.equal 'blogPost'

                blogPost2 = new db.BlogPost
                blogPost2.set 'title', 'hello world', 'en'
                blogPost2.set 'keyword', ['foo', 'bar']
                blogPost2.id = 0
                blogPost2.save (err) ->
                    expect(err).to.be.null
                    expect(blogPost2.id).to.be.equal 0
                    done()

        it 'should save all unsaved relations', (done) ->
            blog = new db.Blog {title: 'My blog'}
            author = new db.Author {login: 'nico'}
            blogPost = new db.BlogPost
            blogPost.set 'title', {en: 'hello world', fr: 'salut monde'}
            blogPost.set 'content', 'first post'
            blogPost.set 'author', author
            blogPost.set 'blog', blog

            expect(blog.isNew()).to.be.true
            expect(author.isNew()).to.be.true

            pending = blogPost._getPendingRelations()
            expect(pending).to.include author
            expect(pending).to.include blog

            expect(blog.id).to.be.undefined
            expect(author.id).to.be.undefined
            expect(blogPost.id).to.be.undefined

            blogPost.save (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(blogPost.id).to.be.not.undefined
                expect(blogPost.get('author').id).to.be.not.undefined
                expect(blogPost.get('blog').id).to.be.not.undefined

                expect(blog.id).to.equal blogPost.get('blog').id
                expect(author.id).to.equal blogPost.get('author').id
                done()


        it 'should save all updated relations', (done) ->
            blog = new db.Blog {title: 'My blog'}
            author = new db.Author {login: 'nico'}
            blogPost = new db.BlogPost
            blogPost.set 'title', {en: 'hello world', fr: 'salut monde'}
            blogPost.set 'content', 'first post'
            blogPost.set 'author', author
            blogPost.set 'blog', blog

            expect(blog.isNew()).to.be.true
            expect(author.isNew()).to.be.true

            pending = blogPost._getPendingRelations()
            expect(pending).to.include author
            expect(pending).to.include blog

            expect(blog.id).to.be.undefined
            expect(author.id).to.be.undefined
            expect(blogPost.id).to.be.undefined

            blogPost.save (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(blogPost.id).to.be.not.undefined
                expect(blogPost.get('author').id).to.be.not.undefined

                expect(blogPost.get('author').get('login')).to.be.equal 'nico'
                expect(blogPost.get('blog').get('title')).to.be.equal 'My blog'

                blogPost.get('author').set('login', 'bob')
                blogPost.get('blog').set('title', 'the blog')

                blogPost.save (err, obj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true
                    expect(obj.get('author').get('login')).to.be.equal 'bob'
                    expect(obj.get('blog').get('title')).to.be.equal 'the blog'
                    db.Blog.first blog.id, (err, blog) ->
                        expect(err).to.be.null
                        expect(blog.get('title')).to.be.equal 'the blog'
                        db.Author.first author.id, (err, author) ->
                            expect(err).to.be.null
                            expect(author.get('login')).to.be.equal 'bob'
                            db.BlogPost.first obj.id, (err, blogPost) ->
                                expect(err).to.be.null
                                expect(obj.get('author').get('login')).to.be.equal(
                                    'bob')
                                expect(obj.get('blog').get('title')).to.be.equal(
                                    'the blog')
                                expect(obj.get('title', 'en')).to.be.equal(
                                    'hello world')
                                done()

        it 'should generate an id from a specified field if no id is set'
        it 'should store the values of an instance into the database'
        it "shouldn't fire a store request if there is no value changes"
        it 'should take a callback with an error if the nugget is not saved'
        it 'should take a callback with the saved nugget'


    describe '.getLabel()', () ->
        it 'should return the label of a field', () ->
            blog = new db.Blog
            blog.getLabel('i18ntags', 'en').should.be.equal 'tags'

        it 'should return the field name if no label is set', () ->
            blog = new db.Blog
            blog.getLabel('title', 'en').should.be.equal 'title'

        it 'should return the label in the wanted language', () ->
            blogpost = new db.BlogPost
            blogpost.getLabel('title', 'en').should.be.equal 'title'
            blogpost.getLabel('title', 'fr').should.be.equal 'titre'

    describe '.getJSONObject()', () ->
        it 'should return a jsonable object', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            jsonBlogPost = blogPost.toJSONObject()
            expect(jsonBlogPost.title.en).to.be.equal 'hello world'
            expect(jsonBlogPost.keyword).to.include.members ['foo', 'bar']

        it 'should include the id', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.save (err, model) ->
                expect(err).to.be.null
                jsonBlogPost = blogPost.toJSONObject()
                expect(jsonBlogPost._id).to.not.be.undefined

        it 'should not be modified if the model changes', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            jsonBlogPost = blogPost.toJSONObject()
            blogPost.set 'title', 'salut monde', 'fr'
            expect(jsonBlogPost.title.fr).to.be.undefined

    describe '.getJSON()', () ->
        it 'should return a json string of the model', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            jsonObject = {
                "_type": blogPost.get('_type')
                "title":{"en":"hello world"}
                "keyword":["foo","bar"]
            }
            expect(blogPost.toJSON()).to.be.equal JSON.stringify jsonObject

        it 'should include the id', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.save (err) ->
                expect(err).to.be.null
                jsonBlogPost = JSON.parse blogPost.toJSON()
                expect(jsonBlogPost._id).to.not.be.undefined
                expect(jsonBlogPost.id).to.be.undefined

    describe '.delete()', ()->
        it 'should remove a saved instance from the database', (done) ->
            blogPost = new db.BlogPost()
            blogPost.set 'title', 'hello world', 'en'
            blogPost.set 'keyword', ['hello', 'world']
            blogPost.set 'content', 'article'
            blogPost.save (err) ->
                expect(err).to.be.null
                db.count (err, total) ->
                    expect(err).to.be.null
                    expect(total).to.be.equal 1
                    blogPost.delete (err) ->
                        expect(err).to.be.null
                        db.count (err, total) ->
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


    describe '._getPendingRelations()', () ->

        it 'should push a pending relation', () ->
            blog1 = new db.Blog {title: 'My first blog'}
            blog2 = new db.Blog {title: 'My second blog'}
            blog3 = new db.Blog {title: 'My third blog'}
            blogIndex = new db.BlogIndex
            blogIndex.push 'multiBlogs', blog1

            expect(blogIndex._getPendingRelations()).to.include blog1

            blogIndex.push 'multiBlogs', blog2
            expect(blogIndex._getPendingRelations()).to.include blog2


        it 'should discard all unsaved relations if unset', () ->
            blog = new db.Blog {title: 'My blog'}
            author = new db.Author {login: 'nico'}
            blogPost = new db.BlogPost
            blogPost.set 'title', {en: 'hello world', fr: 'salut monde'}
            blogPost.set 'content', 'first post'
            blogPost.set 'author', author
            blogPost.set 'blog', blog

            expect(blogPost._getPendingRelations()).to.include author
            expect(blogPost._getPendingRelations()).to.include blog

            blogPost.unset 'author'
            expect(blogPost._getPendingRelations()).to.not.include author
            expect(blogPost._getPendingRelations()).to.include blog

            blogPost.unset 'blog'
            expect(blogPost._getPendingRelations()).to.not.include blog

        it.skip 'should discard all unsaved relations if unset a i18n field', () ->
            nico = new db.Author {login: 'nico'}
            thib = new db.Author {login: 'thib'}
            blogIndex = new db.BlogIndex
            blogIndex.set 'i18nAuthor', nico, 'en'
            blogIndex.set 'i18nAuthor', thib, 'fr'

            expect(blogIndex._getPendingRelations()).to.include nico
            expect(blogIndex._getPendingRelations()).to.include thib

            blogIndex.unset 'i18nAuthor', 'en'
            expect(blogIndex._getPendingRelations()).to.not.include nico
            expect(blogIndex._getPendingRelations()).to.include thib

            blogIndex.unset 'i18nAuthor', 'fr'
            expect(blogIndex._getPendingRelations()).to.not.include thib

        it 'should discard all unsaved relations if unset a multi field', () ->
            blog1 = new db.Blog {title: 'My first blog'}
            blog2 = new db.Blog {title: 'My second blog'}
            blog3 = new db.Blog {title: 'My third blog'}
            blogIndex = new db.BlogIndex
            blogIndex.set 'multiBlogs', [blog1, blog2]
            blogIndex.push 'multiBlogs', blog3


            expect(blogIndex._getPendingRelations()).to.include blog1
            expect(blogIndex._getPendingRelations()).to.include blog2
            expect(blogIndex._getPendingRelations()).to.include blog3


            blogIndex.unset 'multiBlogs'
            expect(blogIndex._getPendingRelations()).to.not.include blog1
            expect(blogIndex._getPendingRelations()).to.not.include blog2
            expect(blogIndex._getPendingRelations()).to.not.include blog3

        it 'should discard all unsaved relations if pulled a multi field', () ->
            blog1 = new db.Blog {title: 'My first blog'}
            blog2 = new db.Blog {title: 'My second blog'}
            blog3 = new db.Blog {title: 'My third blog'}
            blogIndex = new db.BlogIndex
            blogIndex.set 'multiBlogs', [blog1, blog2]
            blogIndex.push 'multiBlogs', blog3


            expect(blogIndex._getPendingRelations()).to.include blog1
            expect(blogIndex._getPendingRelations()).to.include blog2
            expect(blogIndex._getPendingRelations()).to.include blog3

            blogIndex.pull 'multiBlogs', blog2

            expect(blogIndex._getPendingRelations()).to.include blog1
            expect(blogIndex._getPendingRelations()).to.not.include blog2
            expect(blogIndex._getPendingRelations()).to.include blog3

            blogIndex.pull 'multiBlogs', blog3
            expect(blogIndex._getPendingRelations()).to.not.include blog3


        it.skip 'should discard all matching unsaved relations on a multi-i18n field', () ->
            blog1 = new db.Blog {title: 'My first blog'}
            blog2 = new db.Blog {title: 'My second blog'}
            blog3 = new db.Blog {title: 'Mon premier blog'}
            blog4 = new db.Blog {title: 'Mon second blog'}
            blogIndex = new db.BlogIndex
            blogIndex.set 'multiI18nBlogs', [blog1, blog2], 'en'
            blogIndex.push 'multiI18nBlogs', blog3, 'fr'
            blogIndex.push 'multiI18nBlogs', blog4, 'fr'

            expect(blogIndex._getPendingRelations()).to.include blog1
            expect(blogIndex._getPendingRelations()).to.include blog2
            expect(blogIndex._getPendingRelations()).to.include blog3
            expect(blogIndex._getPendingRelations()).to.include blog4

            blogIndex.pull 'multiI18nBlogs', blog3, 'fr'

            expect(blogIndex._getPendingRelations()).to.include blog1
            expect(blogIndex._getPendingRelations()).to.include blog2
            expect(blogIndex._getPendingRelations()).to.not.include blog3
            expect(blogIndex._getPendingRelations()).to.include blog4


            blogIndex.unset 'multiI18nBlogs', 'en'
            expect(blogIndex._getPendingRelations()).to.not.include blog1
            expect(blogIndex._getPendingRelations()).to.not.include blog2
            expect(blogIndex._getPendingRelations()).to.not.include blog3
            expect(blogIndex._getPendingRelations()).to.include blog4

        it.skip 'should discard only the matching relation on a i18n-field', () ->
            nico = new db.Author {login: 'nico'}
            thib = new db.Author {login: 'thib'}
            blogIndex = new db.BlogIndex
            blogIndex.set 'i18nAuthor', nico, 'en'
            blogIndex.set 'i18nAuthor', thib, 'fr'
            blogIndex.set 'i18nAuthor', nico, 'eo'

            expect(blogIndex._getPendingRelations()).to.include nico
            expect(blogIndex._getPendingRelations()).to.include thib

            blogIndex.unset 'i18nAuthor', 'en'
            expect(blogIndex._getPendingRelations()).to.include nico
            expect(blogIndex._getPendingRelations()).to.include thib

            blogIndex.unset 'i18nAuthor', 'eo'
            expect(blogIndex._getPendingRelations()).to.not.include nico
            expect(blogIndex._getPendingRelations()).to.include thib

            blogIndex.unset 'i18nAuthor', 'fr'
            expect(blogIndex._getPendingRelations()).to.not.include thib
