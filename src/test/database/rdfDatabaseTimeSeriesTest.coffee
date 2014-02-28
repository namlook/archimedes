
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect
_ = require 'underscore'
config = require('../config')
db = config.Database()

if db.dbtype isnt 'rdf'
    console.log "Database is not an RDF database (got #{db.dbtype}). Skipping..."
    return


describe 'Database.timeSeries()', ()->

    f = {
        date: "#{config.nsprop}date"
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
        it 'should return the results grouped by year ', (done) ->
            pojos = []
            for i in [1..14]
                pojo = {}
                pojo[f.date] = new Date(Date.UTC(2000+i%3, 1, i))
                pojos.push pojo
            db.batchSync pojos, (err, obj, infos) ->
                expect(err).to.be.null
                db.timeSeries f.date, '$year', (err, results) ->
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
            pojos = []
            for i in [1..14]
                pojo = {}
                pojo[f.date] = new Date(Date.UTC(2000+i%3, i%2, i))
                pojos.push pojo
            db.batchSync pojos, (err, obj, infos) ->
                expect(err).to.be.null
                db.timeSeries f.date, '$year-$month', (err, results) ->
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
            pojos = []
            for i in [1..14]
                pojo = {}
                pojo[f.date] = new Date(Date.UTC(2000+i%3, i%2, i%2+1))
                pojos.push pojo
            db.batchSync pojos, (err, obj, infos) ->
                expect(err).to.be.null
                db.timeSeries f.date, '$year/$month/$day', (err, results) ->
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



