
expect = require('chai').expect
_ = require 'underscore'
config = require('../config')

describe 'Database.facets()', ()->

    db = config.Database()

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

    describe 'simple', () ->
        it 'should return the facets on a specified field ', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {}
                pojo[f.title] = facetValues[i%3]
                pojo[f.index] = i
                pojo[f.foo] = i%2
                pojos.push pojo
            console.log pojos
            db.batchSync pojos, (err, obj, infos) ->
                expect(err).to.be.null
                db.facets f.title, (err, results) ->
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