
expect = require('chai').expect
_ = require 'underscore'
config = require('../config')

describe 'Database synchronization', ()->

    db = config.Database()

    f = {
        title: "#{config.nsprop}title"
        index: "#{config.nsprop}index"
        foo: "#{config.nsprop}foo"
    }

    beforeEach (done) ->
        db.clear done


    describe '.sync()', () ->
        it 'should store a simple pojo and return it with _id', (done) ->
            pojo = {}
            pojo[f.title] = 'bar'
            pojo[f.index] = 2
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj[f.title]).to.be.equal pojo[f.title]
                expect(obj[f.index]).to.be.equal pojo[f.index]
                expect(obj._id).to.be.not.null
                done()

        it 'should update a simple pojo if it has changed', (done) ->
            pojo = {}
            pojo[f.title] = 'arf'
            pojo[f.index] = 2
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj[f.title]).to.be.equal pojo[f.title]
                expect(obj[f.index]).to.be.equal pojo[f.index]
                expect(obj._id).to.be.not.null
                obj[f.index] = 3
                db.sync obj, (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true
                    expect(newobj[f.title]).to.be.equal pojo[f.title]
                    expect(newobj[f.index]).to.be.equal 3
                    expect(newobj._id).to.be.equal obj._id
                    db.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()

        it 'should not touch the db if the pojo hasnt changed', (done) ->
            pojo = {}
            pojo[f.title] = 'foo'
            pojo[f.index] = 2
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

        it 'should update the multi pojo if changed', (done) ->
            pojo = {}
            pojo[f.index] = [1, 2, 3]

            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj[f.index]).to.include.members [1, 2, 3]
                expect(obj._id).to.be.not.null

                obj[f.index].push 'changed'
                delete obj[f.index][2]

                db.sync obj, (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true

                    expect(newobj[f.index]).to.include.members [1, 2, 'changed']
                    expect(newobj[f.index]).to.not.include 3
                    expect(newobj._id).to.be.equal obj._id

                    db.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()


        it 'should update the i18n pojo if changed', (done) ->
            pojo = {}
            pojo[f.title] = {en: 'foo', fr: 'toto'}

            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj[f.title].en).to.be.equal 'foo'
                expect(obj[f.title].fr).to.be.equal 'toto'
                expect(obj._id).to.be.not.null

                obj[f.title].en = 'changed'
                obj[f.title].es = 'cambiado'
                delete obj[f.title].fr

                db.sync obj, (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true
                    expect(newobj[f.title].fr).to.be.undefined
                    expect(newobj[f.title].en).to.be.equal 'changed'
                    expect(newobj[f.title].es).to.be.equal 'cambiado'

                    expect(newobj._id).to.be.equal obj._id

                    db.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()

        it 'should update the multi-i18n pojo if changed', (done) ->
            pojo = {}
            pojo[f.foo] = {en: ['hello', 'hi'], fr: ['bonjour', 'salut']}

            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null

                obj[f.foo].en[0] = 'changed'
                obj[f.foo].fr.push 'ajout'
                delete obj[f.foo].fr[0]
                obj[f.foo].es = ['nuevo']

                db.sync obj, (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true

                    expect(newobj[f.foo].en[0]).to.be.equal 'changed'
                    expect(newobj[f.foo].fr).to.include.members ['salut', 'ajout']
                    expect(newobj[f.foo].fr).to.not.include 'bonjour'
                    expect(newobj[f.foo].es).to.include 'nuevo'

                    expect(newobj._id).to.be.equal obj._id

                    db.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()

        it 'should update the complex pojo if changed', (done) ->
            pojo = {}
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
                    expect(newobj[f.foo].en[0]).to.be.equal 'changed'
                    expect(newobj[f.foo].fr[0]).to.be.equal 'bonjour'
                    expect(newobj._id).to.be.equal obj._id

                    db.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()

    describe '.batchSync()', () ->
        it 'should sync a batch of pojos', (done) ->
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
                db.count (err, count) ->
                    expect(err).to.be.null
                    expect(count).to.be.equal 5
                    done()

        it 'should update modified pojos', (done) ->
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
                update = (r.result for r in results)
                update[0][f.title] = 10
                update[2][f.title] = 30
                update[4][f.title] = 50
                update[4][f.index] = 500
                db.batchSync update, (err, results) ->
                    expect(err).to.be.null
                    expect(results[0].options.dbTouched).to.be.true
                    expect(results[1].options.dbTouched).to.be.false
                    expect(results[2].options.dbTouched).to.be.true
                    expect(results[3].options.dbTouched).to.be.false
                    expect(results[4].options.dbTouched).to.be.true
                    results = (r.result for r in results)
                    expect(results[0][f.title]).to.be.equal 10
                    expect(results[4][f.title]).to.be.equal 50
                    expect(results[4][f.index]).to.be.equal 500
                    db.count (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 5
                        done()



