
expect = require('chai').expect
_ = require 'underscore'
config = require('../config')

describe 'model.find', ()->

    models = {}

    class models.Literal extends config.Model
        schema:
            string:
                type: 'string'
            integer:
                type: 'integer'
            date:
                type: 'date'


    class models.Multi extends config.Model
        schema:
            string:
                type: 'string'
                multi: true
            integer:
                type: 'integer'
                multi: true
            date:
                type: 'date'
                multi: true

    class models.I18n extends config.Model
        schema:
            string:
                type: 'string'
                i18n: true
            strings:
                type: 'string'
                i18n: true
                multi: true

    badmodels = {}

    class badmodels.BadI18n extends config.Model
        schema:
            integer:
                type: 'integer'
                i18n: true


    db = config.Database()
    db.registerModels models

    beforeEach (done) ->
        db.clear done

    describe '[literal]', () ->
        it 'should return the doc that match the id', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj.save (err, savedObj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.id).to.be.not.null
                db.Literal.find savedObj.id, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].get 'string').to.be.equal obj.get 'string'
                    expect(results[0].get 'integer').to.be.equal obj.get 'integer'
                    expect(results[0].get('date').toISOString()).to.be.equal(
                        obj.get('date').toISOString())
                    done()

        it 'should return the first doc that match the id', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj.save (err, savedObj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.id).to.be.not.null
                db.Literal.first savedObj.id, (err, result) ->
                    expect(err).to.be.null
                    expect(result.get 'string').to.be.equal obj.get 'string'
                    expect(result.get 'integer').to.be.equal obj.get 'integer'
                    expect(result.get('date').toISOString()).to.be.equal(
                        obj.get('date').toISOString())
                    done()

        it 'should return all saved docs', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = (i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut'
                    done()

        it 'should query the docs (equal op)', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: 2}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].get 'string').to.be.equal 'hello'
                    done()

        it 'should query the docs ($gt)', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$gt: 2}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].get 'string').to.be.equal 'salut'
                    done()


        it 'should query the docs ($gte)', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$gte: 2}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = (i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut'
                    done()

        it 'should query the docs ($lt)', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$lt: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = (i.get('string') for i in results)
                    expect(results[0].get 'string').to.be.equal 'hello'
                    done()

        it 'should query the docs ($lte)', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$lte: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = (i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut'
                    done()

        it 'should query the docs ($in)', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$in: [2, 3, 4]}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = (i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut'
                    done()

        it 'should query the docs ($nin)', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$nin: [1, 4]}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = (i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut'
                    db.Literal.find {integer: {$nin: [2, 3]}}, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 0
                        done()


        it 'should query the docs ($and)', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                query = {$and: [{integer: 2}, {integer: 3}]}
                db.Literal.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 0
                    done()


        it 'should query the docs ($ne)', (done) ->
            obj = new db.Literal
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$ne: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = (i.get('string') for i in results)
                    expect(results[0].get 'string').to.be.equal 'hello'
                    done()


    describe '[multi]', () ->
        it 'should return the doc that match the id', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj.save (err, savedObj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.id).to.be.not.null
                db.Multi.find savedObj.id, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get 'string').to.include 'hello', 'salut'
                    expect(result.get 'integer').to.include 1, 2, 3
                    expect(d.toISOString() for d in result.get('date')).to.include(
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                    )
                    done()

        it 'should return the first doc that match the id', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj.save (err, savedObj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.id).to.be.not.null
                db.Multi.first savedObj.id, (err, result) ->
                    expect(err).to.be.null
                    expect(result.get 'string').to.include 'hello', 'salut'
                    expect(result.get 'integer').to.include 1, 2, 3
                    expect(d.toISOString() for d in result.get('date')).to.include(
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                    )
                    done()


        it 'should return all saved docs', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj2 = new db.Multi
            obj2.push 'string', 'hi'
            obj2.push 'string', 'salut'
            obj2.set 'integer', [3, 4, 5]
            obj2.push 'date', new Date(2014, 2, 1)
            obj2.push 'date', new Date(2014, 3, 1)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut', 'hi'
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include 1, 2, 3, 4, 5
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include(
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    )
                    done()


        it 'should query the docs (equal op)', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj2 = new db.Multi
            obj2.push 'string', 'hi'
            obj2.push 'string', 'salut'
            obj2.set 'integer', [3, 4, 5]
            obj2.push 'date', new Date(2014, 2, 1)
            obj2.push 'date', new Date(2014, 3, 1)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {'string': 'hi'}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include 'salut', 'hi'
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include 3, 4, 5
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include(
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    )
                    done()

        it 'should query the docs (2) (equal op)', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj2 = new db.Multi
            obj2.push 'string', 'hi'
            obj2.push 'string', 'salut'
            obj2.set 'integer', [3, 4, 5]
            obj2.push 'date', new Date(2014, 2, 1)
            obj2.push 'date', new Date(2014, 3, 1)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {integer: 3}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut', 'hi'
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include 1, 2, 3, 4, 5
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include(
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    )
                    done()

        it 'should query the docs ($gt)', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj2 = new db.Multi
            obj2.push 'string', 'hi'
            obj2.push 'string', 'salut'
            obj2.set 'integer', [3, 4, 5]
            obj2.push 'date', new Date(2014, 2, 1)
            obj2.push 'date', new Date(2014, 3, 1)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {integer: {$gt: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include 'salut', 'hi'
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include 3, 4, 5
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include(
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    )
                    done()

        it 'should query the docs ($gte)', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj2 = new db.Multi
            obj2.push 'string', 'hi'
            obj2.push 'string', 'salut'
            obj2.set 'integer', [3, 4, 5]
            obj2.push 'date', new Date(2014, 2, 1)
            obj2.push 'date', new Date(2014, 3, 1)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {integer: {$gte: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut', 'hi'
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include 1, 2, 3, 4, 5
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include(
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    )
                    done()


        it 'should query the docs ($lt)', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj2 = new db.Multi
            obj2.push 'string', 'hi'
            obj2.push 'string', 'salut'
            obj2.set 'integer', [3, 4, 5]
            obj2.push 'date', new Date(2014, 2, 1)
            obj2.push 'date', new Date(2014, 3, 1)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {integer: {$lt: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut'
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include 1, 2, 3
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include(
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                    )
                    done()


        it 'should query the docs ($lte)', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj2 = new db.Multi
            obj2.push 'string', 'hi'
            obj2.push 'string', 'salut'
            obj2.set 'integer', [3, 4, 5]
            obj2.push 'date', new Date(2014, 2, 1)
            obj2.push 'date', new Date(2014, 3, 1)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {integer: {$lte: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut', 'hi'
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include 1, 2, 3, 4, 5
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include(
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    )
                    done()

        it 'should query the docs ($in)', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj2 = new db.Multi
            obj2.push 'string', 'hi'
            obj2.push 'string', 'salut'
            obj2.set 'integer', [3, 4, 5]
            obj2.push 'date', new Date(2014, 2, 1)
            obj2.push 'date', new Date(2014, 3, 1)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {string: {$in: ['salut', 'hi', 'foo']}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut', 'hi'
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include 1, 2, 3, 4, 5
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include(
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    )
                    done()

        it 'should query the docs ($nin)', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj2 = new db.Multi
            obj2.push 'string', 'hi'
            obj2.push 'string', 'salut'
            obj2.set 'integer', [3, 4, 5]
            obj2.push 'date', new Date(2014, 2, 1)
            obj2.push 'date', new Date(2014, 3, 1)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {integer: {$nin: [0, 6, 7]}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include 'hello', 'salut', 'hi'
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include 1, 2, 3, 4, 5
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include(
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    )
                    db.Multi.find {string: {$nin: ['hello', 'hi']}}, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 0
                        done()

        it 'should query the docs ($and)', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj2 = new db.Multi
            obj2.push 'string', 'hi'
            obj2.push 'string', 'salut'
            obj2.set 'integer', [3, 4, 5]
            obj2.push 'date', new Date(2014, 2, 1)
            obj2.push 'date', new Date(2014, 3, 1)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                query = {$and: [{string: 'salut'}, {string: 'hi'}]}
                db.Multi.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include 'salut', 'hi'
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include 3, 4, 5
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include(
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    )
                    done()


        it 'should query the docs ($ne)', (done) ->
            obj = new db.Multi
            obj.push 'string', 'hello'
            obj.push 'string', 'salut'
            obj.set 'integer', [1, 2, 3]
            obj.push 'date', new Date(2014, 1, 1)
            obj.push 'date', new Date(2014, 2, 1)
            obj2 = new db.Multi
            obj2.push 'string', 'hi'
            obj2.push 'string', 'salut'
            obj2.set 'integer', [3, 4, 5]
            obj2.push 'date', new Date(2014, 2, 1)
            obj2.push 'date', new Date(2014, 3, 1)
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {string: {$ne: 'hello'}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include 'salut', 'hi'
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include 3, 4, 5
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include(
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    )
                   db.Multi.find {string: {$ne: 'salut'}}, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 0
                        done()


    describe '[i18n]', () ->
        it 'should return the doc that match the id', (done) ->
            obj = new db.I18n
            obj.set 'string', 'hello', 'en'
            obj.set 'string', 'salut', 'fr'
            obj.push 'strings', 'foo', 'en'
            obj.push 'strings', 'bar', 'en'
            obj.push 'strings', 'toto', 'fr'
            obj.push 'strings', 'tata', 'fr'
            obj.save (err, savedObj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.id).to.be.not.null
                db.I18n.find savedObj.id, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get 'string', 'en').to.equal 'hello'
                    expect(result.get 'string', 'fr').to.equal 'salut'
                    expect(result.get 'strings', 'en').to.include 'foo', 'bar'
                    expect(result.get 'strings', 'fr').to.include 'toto', 'tata'
                    done()


        it 'should return the first doc that match the id', (done) ->
            obj = new db.I18n
            obj.set 'string', 'hello', 'en'
            obj.set 'string', 'salut', 'fr'
            obj.push 'strings', 'foo', 'en'
            obj.push 'strings', 'bar', 'en'
            obj.push 'strings', 'toto', 'fr'
            obj.push 'strings', 'tata', 'fr'
            obj.save (err, savedObj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.id).to.be.not.null
                db.I18n.first savedObj.id, (err, result) ->
                    expect(err).to.be.null
                    expect(result.get 'string', 'en').to.equal 'hello'
                    expect(result.get 'string', 'fr').to.equal 'salut'
                    expect(result.get 'strings', 'en').to.include 'foo', 'bar'
                    expect(result.get 'strings', 'fr').to.include 'toto', 'tata'
                    done()

        it 'should return the all saved docs', (done) ->
            obj = new db.I18n
            obj.set 'string', 'hello', 'en'
            obj.set 'string', 'salut', 'fr'
            obj.push 'strings', 'foo', 'en'
            obj.push 'strings', 'bar', 'en'
            obj.push 'strings', 'toto', 'fr'
            obj.push 'strings', 'tata', 'fr'
            obj2 = new db.I18n
            obj2.set 'string', 'goodbye', 'en'
            obj2.set 'string', 'au revoir', 'fr'
            obj2.push 'strings', 'blah', 'en'
            obj2.push 'strings', 'bleh', 'en'
            obj2.push 'strings', 'titi', 'fr'
            obj2.push 'strings', 'tutu', 'fr'
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.I18n.find (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    stringen = (r.get('string', 'en') for r in results)
                    expect(stringen).to.include 'hello', 'goodbye'
                    stringfr = (r.get('string', 'fr') for r in results)
                    expect(stringfr).to.include 'salut', 'au revoir'
                    stringsen = _.flatten(r.get('strings', 'en') for r in results)
                    expect(stringsen).to.include 'foo', 'bar', 'blah', 'bleh'
                    stringsfr = _.flatten(r.get('strings', 'fr') for r in results)
                    expect(stringsfr).to.include 'toto', 'tata', 'titi', 'tutu'
                    done()


        it 'should query the docs (equal op)', (done) ->
            obj = new db.I18n
            obj.set 'string', 'hello', 'en'
            obj.set 'string', 'salut', 'fr'
            obj.push 'strings', 'foo', 'en'
            obj.push 'strings', 'bar', 'en'
            obj.push 'strings', 'toto', 'fr'
            obj.push 'strings', 'tata', 'fr'
            obj2 = new db.I18n
            obj2.set 'string', 'goodbye', 'en'
            obj2.set 'string', 'au revoir', 'fr'
            obj2.push 'strings', 'blah', 'en'
            obj2.push 'strings', 'bleh', 'en'
            obj2.push 'strings', 'titi', 'fr'
            obj2.push 'strings', 'tutu', 'fr'
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.I18n.find {'string@en': 'hello'}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get('string', 'en')).to.be.equal 'hello'
                    expect(result.get('string', 'fr')).to.be.equal 'salut'
                    expect(result.get('strings', 'en')).to.include 'foo', 'bar'
                    expect(result.get('strings', 'fr')).to.include 'toto', 'tata'
                    done()

        it.skip 'should query the docs (bad $ne)', (done) ->
            obj = new db.I18n
            obj.set 'string', 'hello', 'en'
            obj.set 'string', 'salut', 'fr'
            obj.push 'strings', 'foo', 'en'
            obj.push 'strings', 'bar', 'en'
            obj.push 'strings', 'toto', 'fr'
            obj.push 'strings', 'tata', 'fr'
            obj2 = new db.I18n
            obj2.set 'string', 'goodbye', 'en'
            obj2.set 'string', 'au revoir', 'fr'
            obj2.push 'strings', 'blah', 'en'
            obj2.push 'strings', 'bleh', 'en'
            obj2.push 'strings', 'titi', 'fr'
            obj2.push 'strings', 'tutu', 'fr'
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.I18n.find {'string@fr': {$ne: ['au revoir']}}, (err, results) ->
                    # expect(err).to.be.equal '$ne operator must be a string'
                    expect(results.length).to.be.equal 0
                    done()

        it 'should query the docs ($ne)', (done) ->
            obj = new db.I18n
            obj.set 'string', 'hello', 'en'
            obj.set 'string', 'salut', 'fr'
            obj.push 'strings', 'foo', 'en'
            obj.push 'strings', 'bar', 'en'
            obj.push 'strings', 'toto', 'fr'
            obj.push 'strings', 'tata', 'fr'
            obj2 = new db.I18n
            obj2.set 'string', 'goodbye', 'en'
            obj2.set 'string', 'au revoir', 'fr'
            obj2.push 'strings', 'blah', 'en'
            obj2.push 'strings', 'bleh', 'en'
            obj2.push 'strings', 'titi', 'fr'
            obj2.push 'strings', 'tutu', 'fr'
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.I18n.find {'string@fr': {$ne: 'au revoir'}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get('string', 'en')).to.be.equal 'hello'
                    expect(result.get('string', 'fr')).to.be.equal 'salut'
                    expect(result.get('strings', 'en')).to.include 'foo', 'bar'
                    expect(result.get('strings', 'fr')).to.include 'toto', 'tata'
                    done()

        it 'should query the docs ($in)', (done) ->
            obj = new db.I18n
            obj.set 'string', 'hello', 'en'
            obj.set 'string', 'salut', 'fr'
            obj.push 'strings', 'foo', 'en'
            obj.push 'strings', 'bar', 'en'
            obj.push 'strings', 'toto', 'fr'
            obj.push 'strings', 'tata', 'fr'
            obj2 = new db.I18n
            obj2.set 'string', 'goodbye', 'en'
            obj2.set 'string', 'au revoir', 'fr'
            obj2.push 'strings', 'blah', 'en'
            obj2.push 'strings', 'bleh', 'en'
            obj2.push 'strings', 'titi', 'fr'
            obj2.push 'strings', 'tutu', 'fr'
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.I18n.find {'string@en': {$in: ['hello', 'foo', 'au revoir']}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get('string', 'en')).to.be.equal 'hello'
                    expect(result.get('string', 'fr')).to.be.equal 'salut'
                    expect(result.get('strings', 'en')).to.include 'foo', 'bar'
                    expect(result.get('strings', 'fr')).to.include 'toto', 'tata'
                    db.I18n.find {'strings@en': {$in: ['blah', 'bleh', 'arf', 'toto']}}, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 1
                        result = results[0]
                        expect(result.get('string', 'en')).to.be.equal 'goodbye'
                        expect(result.get('string', 'fr')).to.be.equal 'au revoir'
                        expect(result.get('strings', 'en')).to.include 'blah', 'bleh'
                        expect(result.get('strings', 'fr')).to.include 'titi', 'tutu'
                        done()


        it 'should query the docs ($nin)', (done) ->
            obj = new db.I18n
            obj.set 'string', 'hello', 'en'
            obj.set 'string', 'salut', 'fr'
            obj.push 'strings', 'foo', 'en'
            obj.push 'strings', 'bar', 'en'
            obj.push 'strings', 'toto', 'fr'
            obj.push 'strings', 'tata', 'fr'
            obj2 = new db.I18n
            obj2.set 'string', 'goodbye', 'en'
            obj2.set 'string', 'au revoir', 'fr'
            obj2.push 'strings', 'blah', 'en'
            obj2.push 'strings', 'bleh', 'en'
            obj2.push 'strings', 'titi', 'fr'
            obj2.push 'strings', 'tutu', 'fr'
            db.batchSync [obj.toJSONObject(), obj2.toJSONObject()], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.I18n.find {'string@en': {$nin: ['hello', 'foo', 'au revoir']}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get('string', 'en')).to.be.equal 'goodbye'
                    expect(result.get('string', 'fr')).to.be.equal 'au revoir'
                    expect(result.get('strings', 'en')).to.include 'blah', 'bleh'
                    expect(result.get('strings', 'fr')).to.include 'titi', 'tutu'
                    db.I18n.find {'strings@en': {$nin: ['foo', 'titi', 'arf', 'tutu']}}, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 1
                        result = results[0]
                        expect(result.get('string', 'en')).to.be.equal 'goodbye'
                        expect(result.get('string', 'fr')).to.be.equal 'au revoir'
                        expect(result.get('strings', 'en')).to.include 'blah', 'bleh'
                        expect(result.get('strings', 'fr')).to.include 'titi', 'tutu'
                        done()


