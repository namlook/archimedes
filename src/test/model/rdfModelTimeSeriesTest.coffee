
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect
_ = require 'underscore'
async = require 'async'
config = require('../config')
db = config.Database()

if db.dbtype isnt 'rdf'
    console.log "Database is not an RDF database (got #{db.dbtype}). Skipping..."
    return

describe 'model.timeSeries', ()->

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

    describe '[simple]', () ->
        it 'should return an error if the field is not in schema', (done) ->
            literals = []
            for i in [1..5]
                literals.push new db.Literal {string: facetValues[i%3], integer: i}
            db.batchSync literals, (err, obj, infos) ->
                expect(err).to.be.null
                db.Literal.timeSeries 'notinschema', '$year', (err, results) ->
                    expect(err).to.be.equal 'Unknown field: Literal.notinschema'
                    expect(results).to.be.undefined
                    done()

        it 'should return an error if the field is not in a date', (done) ->
            literals = []
            for i in [1..5]
                literals.push new db.Literal {string: facetValues[i%3], integer: i}
            db.batchSync literals, (err, obj, infos) ->
                expect(err).to.be.null
                db.Literal.timeSeries 'string', '$year', (err, results) ->
                    expect(err).to.be.equal 'Literal.string is not a date. timeSeries() requires a date field'
                    expect(results).to.be.undefined
                    done()

        it 'should return the results grouped by year ', (done) ->
            literals = []
            for i in [1..14]
                literals.push new db.Literal {
                    date: new Date(Date.UTC(2000+i%3, 1, i))
                }
            db.batchSync literals, (err, obj, infos) ->
                expect(err).to.be.null
                db.Literal.timeSeries 'date', '$year', (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    expect(results[0].facet).to.be.equal '2000'
                    expect(results[0].count).to.be.equal 4
                    expect(results[1].facet).to.be.equal '2001'
                    expect(results[1].count).to.be.equal 5
                    expect(results[2].facet).to.be.equal '2002'
                    expect(results[2].count).to.be.equal 5
                    done()

        it 'should return the results grouped by year and month ', (done) ->
            literals = []
            for i in [1..14]
                literals.push new db.Literal {
                    date: new Date(Date.UTC(2000+i%3, i%2, i))
                }
            db.batchSync literals, (err, obj, infos) ->
                expect(err).to.be.null
                db.Literal.timeSeries 'date', '$year-$month', (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 6
                    expect(results[0].facet).to.be.equal '2000-01'
                    expect(results[0].count).to.be.equal 2
                    expect(results[1].facet).to.be.equal '2000-02'
                    expect(results[1].count).to.be.equal 2
                    expect(results[2].facet).to.be.equal '2001-01'
                    expect(results[2].count).to.be.equal 2
                    expect(results[3].facet).to.be.equal '2001-02'
                    expect(results[3].count).to.be.equal 3
                    expect(results[4].facet).to.be.equal '2002-01'
                    expect(results[4].count).to.be.equal 3
                    expect(results[5].facet).to.be.equal '2002-02'
                    expect(results[5].count).to.be.equal 2
                    done()

        it 'should return the results grouped by year, month and day ', (done) ->
            literals = []
            for i in [1..14]
                literals.push new db.Literal {
                    date: new Date(Date.UTC(2000+i%3, i%2, i%2+1))
                }
            db.batchSync literals, (err, obj, infos) ->
                expect(err).to.be.null
                db.Literal.timeSeries 'date', '$year/$month/$day', (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 6
                    expect(results[0].facet).to.be.equal '2000/01/01'
                    expect(results[0].count).to.be.equal 2
                    expect(results[1].facet).to.be.equal '2000/02/02'
                    expect(results[1].count).to.be.equal 2
                    expect(results[2].facet).to.be.equal '2001/01/01'
                    expect(results[2].count).to.be.equal 2
                    expect(results[3].facet).to.be.equal '2001/02/02'
                    expect(results[3].count).to.be.equal 3
                    expect(results[4].facet).to.be.equal '2002/01/01'
                    expect(results[4].count).to.be.equal 3
                    expect(results[5].facet).to.be.equal '2002/02/02'
                    expect(results[5].count).to.be.equal 2
                    done()



