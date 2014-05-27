
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

_ = require 'underscore'
config = require('../config')

describe 'model.find', ()->

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
                multi: true,
                orderBy: 'desc'

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

    describe 'options.instances', () ->
        it 'as true should returns the model instances', (done) ->
            instances = [
                new db.Literal {'string': 'foo'}
                new db.Literal {'string': 'bar'}
                new db.Literal {'string': 'baz'}
                new db.Multi {'integer': [1, 2, 3]}
                new db.Multi {'integer': [3, 4, 5]}
                new db.I18n {'string': {'en': 'foo', 'fr': 'toto'}}
            ]
            db.batchSync instances, (err) ->
                expect(err).to.be.null
                db.Literal.find (err, literals) ->
                    expect(err).to.be.null
                    expect(literals.length).to.be.equal 3
                    expect(literals[0]).to.be.an.instanceof(db.Literal)
                    done()

        it 'as false should returns the references', (done) ->
            instances = [
                new db.Literal {'string': 'foo'}
                new db.Literal {'string': 'bar'}
                new db.Literal {'string': 'baz'}
                new db.Multi {'integer': [1, 2, 3]}
                new db.Multi {'integer': [3, 4, 5]}
                new db.I18n {'string': {'en': 'foo', 'fr': 'toto'}}
            ]
            db.batchSync instances, (err) ->
                expect(err).to.be.null
                db.Literal.find {}, {instances: false}, (err, literals) ->
                    expect(err).to.be.null
                    expect(literals.length).to.be.equal 3
                    expect(literals[0]).to.be.a('string')
                    deref = db.dereference(literals[0])
                    expect(deref._id).to.not.be.undefined
                    expect(deref._type).to.not.be.undefined
                    done()


    describe '[type]', () ->
        it 'should return the doc of the same type', (done) ->
            instances = [
                new db.Literal {'string': 'foo'}
                new db.Literal {'string': 'bar'}
                new db.Literal {'string': 'baz'}
                new db.Multi {'integer': [1, 2, 3]}
                new db.Multi {'integer': [3, 4, 5]}
                new db.I18n {'string': {'en': 'foo', 'fr': 'toto'}}
            ]
            db.batchSync instances, (err) ->
                expect(err).to.be.null
                db.Literal.find (err, literals) ->
                    expect(err).to.be.null
                    expect(literals.length).to.be.equal 3
                    db.Multi.find (err, multis) ->
                        expect(err).to.be.null
                        expect(multis.length).to.be.equal 2
                        db.I18n.find (err, i18ns) ->
                            expect(err).to.be.null
                            expect(i18ns.length).to.be.equal 1
                            done()

        it 'should return the doc of the same type with a query', (done) ->
            instances = [
                new db.Literal {'integer': 1}
                new db.Literal {'integer': 2}
                new db.Literal {'integer': 3}
                new db.Multi {'integer': [1, 2, 3]}
                new db.Multi {'integer': [3, 4, 5]}
                new db.I18n {'string': {'en': 'foo', 'fr': 'toto'}}
            ]
            db.batchSync instances, (err) ->
                expect(err).to.be.null
                db.Literal.find {integer: 3}, (err, literals) ->
                    expect(err).to.be.null
                    expect(literals.length).to.be.equal 1
                    db.Multi.find {integer: 3}, (err, multis) ->
                        expect(err).to.be.null
                        expect(multis.length).to.be.equal 2
                        done()

        it 'should return the first doc of the same type with a query', (done) ->
            instances = [
                new db.Literal {'integer': 1}
                new db.Literal {'integer': 2}
                new db.Literal {'integer': 3}
                new db.Multi {'integer': [1, 2, 3]}
                new db.Multi {'integer': [3, 4, 5]}
                new db.I18n {'string': {'en': 'foo', 'fr': 'toto'}}
            ]
            db.batchSync instances, (err) ->
                expect(err).to.be.null
                db.Literal.first {integer: 3}, (err, literal) ->
                    expect(err).to.be.null
                    expect(literal.get 'integer').to.be.equal 3
                    db.Multi.first {integer: 3}, (err, multi) ->
                        expect(err).to.be.null
                        expect(i for i in multi.get 'integer').to.include.members [3]
                        done()

        it 'should return an error when quering on an unknown field', (done) ->
            instances = [
                new db.Literal {'integer': 1}
                new db.Literal {'integer': 2}
                new db.Literal {'integer': 3}
                new db.Multi {'integer': [1, 2, 3]}
                new db.Multi {'integer': [3, 4, 5]}
                new db.I18n {'string': {'en': 'foo', 'fr': 'toto'}}
            ]
            db.batchSync instances, (err) ->
                expect(err).to.be.null
                db.Literal.find {unknownField: 3}, (err, results) ->
                    expect(err).to.be.equal "Unknown field Literal.unknownField"
                    expect(results).to.be.undefined
                    done()

    describe '[literal]', () ->
        it 'should return the doc (in a list) that match the id', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'salut', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj.save (err, savedObj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.id).to.be.not.null
                db.Literal.find savedObj.reference(), (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].get 'i18n', 'en').to.be.equal obj.get 'i18n', 'en'
                    expect(results[0].get 'i18n', 'fr').to.be.equal obj.get 'i18n', 'fr'
                    expect(results[0].get 'string').to.be.equal obj.get 'string'
                    expect(results[0].get 'integer').to.be.equal obj.get 'integer'
                    expect(results[0].get('date').toISOString()).to.be.equal(
                        obj.get('date').toISOString())
                    done()

        it 'should return the doc (in a list) that match the id in a query', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'salut', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj.save (err, savedObj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.id).to.be.not.null
                db.Literal.find {_id: savedObj.id}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].get 'i18n', 'en').to.be.equal obj.get 'i18n', 'en'
                    expect(results[0].get 'i18n', 'fr').to.be.equal obj.get 'i18n', 'fr'
                    expect(results[0].get 'string').to.be.equal obj.get 'string'
                    expect(results[0].get 'integer').to.be.equal obj.get 'integer'
                    expect(results[0].get('date').toISOString()).to.be.equal(
                        obj.get('date').toISOString())
                    done()

        it 'should return the docs that match the ids in a query', (done) ->
            literals = []
            for i in [1..4]
                literals.push new db.Literal {integer: i}
            db.batchSync literals, (err, savedObjs) ->
                expect(err).to.be.null
                db.Literal.find {_id: (i.result._id for i in savedObjs)}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 4
                    expect(results[0].get 'integer').to.be.equal 1
                    expect(results[1].get 'integer').to.be.equal 2
                    expect(results[2].get 'integer').to.be.equal 3
                    expect(results[3].get 'integer').to.be.equal 4
                    done()

        it 'should return the doc that match the id', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'salut', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj.save (err, savedObj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.id).to.be.not.null
                db.Literal.first savedObj.reference(), (err, result) ->
                    expect(err).to.be.null
                    expect(result.get 'i18n', 'en').to.be.equal obj.get 'i18n', 'en'
                    expect(result.get 'i18n', 'fr').to.be.equal obj.get 'i18n', 'fr'
                    expect(result.get 'string').to.be.equal obj.get 'string'
                    expect(result.get 'integer').to.be.equal obj.get 'integer'
                    expect(result.get('date').toISOString()).to.be.equal(
                        obj.get('date').toISOString())
                    done()

        it 'should return the doc that match the id in a query', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'salut', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj.save (err, savedObj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.id).to.be.not.null
                db.Literal.first {_id: savedObj.id}, (err, result) ->
                    expect(err).to.be.null
                    expect(result.get 'i18n', 'en').to.be.equal obj.get 'i18n', 'en'
                    expect(result.get 'i18n', 'fr').to.be.equal obj.get 'i18n', 'fr'
                    expect(result.get 'string').to.be.equal obj.get 'string'
                    expect(result.get 'integer').to.be.equal obj.get 'integer'
                    expect(result.get('date').toISOString()).to.be.equal(
                        obj.get('date').toISOString())
                    done()

        it 'should return all saved docs', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'bonjour', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'i18n', 'hi', 'en'
            obj2.set 'i18n', 'salut', 'fr'
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = (i.get('string') for i in results)
                    expect(strings).to.include.members ['hello', 'salut']
                    i18nen = (i.get('i18n', 'en') for i in results)
                    expect(i18nen).to.include.members ['hello', 'hi']
                    i18nfr = (i.get('i18n', 'fr') for i in results)
                    expect(i18nfr).to.include.members ['bonjour', 'salut']
                    done()

        it 'should query the docs (equal op)', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'bonjour', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'i18n', 'hi', 'en'
            obj2.set 'i18n', 'salut', 'fr'
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: 2}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].get 'i18n', 'en').to.be.equal 'hello'
                    expect(results[0].get 'i18n', 'fr').to.be.equal 'bonjour'
                    expect(results[0].get 'string').to.be.equal 'hello'
                    done()

        it 'should query the docs ($gt)', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'bonjour', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'i18n', 'hi', 'en'
            obj2.set 'i18n', 'salut', 'fr'
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$gt: 2}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].get 'string').to.be.equal 'salut'
                    expect(results[0].get 'i18n', 'en').to.be.equal 'hi'
                    expect(results[0].get 'i18n', 'fr').to.be.equal 'salut'
                    done()


        it 'should query the docs ($gte)', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'bonjour', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'i18n', 'hi', 'en'
            obj2.set 'i18n', 'salut', 'fr'
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$gte: 2}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = (i.get('string') for i in results)
                    expect(strings).to.include.members ['hello', 'salut']
                    i18nen = (i.get('i18n', 'en') for i in results)
                    expect(i18nen).to.include.members ['hello', 'hi']
                    i18nfr = (i.get('i18n', 'fr') for i in results)
                    expect(i18nfr).to.include.members ['bonjour', 'salut']
                    done()

        it 'should query the docs ($lt)', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'bonjour', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'i18n', 'hi', 'en'
            obj2.set 'i18n', 'salut', 'fr'
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$lt: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = (i.get('string') for i in results)
                    expect(results[0].get 'string').to.be.equal 'hello'
                    expect(results[0].get 'i18n', 'en').to.be.equal 'hello'
                    expect(results[0].get 'i18n', 'fr').to.be.equal 'bonjour'
                    done()

        it 'should query the docs ($lte)', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'bonjour', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'i18n', 'hi', 'en'
            obj2.set 'i18n', 'salut', 'fr'
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$lte: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = (i.get('string') for i in results)
                    expect(strings).to.include.members ['hello', 'salut']
                    i18nen = (i.get('i18n', 'en') for i in results)
                    expect(i18nen).to.include.members ['hello', 'hi']
                    i18nfr = (i.get('i18n', 'fr') for i in results)
                    expect(i18nfr).to.include.members ['bonjour', 'salut']
                    done()

        it 'should query the docs ($in)', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'bonjour', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'i18n', 'hi', 'en'
            obj2.set 'i18n', 'salut', 'fr'
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$in: [2, 3, 4]}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = (i.get('string') for i in results)
                    expect(strings).to.include.members ['hello', 'salut']
                    i18nen = (i.get('i18n', 'en') for i in results)
                    expect(i18nen).to.include.members ['hello', 'hi']
                    i18nfr = (i.get('i18n', 'fr') for i in results)
                    expect(i18nfr).to.include.members ['bonjour', 'salut']
                    done()

        it 'should query the docs ($nin)', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'bonjour', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'i18n', 'hi', 'en'
            obj2.set 'i18n', 'salut', 'fr'
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$nin: [2, 4]}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = (i.get('string') for i in results)
                    expect(strings).to.include.members ['salut']
                    i18nen = (i.get('i18n', 'en') for i in results)
                    expect(i18nen).to.include.members ['hi']
                    i18nfr = (i.get('i18n', 'fr') for i in results)
                    expect(i18nfr).to.include.members ['salut']
                    db.Literal.find {integer: {$nin: [2, 3]}}, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 0
                        done()


        it 'should query the docs ($and)', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'bonjour', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'i18n', 'hi', 'en'
            obj2.set 'i18n', 'salut', 'fr'
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                query = {$and: [{integer: {$gt: 2}}, {integer: {$lt: 4}}]}
                db.Literal.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    done()


        it 'should query the docs ($ne)', (done) ->
            obj = new db.Literal
            obj.set 'i18n', 'hello', 'en'
            obj.set 'i18n', 'bonjour', 'fr'
            obj.set 'string', 'hello'
            obj.set 'integer', 2
            obj.set 'date', new Date(2014, 1, 1)
            obj2 = new db.Literal
            obj2.set 'i18n', 'hi', 'en'
            obj2.set 'i18n', 'salut', 'fr'
            obj2.set 'string', 'salut'
            obj2.set 'integer', 3
            obj2.set 'date', new Date(2014, 1, 2)
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Literal.find {integer: {$ne: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = (i.get('string') for i in results)
                    expect(results[0].get 'string').to.be.equal 'hello'
                    expect(results[0].get 'i18n', 'en').to.be.equal 'hello'
                    expect(results[0].get 'i18n', 'fr').to.be.equal 'bonjour'
                    done()


    describe '[multi]', () ->
        it.only 'should return the doc that match the id', (done) ->
            obj = new db.Multi
            obj.push 'string', 'salut'
            obj.push 'string', 'hello'
            obj.set 'integer', [3, 1, 2]
            obj.push 'date', new Date(1984, 1, 20)
            obj.push 'date', new Date(2014, 2, 1)
            obj.push 'date', new Date(1983, 1, 1)
            obj.save (err, savedObj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.id).to.be.not.null
                db.Multi.find savedObj.reference(), (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get 'string').to.include.members ['hello', 'salut']
                    expect(result.get('integer')[0]).to.be.equal 1
                    expect(result.get('integer')[1]).to.be.equal 2
                    expect(result.get('integer')[2]).to.be.equal 3
                    expect(result.get('date')[0].toISOString()).to.be.equal new Date(2014, 2, 1).toISOString()
                    expect(result.get('date')[1].toISOString()).to.be.equal new Date(1984, 1, 20).toISOString()
                    expect(result.get('date')[2].toISOString()).to.be.equal new Date(1983, 1, 1).toISOString()
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
                db.Multi.first savedObj.reference(), (err, result) ->
                    expect(err).to.be.null
                    expect(result.get 'string').to.include.members ['hello', 'salut']
                    expect(result.get 'integer').to.include.members [1, 2, 3]
                    expect(d.toISOString() for d in result.get('date')).to.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                    ]
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['hello', 'salut', 'hi']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [1, 2, 3, 4, 5]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    ]
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {'string': 'hi'}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['salut', 'hi']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [3, 4, 5]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    ]
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {integer: 3}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['hello', 'salut', 'hi']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [1, 2, 3, 4, 5]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    ]
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {integer: {$gt: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['salut', 'hi']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [3, 4, 5]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    ]
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {integer: {$gte: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['hello', 'salut', 'hi']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [1, 2, 3, 4, 5]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    ]
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {integer: {$lt: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['hello', 'salut']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [1, 2, 3]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                    ]
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {integer: {$lte: 3}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['hello', 'salut', 'hi']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [1, 2, 3, 4, 5]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    ]
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {string: {$in: ['salut', 'hi', 'foo']}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['hello', 'salut', 'hi']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [1, 2, 3, 4, 5]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    ]
                    done()

        it 'should query the docs ($in) (2)', (done) ->
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {string: {$in: ['hello']}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['hello', 'salut']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [1, 2, 3]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 2, 1).toISOString()
                    ]
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

            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true

                db.Multi.find {integer: {$nin: [1, 6, 7]}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['salut', 'hi']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [3, 4, 5]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    ]

                    query = {
                        string: {$nin: ['hello', 'hi']}
                        integer: {$nin: [0, 6, 7]}
                    }
                    db.Multi.find query, (err, results) ->
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                query = {$and: [{string: 'salut'}, {string: 'hi'}]}
                db.Multi.find query, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['salut', 'hi']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [3, 4, 5]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    ]
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.Multi.find {string: {$ne: 'hello'}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    strings = _.flatten(i.get('string') for i in results)
                    expect(strings).to.include.members ['salut', 'hi']
                    integers = _.flatten(i.get('integer') for i in results)
                    expect(integers).to.include.members [3, 4, 5]
                    dates = _.flatten(i.get('date') for i in results)
                    expect(j.toISOString() for j in dates).to.include.members [
                        new Date(2014, 2, 1).toISOString()
                        new Date(2014, 3, 1).toISOString()
                    ]
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
                db.I18n.find savedObj.reference(), (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get 'string', 'en').to.equal 'hello'
                    expect(result.get 'string', 'fr').to.equal 'salut'
                    expect(result.get 'strings', 'en').to.include.members ['foo', 'bar']
                    expect(result.get 'strings', 'fr').to.include.members ['toto', 'tata']
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
                db.I18n.first savedObj.reference(), (err, result) ->
                    expect(err).to.be.null
                    expect(result.get 'string', 'en').to.equal 'hello'
                    expect(result.get 'string', 'fr').to.equal 'salut'
                    expect(result.get 'strings', 'en').to.include.members ['foo', 'bar']
                    expect(result.get 'strings', 'fr').to.include.members ['toto', 'tata']
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.I18n.find (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    stringen = (r.get('string', 'en') for r in results)
                    expect(stringen).to.include.members ['hello', 'goodbye']
                    stringfr = (r.get('string', 'fr') for r in results)
                    expect(stringfr).to.include.members ['salut', 'au revoir']
                    stringsen = _.flatten(r.get('strings', 'en') for r in results)
                    expect(stringsen).to.include.members ['foo', 'bar', 'blah', 'bleh']
                    stringsfr = _.flatten(r.get('strings', 'fr') for r in results)
                    expect(stringsfr).to.include.members ['toto', 'tata', 'titi', 'tutu']
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.I18n.find {'string@en': 'hello'}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get('string', 'en')).to.be.equal 'hello'
                    expect(result.get('string', 'fr')).to.be.equal 'salut'
                    expect(result.get('strings', 'en')).to.include.members ['foo', 'bar']
                    expect(result.get('strings', 'fr')).to.include.members ['toto', 'tata']
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
            db.batchSync [obj, obj2], (err, data) ->
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.I18n.find {'string@fr': {$ne: 'au revoir'}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get('string', 'en')).to.be.equal 'hello'
                    expect(result.get('string', 'fr')).to.be.equal 'salut'
                    expect(result.get('strings', 'en')).to.include.members ['foo', 'bar']
                    expect(result.get('strings', 'fr')).to.include.members ['toto', 'tata']
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.I18n.find {'string@en': {$in: ['hello', 'foo', 'au revoir']}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get('string', 'en')).to.be.equal 'hello'
                    expect(result.get('string', 'fr')).to.be.equal 'salut'
                    expect(result.get('strings', 'en')).to.include.members ['foo', 'bar']
                    expect(result.get('strings', 'fr')).to.include.members ['toto', 'tata']
                    db.I18n.find {'strings@en': {$in: ['blah', 'bleh', 'arf', 'toto']}}, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 1
                        result = results[0]
                        expect(result.get('string', 'en')).to.be.equal 'goodbye'
                        expect(result.get('string', 'fr')).to.be.equal 'au revoir'
                        expect(result.get('strings', 'en')).to.include.members ['blah', 'bleh']
                        expect(result.get('strings', 'fr')).to.include.members ['titi', 'tutu']
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
            db.batchSync [obj, obj2], (err, data) ->
                expect(err).to.be.null
                expect(_.every(i.options.dbTouched for i in data)).to.be.true
                db.I18n.find {'string@en': {$nin: ['hello', 'foo', 'au revoir']}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    result = results[0]
                    expect(result.get('string', 'en')).to.be.equal 'goodbye'
                    expect(result.get('string', 'fr')).to.be.equal 'au revoir'
                    expect(result.get('strings', 'en')).to.include.members ['blah', 'bleh']
                    expect(result.get('strings', 'fr')).to.include.members ['titi', 'tutu']
                    db.I18n.find {'strings@en': {$nin: ['foo', 'titi', 'arf', 'tutu']}}, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 1
                        result = results[0]
                        expect(result.get('string', 'en')).to.be.equal 'goodbye'
                        expect(result.get('string', 'fr')).to.be.equal 'au revoir'
                        expect(result.get('strings', 'en')).to.include.members ['blah', 'bleh']
                        expect(result.get('strings', 'fr')).to.include.members ['titi', 'tutu']
                        done()

    describe 'sortBy', () ->
        it 'should sort the results by i18n fields in different order with query', (done) ->
            literals = []
            for i in [5..1]
                literals.push new db.Literal {i18n: {en: "#{i}", fr: "#{i%2}"}}
            db.batchSync literals, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.Literal.find {}, {sortBy: ['i18n@fr', '-i18n@en']}, (err, results) ->
                    expect(err).to.be.null
                    expect(results[0].get 'i18n', 'fr').to.be.equal "0"
                    expect(results[0].get 'i18n', 'en').to.be.equal "4"

                    expect(results[1].get 'i18n', 'fr').to.be.equal "0"
                    expect(results[1].get 'i18n', 'en').to.be.equal "2"

                    expect(results[2].get 'i18n', 'fr').to.be.equal "1"
                    expect(results[2].get 'i18n', 'en').to.be.equal "5"

                    expect(results[3].get 'i18n', 'fr').to.be.equal "1"
                    expect(results[3].get 'i18n', 'en').to.be.equal "3"

                    expect(results[4].get 'i18n', 'fr').to.be.equal "1"
                    expect(results[4].get 'i18n', 'en').to.be.equal "1"

                    done()
