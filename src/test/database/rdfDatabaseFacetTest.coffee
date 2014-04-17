
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect
_ = require 'underscore'
config = require('../config')
db = config.Database()

if db.dbtype isnt 'rdf'
    console.log "Database is not an RDF database (got #{db.dbtype}). Skipping..."
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

    describe '[deep]', () ->
        it "should facet on relations", (done) ->
            data = []
            for i in [1..15]
                embeded = {_id: i, _type: 'Embed'}
                embeded[f.index] = i
                embeded[f.title] = "#{i%2}"
                data.push embeded
                pojo = {_type: 'Pojo'}
                pojo[f.foo] = {_uri: "http://data.example.org/embed/#{i}"}
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
                pojo[f.foo] = {_uri: "http://data.example.org/embed/#{i}"}
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
