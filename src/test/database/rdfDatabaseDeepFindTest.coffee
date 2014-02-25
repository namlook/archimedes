
expect = require('chai').expect
_ = require 'underscore'
config = require('../config')
db = config.Database()

if db.dbtype isnt 'rdf'
    console.log "Database is not an RDF database (got #{db.dbtype}). Skipping..."
    return


describe 'Database deep find:', ()->

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
        it 'should be able to query relation fields', (done) ->
            data = []
            for i in [1..15]
                embeded = {_id: "http://example.org/embeded#{i}"}
                embeded[f.index] = i
                embeded[f.title] = "#{i%2}"
                data.push embeded
                pojo = {}
                pojo[f.foo] = {_uri: embeded._id}
                data.push pojo
            db.batchSync data, (err, savedOne, infos) ->
                expect(err).to.be.null
                query = {}
                query["#{f.foo}->#{f.title}"] = "1"
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 8
                    expect(item[f.foo]._uri for item in results).to.include.members(
                        "http://example.org/embeded#{i}" for i in [1, 3, 5, 7, 9, 11, 13, 15]
                    )
                    done()

        it 'should be able to query model fields and relations fields', (done) ->
            db.count (err, total) ->
                embededs = []
                pojos = []
                for i in [1..15]
                    embeded = {_id: "http://example.org/embeded#{i}"}
                    embeded[f.index] = i
                    embeded[f.title] = "#{i%2}"
                    embededs.push embeded
                    pojo = {}
                    pojo[f.foo] = {_uri: embeded._id}
                    pojo[f.index] = i*2
                    pojos.push pojo
                db.batchSync embededs, (err, savedOne, infos) ->
                    expect(err).to.be.null
                    db.batchSync pojos, (err, savedOne, infos) ->
                        expect(err).to.be.null
                        query = {}
                        query["#{f.foo}->#{f.title}"] = "1"
                        query[f.index] = {$gt: 10}
                        db.find query, (err, results) ->
                            db.find query, {limit: 100}, (err, results) ->
                                expect(err).to.be.null
                                expect(results.length).to.be.equal 5
                                expect(item[f.foo]._uri for item in results).to.include.members(
                                    "http://example.org/embeded#{i}" for i in [7, 9, 11, 13, 15]
                                )
                                done()


        it 'should be able to query relations fields [$gt]', (done) ->
            data = []
            for i in [1..15]
                embeded = {_id: "http://example.org/embeded#{i}"}
                embeded[f.index] = i
                embeded[f.title] = "#{i%2}"
                data.push embeded
                pojo = {}
                pojo[f.foo] = {_uri: embeded._id}
                data.push pojo
            db.batchSync data, (err, savedOne, infos) ->
                expect(err).to.be.null
                query = {}
                query["#{f.foo}->#{f.index}"] = {$gt: 7}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 8
                    expect(item[f.foo]._uri for item in results).to.include.members(
                        "http://example.org/embeded#{i}" for i in [8...15]
                    )
                    done()
