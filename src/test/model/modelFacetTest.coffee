expect = require('chai').expect
_ = require 'underscore'
config = require('../config')

describe 'model.facets', ()->

    models = {}

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
        it.only 'should return the facets on a specified field ', (done) ->
            literals = []
            for i in [1..5]
                literals.push new db.Literal {string: facetValues[i%3], integer: i}
            db.batchSync literals, (err, obj, infos) ->
                expect(err).to.be.null
                db.Literal.facets 'string', (err, results) ->
                    expect(err).to.be.null
                    console.log results
                    expect(results.length).to.be.equal 3
                    expect(results[0].facet).to.be.equal 'arf'
                    expect(results[0].count).to.be.equal 2
                    expect(results[1].facet).to.be.equal 'foo'
                    expect(results[1].count).to.be.equal 2
                    expect(results[2].facet).to.be.equal 'bar'
                    expect(results[2].count).to.be.equal 1
                    done()