
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

_ = require 'underscore'
config = require('../config')
db = config.Database()

if db.type isnt 'rdf'
    console.log "Database is not an RDF database (got #{db.type}). Skipping..."
    return


describe 'Database.facets()', ()->

    f = {
        title: "#{config.nsprop}title"
        index: "#{config.nsprop}index"
        foo: "#{config.nsprop}foo"
    }
    t = {
        pojo1: "#{config.nsclass}Pojo1"
        pojo2: "#{config.nsclass}Pojo2"
    }
    facetValues = {
        0: 'bar'
        1: 'foo'
        2: 'arf'
    }

    beforeEach (done) ->
        db.clear done

    describe '[simple]', () ->
        it 'should return the facets on a specified field ', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = facetValues[i%3]
                pojo[f.index] = i
                pojo[f.foo] = i%2
                pojos.push pojo
            db.batchSync pojos, (err, obj, infos) ->
                expect(err).to.be.null
                db.facets f.title, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    expect(results[0].facet).to.be.equal 'arf'
                    expect(results[0].count).to.be.equal 2
                    expect(results[1].facet).to.be.equal 'foo'
                    expect(results[1].count).to.be.equal 2
                    expect(results[2].facet).to.be.equal 'bar'
                    expect(results[2].count).to.be.equal 1
                    done()

        it 'should return the facets on a specified field with a query', (done) ->
            pojos = []
            for i in [1..15]
                pojo = {_type: 'Test'}
                pojo[f.title] = facetValues[i%3]
                pojo[f.index] = i
                pojo[f.foo] = i%2
                pojos.push pojo
            db.batchSync pojos, (err, obj, infos) ->
                expect(err).to.be.null
                query = {}
                query[f.foo] = 1
                db.facets f.title, query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    expect(results[0].facet).to.be.equal 'bar'
                    expect(results[0].count).to.be.equal 3
                    expect(results[1].facet).to.be.equal 'foo'
                    expect(results[1].count).to.be.equal 3
                    expect(results[2].facet).to.be.equal 'arf'
                    expect(results[2].count).to.be.equal 2
                    done()

        it "should return the facets on a specified field with a query on facet's field", (done) ->
            pojos = []
            for i in [1..15]
                pojo = {_type: 'Test'}
                pojo[f.title] = facetValues[i%3]
                pojo[f.index] = i
                pojo[f.foo] = i%2
                pojos.push pojo
            db.batchSync pojos, (err, obj, infos) ->
                expect(err).to.be.null
                query = {}
                query[f.title] = facetValues[1] # foo
                db.facets f.title, query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].facet).to.be.equal 'foo'
                    expect(results[0].count).to.be.equal 5
                    done()

    describe '[i18n]', () ->
        it 'should return the facets for all languages on a specified i18n field', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = {en: 'en'+facetValues[i%3], fr: 'fr'+facetValues[i%3]}
                pojo[f.index] = i
                pojo[f.foo] = i%2
                pojos.push pojo
            db.batchSync pojos, (err, obj, infos) ->
                expect(err).to.be.null
                db.facets f.title, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 6
                    expect(results[0].facet).to.be.equal 'enarf'
                    expect(results[0].count).to.be.equal 2
                    expect(results[1].facet).to.be.equal 'enfoo'
                    expect(results[1].count).to.be.equal 2
                    expect(results[2].facet).to.be.equal 'frarf'
                    expect(results[2].count).to.be.equal 2
                    expect(results[3].facet).to.be.equal 'frfoo'
                    expect(results[3].count).to.be.equal 2
                    expect(results[4].facet).to.be.equal 'enbar'
                    expect(results[4].count).to.be.equal 1
                    expect(results[5].facet).to.be.equal 'frbar'
                    expect(results[5].count).to.be.equal 1
                    done()

        it 'should return the facets on a specified i18n field', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = {en: 'en'+facetValues[i%3], fr: 'fr'+facetValues[i%3]}
                pojo[f.index] = i
                pojo[f.foo] = i%2
                pojos.push pojo
            db.batchSync pojos, (err, obj, infos) ->
                expect(err).to.be.null
                db.facets f.title+'@en', (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    expect(results[0].facet).to.be.equal 'enarf'
                    expect(results[0].count).to.be.equal 2
                    expect(results[1].facet).to.be.equal 'enfoo'
                    expect(results[1].count).to.be.equal 2
                    expect(results[2].facet).to.be.equal 'enbar'
                    expect(results[2].count).to.be.equal 1
                    done()

        it 'should return the facets on a specified i18n field with a query', (done) ->
            pojos = []
            for i in [1..15]
                pojo = {_type: 'Test'}
                pojo[f.title] = {en: 'en'+facetValues[i%3], fr: 'fr'+facetValues[i%3]}
                pojo[f.index] = i
                pojo[f.foo] = i%2
                pojos.push pojo
            db.batchSync pojos, (err, obj, infos) ->
                expect(err).to.be.null
                query = {}
                query[f.foo] = 1
                db.facets f.title+'@fr', query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    expect(results[0].facet).to.be.equal 'frbar'
                    expect(results[0].count).to.be.equal 3
                    expect(results[1].facet).to.be.equal 'frfoo'
                    expect(results[1].count).to.be.equal 3
                    expect(results[2].facet).to.be.equal 'frarf'
                    expect(results[2].count).to.be.equal 2
                    done()


    describe '[deep]', () ->
        it "should facet on relations", (done) ->
            data = []
            for i in [1..15]
                embeded = {_id: i, _type: 'Embed'}
                embeded[f.index] = i
                embeded[f.title] = "#{i%2}"
                data.push embeded
                pojo = {_type: 'Pojo'}
                pojo[f.foo] = {_ref: "http://data.example.org/embed/#{i}"}
                pojo[f.index] = i*2
                data.push pojo
            db.batchSync data, (err, savedOne, infos) ->
                expect(err).to.be.null
                db.facets "#{f.foo}->#{f.title}", (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    expect(results[0].facet).to.be.equal '1'
                    expect(results[0].count).to.be.equal 8
                    expect(results[1].facet).to.be.equal '0'
                    expect(results[1].count).to.be.equal 7
                    done()

        it "should facet on relations with query", (done) ->
            data = []
            for i in [1..15]
                embeded = {_id: i, _type: 'Embed'}
                embeded[f.index] = i
                embeded[f.title] = "#{i%2}"
                data.push embeded
                pojo = {_type: 'Pojo'}
                pojo[f.foo] = {_ref: "http://data.example.org/embed/#{i}"}
                pojo[f.index] = i*2
                data.push pojo
            db.batchSync data, (err, savedOne, infos) ->
                expect(err).to.be.null
                query = {}
                query[f.index] = {$lt: 16}
                db.facets "#{f.foo}->#{f.title}", query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    expect(results[0].facet).to.be.equal '1'
                    expect(results[0].count).to.be.equal 4
                    expect(results[1].facet).to.be.equal '0'
                    expect(results[1].count).to.be.equal 3
                    done()

        it "should facet on relations with query with _type", (done) ->
            data = []
            for i in [1..15]
                embeded = {_id: i%3, _type: 'Embed'}
                embeded[f.index] = i%3
                embeded[f.title] = facetValues[i%3]
                data.push embeded
                pojo = {_type: 'Pojo'}
                pojo[f.foo] = {_ref: "http://data.example.org/embed/#{i%3}"}
                pojo[f.index] = i*2
                data.push pojo
                otherPojo = {_type: 'Other'}
                otherPojo[f.foo] = {_ref: "http://data.example.org/embed/#{i%3}"}
                otherPojo[f.index] = i*2
                data.push otherPojo
            db.batchSync data, (err, savedOne, infos) ->
                expect(err).to.be.null
                query = {_type: 'Pojo'}
                query["#{f.foo}->#{f.title}"] = facetValues[1]
                db.facets "#{f.foo}->#{f.title}", query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].facet).to.be.equal 'foo'
                    expect(results[0].count).to.be.equal 5
                    done()

