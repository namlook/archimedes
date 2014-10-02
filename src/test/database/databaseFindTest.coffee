
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

_ = require 'underscore'
config = require('../config')

describe 'Database.find()', ()->

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

    describe '.find(id)', () ->
        it 'should return the doc that match the id [literal]', (done) ->
            pojo = {_type: 'Test'}
            pojo[f.title] = 'bar'
            pojo[f.index] = 2
            pojo[f.foo] = true
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                db.find {_id: obj._id, _type: 'Test'}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0][f.title]).to.be.equal pojo[f.title]
                    expect(results[0][f.index]).to.be.equal pojo[f.index]
                    expect(Boolean results[0][f.foo]).to.be.equal pojo[f.foo]
                    expect(results[0]._id).to.be.equal obj._id
                    done()

    describe '.find(ids)', () ->
        it 'should return the docs that match the ids', (done) ->
            pojo = {_type: 'Test'}
            pojo[f.title] = 'bar'
            pojo[f.index] = 2
            pojo[f.foo] = true
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                pojo2 = {_type: 'Test'}
                pojo2[f.title] = 'foo'
                pojo2[f.index]= 3
                pojo2[f.foo]= false
                db.sync pojo2, (err, obj2, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true
                    expect(obj2._id).to.be.not.null
                    db.find {_id: [obj._id, obj2._id], _type:'Test'}, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 2
                        titles = (o[f.title] for o in results)
                        expect(titles).to.include.members ['bar', 'foo']
                        indexes = (o[f.index] for o in results)
                        expect(indexes).to.include.members [2, 3]
                        foos = (Boolean(o[f.foo]) for o in results)
                        expect(foos).to.include.members [false, true]
                        done()

        it 'should return the docs that match the ids with different types', (done) ->
            pojo = {_type: 'Test'}
            pojo[f.title] = 'bar'
            pojo[f.index] = 2
            pojo[f.foo] = true
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                pojo2 = {_type: 'Test2'}
                pojo2[f.title] = 'foo'
                pojo2[f.index]= 3
                pojo2[f.foo]= false
                db.sync pojo2, (err, obj2, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true
                    expect(obj2._id).to.be.not.null
                    db.find [{_id: obj._id, _type: 'Test'}, {_id: obj2._id, _type:'Test2'}], (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 2
                        titles = (o[f.title] for o in results)
                        expect(titles).to.include.members ['bar', 'foo']
                        indexes = (o[f.index] for o in results)
                        expect(indexes).to.include.members [2, 3]
                        foos = (Boolean(o[f.foo]) for o in results)
                        expect(foos).to.include.members [false, true]
                        done()

    describe '.find(query)', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = 2
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0][f.title]).to.be.equal 2
                    done()


        it 'should handle date', (done) ->
            pojo = {_type: 'Test'}
            pojo[f.title] = 12
            pojo[f.index] = new Date(2014, 1, 1).toISOString()
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                db.find {_id: obj._id, _type: 'Test'}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0][f.title]).to.be.equal pojo[f.title]
                    expect(results[0][f.index]).to.be.equal(pojo[f.index])
                    expect(results[0]._id).to.be.equal obj._id
                    done()

        it 'should handle _type', (done) ->
            pojos = []
            for i in [1..4]
                pojo = {_type: 'Pojo1'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            for i in [1..6]
                pojo = {_type: 'Pojo2'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                db.count {_type: 'Pojo1'}, (err, total) ->
                    expect(err).to.be.null
                    expect(total).to.be.equal 4
                    db.count {_type: 'Pojo2'}, (err, total) ->
                        expect(err).to.be.null
                        expect(total).to.be.equal 6
                        done()

    it 'should handle _id', (done) ->
        pojos = []
        for i in [1..5]
            pojo = {_type: 'Test', _id: 'ID'+i}
            pojo[f.title] = i
            pojo[f.index] = (if i % 2 is 0 then true else false)
            pojos.push pojo
        db.batchSync pojos, (err, results) ->
            expect(err).to.be.null
            query = {_type: 'Test', _id: 'ID2'}
            db.find query, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 1
                obj = results[0]
                expect(obj._id).to.be.equal 'ID2'
                expect(Boolean(obj[f.index])).to.be.equal true
                expect(obj[f.title]).to.be.equal 2
                done()


    describe 'query', () ->
        it 'should handle boolean', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = (if i % 2 is 0 then true else false)
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = true
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    expect(Boolean(r[f.index]) for r in results).to.include true
                    expect(Boolean(r[f.index]) for r in results).to.not.include false
                    done()

        it 'should handle date', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = new Date(2014, 1, i)
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = new Date(2014, 1, 3)
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    done()


    describe 'query[$gt]', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$gt: 2}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    done()

        it 'should return the docs that match a complex query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$gt: 2}
                query[f.index] = {$gt: 30}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()

        it 'should handle date', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = new Date(2014, 1, i)
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {'$gt': new Date(2014, 1, 3)}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()


    describe 'query[$gte]', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$gte: 2}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 4
                    done()

        it 'should return the docs that match a complex query [$gte]', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
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
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$lt: 2}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    done()

        it 'should return the docs that match a complex query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$gt: 2}
                query[f.index] = {$lt: 40}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    done()

        it 'should handle date', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = new Date(2014, 1, i)
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {'$lt': new Date(2014, 1, 4)}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    done()

    describe 'query[$lte]', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$lte: 2}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()

        it 'should return the docs that match a complex query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$gt: 2}
                query[f.index] = {$lte: 40}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()

        it 'should handle date', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = new Date(2014, 1, i)
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {'$lte': new Date(2014, 1, 3)}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    done()

    describe 'query[$year]', () ->

        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = new Date(Date.UTC(2000+(i*10), 0, 1))
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$year: 2030}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(new Date(results[0][f.index]).getFullYear()).to.be.equal 2030
                    done()

        it 'should return the docs that match a query with $gt', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = new Date(Date.UTC(2000+(i*10), 0, 1))
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$year: {$gt: 2030}}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()

        it 'should return the docs that match a query with $gt and $lt', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = new Date(Date.UTC(2000+(i*10), 0, 1))
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$year: {$gt: 2020, $lt: 2040}}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(new Date(results[0][f.index]).getFullYear()).to.be.equal 2030
                    done()


    describe 'query[$month]', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = new Date(Date.UTC(2000, i, 1))
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$month: 4}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(new Date(results[0][f.index]).getMonth()).to.be.equal 3
                    done()

        it 'should return the docs that match a simple query with $gt', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = new Date(Date.UTC(2000, i, 1))
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$month: {$gt: 4}}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()


    describe 'query[$ne]', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$ne: 2}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 4
                    done()

        it 'should return the docs that match a complex query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$ne: 2}
                query[f.index] = {$ne: 40}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    done()

        it 'should handle date', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = new Date(2014, 1, i)
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {'$ne': new Date(2014, 1, 3)}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 4
                    done()

    describe 'query[$exists]', () ->
        it 'should return the docs which field exists', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                if i%2 is 0
                    pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$exists: true}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()

        it 'should return the docs which field not exists', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                if i%2 is 0
                    pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$exists: false}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    done()

        it 'should return the docs which field exists with query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                if i%2 is 0
                    pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$exists: true}
                query[f.title] = {$in: [2, 3]}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    done()

    describe 'query[$regex]', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                title = if i%2 is 0 then 'bar' else 'foo'
                pojo[f.title] = "title #{i%2} #{i} #{title}"
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$regex: "^title 1"}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    query[f.title] = {$regex: 'bar$'}
                    db.find query, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 2
                        done()

        it 'should return the docs that match a simple query with triple quotes', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                title = if i%2 is 0 then 'bar' else 'foo'
                pojo[f.title] = "title\'\'\' #{i%2} #{i} #{title}"
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$regex: "^title''' 1"}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    query[f.title] = {$regex: 'bar$'}
                    db.find query, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 2
                        done()

    describe 'query[$iregex]', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                title = if i%2 is 0 then 'bar' else 'foo'
                pojo[f.title] = "Title #{i%2} #{i} #{title}"
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {$iregex: "^title 1"}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    query[f.title] = {$iregex: 'BAR$'}
                    db.find query, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 2
                        done()

    describe 'query multi-fields', () ->
        it 'should return the docs that match a simple query on a multi-fields', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = (j+i for j in [1..5])
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = 4
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    done()

        it 'should handle date', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = (new Date(2014, j, i) for j in [1..5])
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = new Date(2014, 1, 1)
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0][f.title]).to.be.equal 1
                    expect(new Date(i).toISOString() for i in results[0][f.index])
                      .to.include new Date(2014, 1, 1).toISOString()
                    done()

        it 'should handle date [$ne]', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = (new Date(2014, j, i) for j in [1..5])
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {'$gt': new Date(2014, 5, 1)}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 4
                    done()

        it 'should handle simple query [$all]', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = (i*j for j in [1..5])
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$all: [2, 4]}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()


        it 'should handle simple query [$nall]', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = (i*j for j in [1..5])
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$nall: [2, 4]}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    done()

        it 'should handle simple query [$in]', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = (i*j for j in [1..5])
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$in: [2, 4]}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    done()

        it 'should handle simple query [$nin]', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = (i*j for j in [1..5])
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {$nin: [2, 4]}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()

    describe 'query i18n-fields', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = {'en': "#{i}", 'fr': "#{i*3}"}
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title+'@en'] = "4"
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0][f.title].en).to.be.equal '4'
                    expect(results[0][f.title].fr).to.be.equal '12'
                    done()

        it 'should return an error if the value is not a string', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = {'en': i, 'fr': i*3}
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                if db.type is 'rdf'
                    expect(err).to.be.equal 'i18n fields accept only strings'
                else
                    expect(err).to.be.equal null
                done()

    describe 'query i18n-multi fields', () ->
        it 'should return the docs that match a simple query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = {'en': [], 'fr': []}
                pojo[f.title]['en'] = ("#{i+j}" for j in [1..5])
                pojo[f.title]['fr'] = ("#{i*j}" for j in [1..5])
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title+'@fr'] = "10"
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()

        it 'should return an error if the value is not a string', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = {'en': i, 'fr': i*3}
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                if db.type is 'rdf'
                    expect(err).to.be.equal 'i18n fields accept only strings'
                else
                    expect(err).to.be.equal null
                done()


    describe 'other', () ->
        it 'should return the complex changed pojo', (done) ->
            pojo = {_type: 'Test'}
            pojo[f.title] = {en: 'foo', fr: 'toto'}
            pojo[f.index] = [1, 2, 3]
            pojo[f.foo] = {en: ['hello', 'hi'], fr: ['bonjour', 'salut']}

            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj[f.title].en).to.be.equal 'foo'
                expect(obj[f.title].fr).to.be.equal 'toto'
                expect(obj[f.index]).to.include.members [1, 2, 3]
                expect(obj._id).to.be.not.null

                obj[f.title].en = 'changed'
                obj[f.index].push 'changed'
                obj[f.foo].en[0] = 'changed'

                db.sync obj, (err, newobj, infos) ->
                    expect(err).to.be.null

                    expect(infos.dbTouched).to.be.true
                    expect(newobj[f.title].fr).to.be.equal 'toto'
                    expect(newobj[f.title].en).to.be.equal 'changed'
                    expect(newobj[f.index]).to.include.members [1, 2, 3, 'changed']
                    expect(newobj[f.foo].en).to.include.members ['changed', 'hi']
                    expect(newobj[f.foo].en).to.not.include 'hello'
                    expect(newobj[f.foo].fr).to.include.members ['bonjour', 'salut']
                    expect(newobj._id).to.be.equal obj._id

                    db.first {_id: newobj._id, _type: 'Test'}, (err, obj3) ->
                        expect(err).to.be.null
                        expect(obj3[f.title].fr).to.be.equal 'toto'
                        expect(obj3[f.title].en).to.be.equal 'changed'
                        expect(obj3[f.index]).to.include.members [1, 2, 3, 'changed']
                        expect(obj3[f.foo].en).to.include.members ['changed', 'hi']
                        expect(newobj[f.foo].en).to.not.include 'hello'
                        expect(obj3[f.foo].fr).to.include.members ['bonjour', 'salut']
                        expect(obj3._id).to.be.equal newobj._id

                        db.count (err, count) ->
                            expect(err).to.be.null
                            expect(count).to.be.equal 1
                            done()

    describe 'query on the same field with multiple operators', () ->
        it 'should be able to combine $nin and $ne', (done) ->
            pojos = []
            for i in [1..15]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i%3
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {'$nin': [2,1], '$ne': 1}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 5
                    expect(i[f.index] for i in results).to.include.members [0]
                    done()

        it 'should be able to combine $lt, $gt and $ne', (done) ->
            pojos = []
            for i in [1..15]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i%3
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.index] = {'$gt': 0, '$lt': 3, '$ne': 2}
                db.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 5
                    expect(i[f.index] for i in results).to.include.members [1]
                    done()


    describe '.first(id)', () ->
        it 'should return the doc that match the id', (done) ->
            pojo = {_type: 'Test'}
            pojo[f.title] = 'bar'
            pojo[f.index] = 2
            pojo[f.foo] = true
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                db.first {_id: obj._id, _type: 'Test'}, (err, doc) ->
                    expect(err).to.be.null
                    expect(doc[f.title]).to.be.equal pojo[f.title]
                    expect(doc[f.index]).to.be.equal pojo[f.index]
                    expect(Boolean doc[f.foo]).to.be.equal pojo[f.foo]
                    expect(doc._id).to.be.equal obj._id
                    done()

    describe '.first(query)', () ->
        it 'should return the first doc that match the query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i*10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                query = {_type: 'Test'}
                query[f.title] = {'$gt': 2}
                db.first query, (err, doc) ->
                    expect(err).to.be.null
                    expect(doc[f.title]).to.be.gt 2
                    expect(doc[f.index]).to.be.gt 20
                    done()


