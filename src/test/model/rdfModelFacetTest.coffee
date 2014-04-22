
expect = require('chai').expect
_ = require 'underscore'
async = require 'async'
config = require('../config')
db = config.Database()

if db.type isnt 'rdf'
    console.log "Database is not an RDF database (got #{db.type}). Skipping..."
    return

describe 'model.facets', ()->

    models = {}

    class models.Inner extends config.Model
        schema:
            string:
                type: 'string'

    class models.Literal extends config.Model
        schema:
            i18n:
                type: 'string'
                i18n: true
            string:
                type: 'string'
            integer:
                type: 'integer'
            date:
                type: 'date'
            inner:
                type: 'Inner'


    class models.One extends config.Model
        schema:
            literal:
                type: 'Literal'
                required: true

    class models.Multi extends config.Model
        schema:
            literals:
                type: 'Literal'
                multi: true


    db = config.Database()
    db.registerModels models

    beforeEach (done) ->
        db.clear done

    facetValues = {
        0: 'bar'
        1: 'foo'
        2: 'arf'
    }

    describe 'simple', () ->
        it 'should return an error if the field is not in the schema', (done) ->
            literals = []
            for i in [1..5]
                literals.push new db.Literal {string: facetValues[i%3], integer: i}
            db.batchSync literals, (err, obj, infos) ->
                expect(err).to.be.null
                db.Literal.facets 'notinschema', (err, results) ->
                    expect(err).to.be.equal 'Unknown field Literal.notinschema'
                    expect(results).to.be.undefined
                    done()


        it 'should return the facets on a specified field', (done) ->
            literals = []
            for i in [1..5]
                literals.push new db.Literal {string: facetValues[i%3], integer: i}
            db.batchSync literals, (err, obj, infos) ->
                expect(err).to.be.null
                db.Literal.facets 'string', (err, results) ->
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
            literals = []
            for i in [1..15]
                literals.push new db.Literal {string: facetValues[i%3], integer: i%2}
            db.batchSync literals, (err, obj, infos) ->
                expect(err).to.be.null
                db.Literal.facets 'string', {integer: 1}, (err, results) ->
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
        it 'should return an error if the field is not in the schema', (done) ->
            ones  = []
            for i in [1..15]
                ones.push new db.One {
                    literal: new db.Literal {
                        integer: i
                        string: "#{i%2}"
                        inner: new db.Inner {string: "#{i%2}"}
                    }
                }
             async.map ones, (one, cb) ->
                one.save cb
            , (err, results) ->
                expect(err).to.be.null
                db.One.facets 'literal.inner.notinschema', (err, results) ->
                    expect(err).to.be.equal 'Unknown field Inner.notinschema'
                    expect(results).to.be.undefined
                    done()

        it "should facet on relations", (done) ->
            ones  = []
            for i in [1..15]
                ones.push new db.One {
                    literal: new db.Literal {
                        integer: i
                        string: "#{i%2}"
                        inner: new db.Inner {string: "#{i%2}"}
                    }
                }
             async.map ones, (one, cb) ->
                one.save cb
            , (err, results) ->
                expect(err).to.be.null
                db.One.facets 'literal.inner.string', (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    expect(results[0].facet).to.be.equal '1'
                    expect(results[0].count).to.be.equal 8
                    expect(results[1].facet).to.be.equal '0'
                    expect(results[1].count).to.be.equal 7
                    done()


        it "should facet on relations with query", (done) ->
            ones  = []
            for i in [1..15]
                ones.push new db.One {
                    literal: new db.Literal {
                        integer: i
                        string: "#{i%2}"
                        inner: new db.Inner {string: "#{i%2}"}
                    }
                }
             async.map ones, (one, cb) ->
                one.save cb
            , (err, results) ->
                expect(err).to.be.null
                query = {}
                query['literal.integer'] = {$lt: 8}
                db.One.facets 'literal.inner.string', query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    expect(results[0].facet).to.be.equal '1'
                    expect(results[0].count).to.be.equal 4
                    expect(results[1].facet).to.be.equal '0'
                    expect(results[1].count).to.be.equal 3
                    done()
