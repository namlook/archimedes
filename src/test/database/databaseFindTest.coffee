
expect = require('chai').expect
_ = require 'underscore'
config = require('../config')

describe 'Database.find()', ()->

    db = config.Database()

    f = {
        title: "#{config.nsprop}title"
        index: "#{config.nsprop}index"
        foo: "#{config.nsprop}foo"
    }

    beforeEach (done) ->
        db.clear done

    describe '.find(id)', () ->
        it 'should return the doc that match the id [literal]', (done) ->
            pojo = {}
            pojo[f.title] = 'bar'
            pojo[f.index] = 2
            pojo[f.foo] = true
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                db.find obj._id, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0][f.title]).to.be.equal pojo[f.title]
                    expect(results[0][f.index]).to.be.equal pojo[f.index]
                    expect(Boolean results[0][f.foo]).to.be.equal pojo[f.foo]
                    expect(results[0]._id).to.be.equal obj._id
                    done()

    describe '.find(ids)', () ->
        it 'should return the docs that match the ids', (done) ->
            pojo = {}
            pojo[f.title] = 'bar'
            pojo[f.index] = 2
            pojo[f.foo] = true
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                pojo2 = {}
                pojo2[f.title] = 'foo'
                pojo2[f.index]= 3
                pojo2[f.foo]= false
                db.sync pojo2, (err, obj2, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true
                    expect(obj2._id).to.be.not.null
                    db.find [obj._id, obj2._id], (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 2
                        titles = (o[f.title] for o in results)
                        expect(titles).to.include 'bar', 'foo'
                        indexes = (o[f.index] for o in results)
                        expect(indexes).to.include 2, 3
                        foos = (Boolean(o[f.foo]) for o in results)
                        expect(foos).to.include false, true
                        done()

    describe '.find(query)', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {}
                query[f.title] = 2
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    done()


    describe 'query[$gt]', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {}
                query[f.title] = {$gt: 2}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    done()

        it 'should return the docs that match a complex query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {}
                query[f.title] = {$gt: 2}
                query[f.index] = {$gt: 30}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()

    describe 'query[$gte]', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {}
                query[f.title] = {$gte: 2}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 4
                    done()

        it 'should return the docs that match a complex query [$gte]', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {}
                query[f.title] = {$gte: 2}
                query[f.index] = {$gte: 30}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    done()


    describe 'query[$lt]', () ->
        it 'should return the docs that match a simple query [$lt]', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {}
                query[f.title] = {$lt: 2}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    done()

        it 'should return the docs that match a complex query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {}
                query[f.title] = {$gt: 2}
                query[f.index] = {$lt: 40}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    done()

    describe 'query[$lte]', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {}
                query[f.title] = {$lte: 2}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()

        it 'should return the docs that match a complex query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {}
                query[f.title] = {$gt: 2}
                query[f.index] = {$lte: 40}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()



    describe 'other', () ->
        it 'should return the complex changed pojo', (done) ->
            pojo = {}
            pojo[f.title] = {en: 'foo', fr: 'toto'}
            pojo[f.index] = [1, 2, 3]
            pojo[f.foo] = {en: ['hello', 'hi'], fr: ['bonjour', 'salut']}

            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj[f.title].en).to.be.equal 'foo'
                expect(obj[f.title].fr).to.be.equal 'toto'
                expect(obj[f.index]).to.include 1, 2, 3
                expect(obj._id).to.be.not.null

                obj[f.title].en = 'changed'
                obj[f.index].push 'changed'
                obj[f.foo].en[0] = 'changed'

                db.sync obj, (err, newobj, infos) ->
                    expect(err).to.be.null

                    console.log '....', newobj

                    expect(infos.dbTouched).to.be.true
                    expect(newobj[f.title].fr).to.be.equal 'toto'
                    expect(newobj[f.title].en).to.be.equal 'changed'
                    expect(newobj[f.index]).to.include 1, 2, 3, 'changed'
                    expect(newobj[f.foo].en[0]).to.be.equal 'changed'
                    expect(newobj[f.foo].fr[0]).to.be.equal 'bonjour'
                    expect(newobj._id).to.be.equal obj._id

                    db.first newobj._id, (err, obj3) ->
                        expect(err).to.be.null
                        console.log '=====', obj3 # TODO insert @en lang
                        expect(obj3[f.title].fr).to.be.equal 'toto'
                        expect(obj3[f.title].en).to.be.equal 'changed'
                        expect(obj3[f.index]).to.include 1, 2, 3, 'changed'
                        expect(obj3[f.foo].en[0]).to.be.equal 'changed'
                        expect(obj3[f.foo].fr[0]).to.be.equal 'bonjour'
                        expect(obj3._id).to.be.equal newobj._id

                        db.count (err, count) ->
                            expect(err).to.be.null
                            expect(count).to.be.equal 1
                            done()


    describe '.first(id)', () ->
        it 'should return the doc that match the id', (done) ->
            pojo = {}
            pojo[f.title] = 'bar'
            pojo[f.index] = 2
            pojo[f.foo] = true
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                db.first obj._id, (err, doc) ->
                    expect(err).to.be.null
                    expect(doc[f.title]).to.be.equal pojo[f.title]
                    expect(doc[f.index]).to.be.equal pojo[f.index]
                    expect(Boolean doc[f.foo]).to.be.equal pojo[f.foo]
                    expect(doc._id).to.be.equal pojo._id
                    done()

    describe '.first(query)', () ->
        it 'should return the first doc that match the query', (done) ->
            pojos = [
                {title: 1, index: 10}
                {title: 2, index: 20}
                {title: 3, index: 30}
                {title: 4, index: 40}
                {title: 5, index: 50}
            ]
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                db.first {title: {$gt: 2}}, (err, doc) ->
                    expect(err).to.be.null
                    expect(doc.title).to.be.gt 2
                    expect(doc.index).to.be.gt 20
                    done()


