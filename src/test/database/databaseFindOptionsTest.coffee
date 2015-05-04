
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

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
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i * 10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {_type: 'Test'}, {limit: 2}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    done()


    describe '.find(offset)', () ->
        it 'should skip a certain number of docs', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i * 10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {_type: 'Test'}, {offset: 2, sortBy: f.title, orderBy: 'asc'}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    expect(results[0][f.title]).to.be.equal 3
                    done()


    describe '.find(fields)', () ->
        it 'should return only the value from specified fields (single field)', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i * 10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {_type: 'Test'}, {fields: f.title}, (err, results) ->
                    expect(err).to.be.null
                    for item in results
                        expect(item[f.title]).to.exist
                        expect(item[f.index]).to.not.exist
                    done()

        it 'should return only the value from specified fields (multiple fields)', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i * 10
                pojo[f.foo] = i + 10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {_type: 'Test'}, {fields: [f.title, f.index]}, (err, results) ->
                    expect(err).to.be.null
                    for item in results
                        expect(item[f.title]).to.exist
                        expect(item[f.index]).to.exist
                        expect(item[f.foo]).to.not.exist
                    done()

    describe '.find(sortBy)', () ->
        it 'should sort the results in asc order by default', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i * 10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {}, {sortBy: f.title}, (err, results) ->
                    expect(err).to.be.null
                    expect(results[0][f.title]).to.be.equal 1
                    expect(results[1][f.title]).to.be.equal 2
                    expect(results[2][f.title]).to.be.equal 3
                    expect(results[3][f.title]).to.be.equal 4
                    expect(results[4][f.title]).to.be.equal 5
                    done()

        it 'should sort the results in desc order', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i * 10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {}, {sortBy: '-'+f.title}, (err, results) ->
                    expect(err).to.be.null
                    expect(results[0][f.title]).to.be.equal 5
                    expect(results[1][f.title]).to.be.equal 4
                    expect(results[2][f.title]).to.be.equal 3
                    expect(results[3][f.title]).to.be.equal 2
                    expect(results[4][f.title]).to.be.equal 1
                    done()

        it 'should sort the results by multiple field', (done) ->
            pojos = []
            for i in [1..10]
                pojo = {_type: 'Test'}
                pojo[f.title] = i%2
                pojo[f.index] = i
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 10
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {}, {sortBy: [f.title, f.index]}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 10
                    expect(results[0][f.title]).to.be.equal 0
                    expect(results[0][f.index]).to.be.equal 2
                    expect(results[1][f.title]).to.be.equal 0
                    expect(results[1][f.index]).to.be.equal 4
                    expect(results[2][f.title]).to.be.equal 0
                    expect(results[2][f.index]).to.be.equal 6
                    expect(results[3][f.title]).to.be.equal 0
                    expect(results[3][f.index]).to.be.equal 8
                    expect(results[4][f.title]).to.be.equal 0
                    expect(results[4][f.index]).to.be.equal 10

                    expect(results[5][f.title]).to.be.equal 1
                    expect(results[5][f.index]).to.be.equal 1
                    expect(results[6][f.title]).to.be.equal 1
                    expect(results[6][f.index]).to.be.equal 3
                    expect(results[7][f.title]).to.be.equal 1
                    expect(results[7][f.index]).to.be.equal 5
                    expect(results[8][f.title]).to.be.equal 1
                    expect(results[8][f.index]).to.be.equal 7
                    expect(results[9][f.title]).to.be.equal 1
                    expect(results[9][f.index]).to.be.equal 9
                    done()

        it 'should sort the results by multiple field in different order', (done) ->
            pojos = []
            for i in [1..10]
                pojo = {_type: 'Test'}
                pojo[f.title] = i%2
                pojo[f.index] = i
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 10
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {}, {sortBy: [f.title, '-'+f.index]}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 10
                    expect(results[0][f.title]).to.be.equal 0
                    expect(results[0][f.index]).to.be.equal 10
                    expect(results[1][f.title]).to.be.equal 0
                    expect(results[1][f.index]).to.be.equal 8
                    expect(results[2][f.title]).to.be.equal 0
                    expect(results[2][f.index]).to.be.equal 6
                    expect(results[3][f.title]).to.be.equal 0
                    expect(results[3][f.index]).to.be.equal 4
                    expect(results[4][f.title]).to.be.equal 0
                    expect(results[4][f.index]).to.be.equal 2

                    expect(results[5][f.title]).to.be.equal 1
                    expect(results[5][f.index]).to.be.equal 9
                    expect(results[6][f.title]).to.be.equal 1
                    expect(results[6][f.index]).to.be.equal 7
                    expect(results[7][f.title]).to.be.equal 1
                    expect(results[7][f.index]).to.be.equal 5
                    expect(results[8][f.title]).to.be.equal 1
                    expect(results[8][f.index]).to.be.equal 3
                    expect(results[9][f.title]).to.be.equal 1
                    expect(results[9][f.index]).to.be.equal 1
                    done()

        it 'should sort the results by multiple field even if a sorting field is not present in documents', (done) ->
            pojos = []
            for i in [1..10]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i%2
                if i%3 is 0
                    pojo[f.foo] = i+0.5
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 10
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                query = {}
                query[f.index] = 0
                db.find query, {sortBy: ['-'+f.foo, f.title]}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 5
                    expect(results[0][f.title]).to.be.equal 6
                    expect(results[0][f.index]).to.be.equal 0
                    expect(results[0][f.foo]).to.be.equal 6.5
                    expect(results[1][f.title]).to.be.equal 2
                    expect(results[1][f.index]).to.be.equal 0
                    expect(results[2][f.title]).to.be.equal 4
                    expect(results[2][f.index]).to.be.equal 0
                    expect(results[3][f.title]).to.be.equal 8
                    expect(results[3][f.index]).to.be.equal 0
                    expect(results[4][f.title]).to.be.equal 10
                    expect(results[4][f.index]).to.be.equal 0
                    done()

        it 'should sort the results by multiple field in different order with query', (done) ->
            pojos = []
            for i in [1..10]
                pojo = {_type: 'Test'}
                pojo[f.title] = i%2
                pojo[f.index] = i
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 10
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                query = {_type: 'Test'}
                query[f.index] = {$gt: 3}
                db.find query, {sortBy: [f.title, '-'+f.index]}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 7
                    expect(results[0][f.title]).to.be.equal 0
                    expect(results[0][f.index]).to.be.equal 10

                    expect(results[1][f.title]).to.be.equal 0
                    expect(results[1][f.index]).to.be.equal 8

                    expect(results[2][f.title]).to.be.equal 0
                    expect(results[2][f.index]).to.be.equal 6

                    expect(results[3][f.title]).to.be.equal 0
                    expect(results[3][f.index]).to.be.equal 4

                    expect(results[4][f.title]).to.be.equal 1
                    expect(results[4][f.index]).to.be.equal 9

                    expect(results[5][f.title]).to.be.equal 1
                    expect(results[5][f.index]).to.be.equal 7

                    expect(results[6][f.title]).to.be.equal 1
                    expect(results[6][f.index]).to.be.equal 5
                    done()

        it 'should sort the results by i18n field in asc order', (done) ->
            pojos = []
            for i in [5..1]
                pojo = {_type: 'Test'}
                pojo[f.title] = {en: "#{i}", fr: "#{i%2}"}
                pojo[f.index] = {en: "#{i * 10}"}
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {}, {sortBy: [f.title+'@fr']}, (err, results) ->
                    expect(err).to.be.null
                    expect(results[0][f.title].fr).to.be.equal "0"
                    expect(results[1][f.title].fr).to.be.equal "0"
                    expect(results[2][f.title].fr).to.be.equal "1"
                    expect(results[3][f.title].fr).to.be.equal "1"
                    expect(results[4][f.title].fr).to.be.equal "1"
                    done()


        it 'should sort the results by i18n field in desc order', (done) ->
            pojos = []
            for i in [5..1]
                pojo = {_type: 'Test'}
                pojo[f.title] = {en: "#{i}", fr: "#{i%2}"}
                pojo[f.index] = {en: "#{i * 10}"}
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {}, {sortBy: ['-'+f.title+'@fr']}, (err, results) ->
                    expect(err).to.be.null
                    expect(results[0][f.title].fr).to.be.equal "1"
                    expect(results[1][f.title].fr).to.be.equal "1"
                    expect(results[2][f.title].fr).to.be.equal "1"
                    expect(results[3][f.title].fr).to.be.equal "0"
                    expect(results[4][f.title].fr).to.be.equal "0"
                    done()

        it 'should sort the results by i18n fields in different order with query', (done) ->
            pojos = []
            for i in [5..1]
                pojo = {_type: 'Test'}
                pojo[f.title] = {en: "#{i}", fr: "#{i%2}"}
                pojo[f.index] = {en: "#{i * 10}"}
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {}, {sortBy: [f.title+'@fr', '-'+f.title+'@en']}, (err, results) ->
                    expect(err).to.be.null
                    expect(results[0][f.title].fr).to.be.equal "0"
                    expect(results[0][f.title].en).to.be.equal "4"

                    expect(results[1][f.title].fr).to.be.equal "0"
                    expect(results[1][f.title].en).to.be.equal "2"

                    expect(results[2][f.title].fr).to.be.equal "1"
                    expect(results[2][f.title].en).to.be.equal "5"

                    expect(results[3][f.title].fr).to.be.equal "1"
                    expect(results[3][f.title].en).to.be.equal "3"

                    expect(results[4][f.title].fr).to.be.equal "1"
                    expect(results[4][f.title].en).to.be.equal "1"

                    done()


        it.skip 'should sort the results when passing _id in query', (done) ->
            pojos = []
            for i in [1..5]
                pojo = {_type: 'Test'}
                pojo[f.title] = i
                pojo[f.index] = i * 10
                pojos.push pojo
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.find {_id: (i.result._id for i in results)}, {sortBy: '-'+f.title}, (err, results) ->
                    expect(err).to.be.null
                    expect(results[0][f.title]).to.be.equal 5
                    expect(results[1][f.title]).to.be.equal 4
                    expect(results[2][f.title]).to.be.equal 3
                    expect(results[3][f.title]).to.be.equal 2
                    expect(results[4][f.title]).to.be.equal 1
                    done()
