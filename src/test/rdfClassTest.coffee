
chai = require('chai')
expect = chai.expect
should = chai.should()

RdfsClass = require('../rdf').Class
RdfDatabase = require('../rdf').Database

describe 'Class', ()->


    classes = {}

    class classes.Author extends RdfsClass
        meta: {}

        properties:
            login:
                type: 'string'
                required: true

    class classes.Blog extends RdfsClass
        meta: {}

        properties:
            title:
                type: 'string'
            i18ntags:
                type: 'string'
                multi: true
                i18n: true


    class classes.BlogPost extends RdfsClass
        meta: {}

        properties:
            title:
                i18n: true
                type: 'string'
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
        endpoint: 'http://localhost:8889/sparql'
        namespace: 'http://onto.example.org'
        defaultInstancesNamespace: 'http://data.example.org'
        graphURI: 'http://example.org/blogengine'
        defaultLang: 'en'
    }

    db.registerClasses classes

    describe '#constructor()', () ->
        it 'should throw an exception if Model.meta is not specified', ()->

            class BadClass extends RdfsClass

            expect(-> db.registerClasses {BadClass: BadClass}).to.throw(
                "BadClass has not meta")


        it 'should take customs namespace', ()->

            class GoodClass extends RdfsClass
                meta:
                    propertiesNamespace: 'http://props.example.org/properties'

            class GoodClass2 extends RdfsClass
                meta:
                    uri: 'http://example.org/type/GoodClass2'

            class GoodClass3 extends GoodClass
                meta:
                    instancesNamespace: 'http://example.org/data'

            db.registerClasses {GoodClass: GoodClass, GoodClass2: GoodClass2, GoodClass3: GoodClass3}

            propertiesNS = 'http://props.example.org/properties'
            new GoodClass().meta.propertiesNamespace.should.equal propertiesNS

            uri = 'http://example.org/type/GoodClass2'
            new GoodClass2().meta.uri.should.equal uri

            instancesNS = 'http://example.org/data'
            new GoodClass3().meta.instancesNamespace.should.equal instancesNS


        it 'should be created without values', () ->
            author = new db.Author
            blog = new db.Blog
            blogPost = new db.BlogPost


        it 'should have @meta.graphURI', () ->
            graphURI = 'http://example.org/blogengine'
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


        it 'should have @meta.defaultLang if specified in database', () ->
            author = new db.Author()
            author.meta.defaultLang.should.equal 'en'


        # it 'should add properties to new instance of model', ()->
        #     author = new db.Author {login: 'namlook'}
        #     author.get('login').should.equal 'namlook'


    describe '#get()', ()->
        it 'should return the value of a field'
        it 'sould return the values of a multi-field'
        it 'should return the value of a i18n field'
        it 'should return the values of a i18n multi-field'
        it 'should return the related instance id of a relation field'
        it 'should return the related instances ids of multi relation field'

    describe '#getInstance()', () ->
        it 'should return the related populated instance'
        it 'should return the related populated instances on a multi-field'



    describe '#set()', ()->
        it 'should set the value of a field', ()->
            author = new db.Author
            author.set 'login', 'namlook'
            author.get('login').should.equal 'namlook'


        it 'should set the values of a multi field', ()->
            blogPost = new db.BlogPost
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.get('keyword').should.include 'foo', 'bar'


        it 'should set the value of an i18n field', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', {lang: 'en'}
            blogPost.set 'title', 'bonjour monde', {lang: 'fr'}
            blogPost.get('title', {lang: 'en'}).should.equal 'hello world'
            blogPost.get('title', {lang: 'fr'}).should.equal 'bonjour monde'


        it 'should set the values of an i18n multi-field', ()->
            blog = new db.Blog
            blog.set 'i18ntags', ['foo', 'bar', 'baz'], {lang: 'en'}
            blog.set 'i18ntags', ['toto', 'tata'], {lang: 'fr'}
            blog.get('i18ntags', {lang: 'en'}).should.include 'foo', 'bar', 'baz'
            blog.get('i18ntags', {lang: 'fr'}).should.include 'toto', 'tata'


        it 'should set the value of a relation field'
        it 'should set the values of a relation field'

        it 'should throw an error if the value is an array and the field non-multi', () ->
            blogPost = new db.BlogPost
            expect(-> blogPost.set('title', ['foo', 'bar'])).to.throw(
                /'title' doesn't accept array/)



    describe '#unset()', ()->
        it 'should unset a value', ()->
            author = new db.Author
            author.set 'login', 'namlook'
            author.unset 'login'
            should.not.exist author.get 'login'


        it 'should unset a multi field value', ()->
            blogPost = new db.BlogPost
            blogPost.set 'keyword', ['foo', 'bar', 'baz']
            blogPost.unset 'keyword'
            should.not.exist blogPost.get 'keyword'


        it 'should unset an i18n value', ()->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', {lang: 'en'}
            blogPost.set 'title', 'bonjour monde', {lang: 'fr'}
            blogPost.unset 'title', {lang: 'en'}
            should.not.exist blogPost.get('title', {lang: 'en'})
            blogPost.get('title', {lang: 'fr'}).should.equal 'bonjour monde'
            blogPost.unset 'title', {lang: 'fr'}
            should.not.exist blogPost.get('title', {lang: 'fr'})

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


    describe '#push()', ()->
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
                'BlogPost.title is not a multi field')


    describe '#pull()', ()->
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


    describe '#has()', ()->
        it 'should return true if the value of a field exists', ()->
            blogPost = new db.BlogPost
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.set 'title', 'hello world'
            blogPost.has('keyword').should.be.true
            blogPost.has('author').should.be.false

        it 'should return true if the value of a i18n field exists', () ->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world', {lang: 'en'}
            blogPost.set 'title', 'bonjour monde', {lang: 'fr'}
            blogPost.has('title', {lang: 'en'}).should.be.true
            blogPost.has('title', {lang: 'fr'}).should.be.true
            blogPost.has('title', {lang: 'es'}).should.be.false

    describe '#clear()', ()->
        it 'should remove all the values of and instance but not its id', ()->
            blogPost = new db.BlogPost
            blogPost.set 'title', 'hello world'
            blogPost.set 'keyword', ['foo', 'bar']
            blogPost.has('title').should.be.true
            blogPost.has('keyword').should.be.true
            blogPost.clear()
            blogPost.has('title').should.be.false
            blogPost.has('keyword').should.be.false

    describe '#clone()', ()->
        it 'should copy all the values of an instance but not its id'

    describe: '#populate': ()->
        it 'should populate all fields which values are URIs'
        it 'should populate a specified field'
        it 'should populate all specified field passed as an array'
        it 'should return an error if a field was not able to be populated'

    describe: '#isPopulated': ()->
        it 'should return true if the field is already populated'

    describe: '#validate': ()->
        it 'should throw an error if a field marked as required is missing'

    describe '#save()', ()->
        it 'should generate a generic id if no id is set'
        it 'should generate an id from a specified field if no id is set'
        it 'should store the values of an instance into the database'
        it "shouldn't fire a store request if there is no value changes"
        it 'should take a callback with an error if the nugget is not saved'
        it 'should take a callback with the saved nugget'





