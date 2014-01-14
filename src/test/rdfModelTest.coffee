
chai = require('chai')
expect = chai.expect
should = chai.should()

RdfsClass = require('../rdf').Model
RdfDatabase = require('../rdf').Database

describe.skip 'RdfModel', ()->

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
                label: 'tags'


    class classes.BlogPost extends RdfsClass
        meta: {}

        properties:
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
        endpoint: 'http://localhost:8889/sparql'
        namespace: 'http://onto.example.org'
        defaultInstancesNamespace: 'http://data.example.org'
        graphURI: 'http://example.org/blogengine'
        defaultLang: 'en'
    }

    db.registerClasses classes

    describe 'constructor()', () ->
        it 'should take customs namespace', ()->

            class GoodClass extends RdfsClass
                meta:
                    propertiesNamespace: 'http://props.example.org/properties'
                schema: {}

            class GoodClass2 extends RdfsClass
                meta:
                    uri: 'http://example.org/type/GoodClass2'
                schema: {}

            class GoodClass3 extends GoodClass
                meta:
                    instancesNamespace: 'http://example.org/data'
                schema: {}

            db.registerClasses {GoodClass: GoodClass, GoodClass2: GoodClass2, GoodClass3: GoodClass3}

            propertiesNS = 'http://props.example.org/properties'
            new GoodClass().meta.propertiesNamespace.should.equal propertiesNS

            uri = 'http://example.org/type/GoodClass2'
            new GoodClass2().meta.uri.should.equal uri

            instancesNS = 'http://example.org/data'
            new GoodClass3().meta.instancesNamespace.should.equal instancesNS


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


    describe 'push()', ()->
        it 'should add an instance to a multi relation field'


    describe 'pull()', ()->
        it 'should remove an instance of an i18n-multi relation field'


    describe 'has()', ()->
        it 'should return true if the instance of a relation field exists'

        it 'should return true if the instances of a multi-relation field exists'

    describe 'clear()', ()->
        it 'should remove all the values of an instance but not its id'

    describe 'clone()', ()->
        it 'should copy all the values of an instance but not its id'

    describe 'isNew()', ()->
        it 'should return true when the model has relations and  is not saved'
        it 'should return false when the model has relation and is already saved (ie: has an ID)'


    describe: 'populate()': ()->
        it 'should populate all fields which values are URIs'
        it 'should populate a specified field'
        it 'should populate all specified field passed as an array'
        it 'should return an error if a field was not able to be populated'

    describe: 'isPopulated()': ()->
        it 'should return true if the field is already populated'

    describe: 'validate()': ()->
        it 'should throw an error if a field marked as required is missing'

    describe 'save()', ()->
        it 'should generate a generic id if no id is set'
        it 'should generate an id from a specified field if no id is set'
        it 'should store the values of an instance into the database'
        it "shouldn't fire a store request if there is no value changes"
        it 'should take a callback with an error if the nugget is not saved'
        it 'should take a callback with the saved nugget'

    describe 'getJSONObject()', () ->
        it 'should return a jsonable object with related instance ids'
        it 'should not be modified if the model has relation and changes'

    describe 'getJSON()', () ->
        it 'should return a json string of the model with related instance ids'
