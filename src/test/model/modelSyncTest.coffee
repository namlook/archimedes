
expect = require('chai').expect
_ = require 'underscore'
config = require('../config')

describe 'Model synchronization', ()->

    models = {}

    class models.Inner extends config.Model
        schema:
            string:
                type: 'string'

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
            inner:
                type: 'Inner'


    class models.One extends config.Model
        schema:
            literal:
                type: 'Literal'
                required: true

    class models.Multi extends config.Model
        schema:
            integer:
                type: 'integer'
                multi: true
            literals:
                type: 'Literal'
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

    db = config.Database()
    db.registerModels models

    beforeEach (done) ->
        db.clear done


    describe '.save()', () ->
        it 'should save a simple object and return it with _id', (done) ->
            inner = new db.Inner {string: 'bar'}
            inner.save (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.get 'string').to.be.equal 'bar'
                expect(obj.id).to.be.not.null
                expect(obj.id).to.be.equal obj.get('_id')
                db.Inner.count (err, count) ->
                    expect(err).to.be.null
                    expect(count).to.be.equal 1
                    done()

        it 'should update a simple object if it has changed', (done) ->
            inner = new db.Inner {string: 'bar'}
            inner.save (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.get 'string').to.be.equal 'bar'
                expect(obj.id).to.be.not.null
                obj.set 'string', 'foo'
                obj.save (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true
                    expect(newobj.get 'string').to.be.equal 'foo'
                    expect(newobj.id).to.be.equal newobj.get('_id')
                    db.Inner.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()

        it.skip 'should not touch the db if the pojo hasnt changed', (done) ->
            pojo = {}
            pojo[f.title] = 'foo'
            pojo[f.index] = 2
            pojo._type = "#{config.nsclass}pojo"
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj[f.title]).to.be.equal pojo[f.title]
                expect(obj[f.index]).to.be.equal pojo[f.index]
                expect(obj._id).to.be.not.null
                db.sync obj, (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.false
                    expect(newobj[f.title]).to.be.equal 'foo'
                    expect(newobj[f.index]).to.be.equal 2
                    expect(newobj._id).to.be.equal obj._id
                    db.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()

        it 'should update a multi-field document if changed', (done) ->
            multi = new db.Multi {integer: [1, 2, 3]}
            multi.save (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.get 'integer').to.include.members [1, 2, 3]
                expect(obj.id).to.be.not.null

                obj.push 'integer', 4
                obj.pull 'integer', 3

                obj.save (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true

                    expect(newobj.get('integer')).to.include.members [1, 2, 4]
                    expect(newobj.get('integer')).to.not.include 3
                    expect(newobj.id).to.be.equal obj.get('_id')

                    db.Multi.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()


        it 'should update the i18n pojo if changed', (done) ->
            i18n = new db.I18n {string: {en: 'foo', fr: 'toto'}}
            i18n.save (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.get 'string', 'en').to.be.equal 'foo'
                expect(obj.get 'string', 'fr').to.be.equal 'toto'
                expect(obj.id).to.be.not.null

                obj.set 'string', 'changed', 'en'
                obj.set 'string', 'cambiado', 'es'
                obj.unset 'string', 'fr'

                obj.save (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true
                    expect(newobj.get('string', 'fr')).to.be.undefined
                    expect(newobj.get('string', 'en')).to.be.equal 'changed'
                    expect(newobj.get('string', 'es')).to.be.equal 'cambiado'

                    expect(newobj.id).to.be.equal obj.get('_id')

                    db.I18n.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()

        it 'should update the multi-i18n pojo if changed', (done) ->
            i18n = new db.I18n {strings: {en: ['hello', 'hi'], fr: ['bonjour', 'salut']}}
            i18n.save (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null

                obj.get('strings', 'en')[0] = 'changed'
                obj.get('strings', 'fr').push 'ajout'
                obj.pull('strings', 'bonjour', 'fr')
                obj.set('strings', ['nuevo'], 'es')

                obj.save (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true

                    expect(newobj.get('strings', 'en')[0]).to.be.equal 'changed'
                    expect(newobj.get 'strings', 'fr').to.include.members ['salut', 'ajout']
                    expect(newobj.get 'strings', 'fr').to.not.include 'bonjour'
                    expect(newobj.get 'strings', 'es').to.include 'nuevo'

                    expect(newobj.id).to.be.equal obj.get '_id'

                    db.I18n.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()

        it 'should deal with undefined values', (done) ->
            multi = new db.Multi {integer: [1, 2, 3]}
            multi.set 'literals', undefined
            multi.save (err, obj, infos) ->
                expect(err).to.be.null
                done()

        it 'should save an object created from a json string', (done) ->
            literal = new db.Literal {integer: 2, string: "foo"}
            jsonLiteral = literal.toJSON()
            newLiteral = new db.Literal JSON.parse(jsonLiteral)
            newLiteral.save (err, obj, info) ->
                expect(err).to.be.null
                expect(info.dbTouched).to.be.true
                jsonObject = obj.toJSONObject()
                expect(obj.get('integer')).to.be.equal 2
                expect(obj.get('string')).to.be.equal 'foo'
                expect(jsonObject.integer).to.be.equal 2
                expect(jsonObject.string).to.be.equal 'foo'
                expect(jsonObject._id).to.not.be.null
                done()


        it 'should save an object with relation created from a json string', (done) ->
            jsonLiteral = JSON.stringify {
                integer: 2,
                string: "foo",
                inner: {string: 'bar'}
            }
            newLiteral = new db.Literal JSON.parse(jsonLiteral)
            newLiteral.save (err, obj, info) ->
                expect(err).to.be.null
                expect(info.dbTouched).to.be.true

                expect(obj.get('integer')).to.be.equal 2
                expect(obj.get('string')).to.be.equal 'foo'
                expect(obj.get('inner').get('string')).to.be.equal 'bar'

                jsonObject = obj.toJSONObject({populate: true})
                expect(jsonObject.integer).to.be.equal 2
                expect(jsonObject.string).to.be.equal 'foo'
                expect(jsonObject.inner.string).to.be.equal 'bar'
                expect(jsonObject._id).to.not.be.null
                done()

    describe.skip '.batchSync()', () ->
        it 'should sync a batch of pojos', (done) ->
            literals = []
            for i in [1..5]
                literals.push new db.Literal {integer: i, string: "#{i*10}"}
            db.Literal.batchSync literals, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.Literal.count (err, count) ->
                    expect(err).to.be.null
                    expect(count).to.be.equal 5
                    done()

        it 'should update modified pojos', (done) ->
            literals = []
            for i in [1..5]
                literals.push new db.Literal {integer: i, string: "#{i*10}"}
            db.Literal.batchSync literals, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                update = (r.result for r in results)
                update[0].set 'integer', 10
                update[2].set 'integer', 30
                update[4].set 'integer', 50
                update[4].set 'string', '500'
                db.Literal.batchSync update, (err, results) ->
                    expect(err).to.be.null
                    expect(results[0].options.dbTouched).to.be.true
                    # expect(results[1].options.dbTouched).to.be.false
                    expect(results[2].options.dbTouched).to.be.true
                    # expect(results[3].options.dbTouched).to.be.false
                    expect(results[4].options.dbTouched).to.be.true
                    results = (r.result for r in results)
                    expect(results[0].get 'integer').to.be.equal 10
                    expect(results[4].get 'integer').to.be.equal 50
                    expect(results[4].get 'string').to.be.equal '500'
                    db.Literal.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 5
                        done()



