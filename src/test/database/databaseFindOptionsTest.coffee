
expect = require('chai').expect
_ = require 'underscore'
config = require('../config')

describe 'Database.find(options)', ()->

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

    beforeEach (done) ->
        db.clear done

    describe '.find(limit)', () ->
        it 'should return a limited number of docs', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {}
                pojo[f.title] = i
                pojo[f.index] = i * 10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {}, {limit: 2}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()
