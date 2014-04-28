
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

_ = require 'underscore'
config = require('../config')
db = config.Database()

if db.type isnt 'rdf'
    console.log "Database is not an RDF database (got #{db.type}). Skipping..."
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
                embeded = {_id: i, _type: 'Embed'}
                embeded[f.index] = i
                embeded[f.title] = "#{i%2}"
                data.push embeded
                pojo = {_type: 'Pojo'}
                pojo[f.foo] = {_ref: "http://data.example.org/embed/#{i}"}
                data.push pojo
            db.batchSync data, (err, savedOne, infos) ->
                expect(err).to.be.null
                query = {_type: 'Pojo'}
                query["#{f.foo}->#{f.title}"] = "1"
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 8
                    expect(item[f.foo]._ref for item in results).to.include.members(
                        "http://data.example.org/embed/#{i}" for i in [1, 3, 5, 7, 9, 11, 13, 15]
                    )
                    done()

        it 'should be able to query model fields and relations fields', (done) ->
            embededs = []
            pojos = []
            for i in [1..15]
                embeded = {_id: i, _type: 'Embed'}
                embeded[f.index] = i
                embeded[f.title] = "#{i%2}"
                embededs.push embeded
                pojo = {_type: 'Pojo'}
                pojo[f.foo] = {_ref: "http://data.example.org/embed/#{i}"}
                pojo[f.index] = i*2
                pojos.push pojo
            db.batchSync embededs, (err, savedOne, infos) ->
                expect(err).to.be.null
                db.batchSync pojos, (err, savedOne, infos) ->
                    expect(err).to.be.null
                    query = {_type: 'Pojo'}
                    query["#{f.foo}->#{f.title}"] = "1"
                    query[f.index] = {$gt: 10}
                    db.find query, (err, results) ->
                        expect(err).to.be.null
                        db.find query, (err, results) ->
                            expect(err).to.be.null
                            expect(results.length).to.be.equal 5
                            expect(item[f.foo]._ref for item in results).to.include.members(
                                "http://data.example.org/embed/#{i}" for i in [7, 9, 11, 13, 15]
                            )
                            done()


        it 'should be able to query relations fields [$gt]', (done) ->
            data = []
            for i in [1..15]
                embeded = {_id: i, _type: 'Embed'}
                embeded[f.index] = i
                embeded[f.title] = "#{i%2}"
                data.push embeded
                pojo = {_type: 'Pojo'}
                pojo[f.foo] = {_ref: "http://data.example.org/embed/#{i}"}
                data.push pojo
            db.batchSync data, (err, savedOne, infos) ->
                expect(err).to.be.null
                query = {}
                query["#{f.foo}->#{f.index}"] = {$gt: 7}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 8
                    expect(item[f.foo]._ref for item in results).to.include.members(
                        "http://data.example.org/embed/#{i}" for i in [8...15]
                    )
                    done()


    describe '[sort]', () ->
        it "should able to sort results via an embed model's field", (done) ->
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
                query["#{f.foo}->#{f.title}"] = "1"
                query[f.index] = {$gt: 10}
                options = {sortBy: ["#{f.foo}->#{f.index}"]}
                db.find query, options, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 5
                    expect(item[f.foo]._ref for item in results).to.include.members(
                        "http://data.example.org/embed/#{i}" for i in [7, 9, 11, 13, 15]
                    )
                    done()

