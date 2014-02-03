expect = require('chai').expect
sinon = require('sinon')
_ = require 'underscore'
Model = require('../interface').Model
Database = require('./config').Database

describe 'Database', ()->

    models = {}

    db = Database()

    beforeEach (done) ->
        db.clear done

    describe '.length()', () ->
        it 'should return the number of item of the db', (done) ->
            db.sync {title: 'hello'}, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                db.length (err, count) ->
                    expect(err).to.be.null
                    expect(count).to.be.equal 1
                    db.sync {title: 'hello2'}, (err, obj, infos) ->
                        expect(err).to.be.null
                        expect(infos.dbTouched).to.be.true
                        db.length (err, count) ->
                            expect(err).to.be.null
                            expect(count).to.be.equal 2
                            db.sync {title: 'hello3'}, (err, obj, infos) ->
                                expect(err).to.be.null
                                expect(infos.dbTouched).to.be.true
                                db.length (err, count) ->
                                    expect(err).to.be.null
                                    expect(count).to.be.equal 3
                                    done()

    describe '.sync()', () ->
        it 'should store a pojo and return it with _id', (done) ->
            pojo = {title: 'bar', index: 2}
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.title).to.be.equal pojo.title
                expect(obj.index).to.be.equal pojo.index
                expect(obj._id).to.be.not.null
                done()

        it 'should update a pojo if it has changed', (done) ->
            pojo = {title: 'arf', index: 2}
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.title).to.be.equal pojo.title
                expect(obj.index).to.be.equal pojo.index
                expect(obj._id).to.be.not.null
                obj.index = 3
                db.sync obj, (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true
                    expect(newobj.title).to.be.equal pojo.title
                    expect(newobj.index).to.be.equal 3
                    expect(newobj._id).to.be.equal obj._id
                    db.length (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()

        it 'should not touch the db if the pojo hasnt changed', (done) ->
            pojo = {title: 'foo', index: 2}
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.title).to.be.equal pojo.title
                expect(obj.index).to.be.equal pojo.index
                expect(obj._id).to.be.not.null
                db.sync obj, (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.false
                    expect(newobj.title).to.be.equal 'foo'
                    expect(newobj.index).to.be.equal 2
                    expect(newobj._id).to.be.equal obj._id
                    db.length (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()

        it 'should update the complex pojo if changed', (done) ->
            pojo = {
                i18n: {en: 'foo', fr: 'toto'},
                multi: [1, 2, 3],
                multiI18n: {en: ['hello', 'hi'], fr: ['bonjour', 'salut']}
            }
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj.i18n.en).to.be.equal 'foo'
                expect(obj.i18n.fr).to.be.equal 'toto'
                expect(obj.multi).to.include 1, 2, 3
                expect(obj._id).to.be.not.null
                obj.i18n.en = 'changed'
                obj.multi.push 'changed'
                obj.multiI18n.en[0] = 'changed'
                db.sync obj, (err, newobj, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true
                    expect(newobj.i18n.fr).to.be.equal 'toto'
                    expect(newobj.i18n.en).to.be.equal 'changed'
                    expect(newobj.multi).to.include 1, 2, 3, 'changed'
                    expect(newobj.multiI18n.en[0]).to.be.equal 'changed'
                    expect(newobj.multiI18n.fr[0]).to.be.equal 'bonjour'
                    expect(newobj._id).to.be.equal obj._id
                    db.length (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 1
                        done()

    describe '.batchSync()', () ->
        it 'should sync a batch of pojos', (done) ->
            pojos = [
                {title: 1, index: 10}
                {title: 2, index: 20}
                {title: 3, index: 30}
                {title: 4, index: 40}
                {title: 5, index: 50}
            ]
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                db.length (err, count) ->
                    expect(err).to.be.null
                    expect(count).to.be.equal 5
                    done()

        it 'should update modified pojos', (done) ->
            pojos = [
                {title: 1, index: 10}
                {title: 2, index: 20}
                {title: 3, index: 30}
                {title: 4, index: 40}
                {title: 5, index: 50}
            ]
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                expect(results.length).to.be.equal 5
                expect(_.every(r.options.dbTouched for r in results)).to.be.true
                update = (r.result for r in results)
                update[0].title = 10
                update[2].title = 30
                update[4].title = 50
                update[4].index = 500
                db.batchSync update, (err, results) ->
                    expect(err).to.be.null
                    expect(results[0].options.dbTouched).to.be.true
                    expect(results[1].options.dbTouched).to.be.false
                    expect(results[2].options.dbTouched).to.be.true
                    expect(results[3].options.dbTouched).to.be.false
                    expect(results[4].options.dbTouched).to.be.true
                    results = (r.result for r in results)
                    expect(results[0].title).to.be.equal 10
                    expect(results[4].title).to.be.equal 50
                    expect(results[4].index).to.be.equal 500
                    db.length (err, count) ->
                        expect(err).to.be.null
                        expect(count).to.be.equal 5
                        done()


    describe '.delete()', () ->
        it 'should delete an item from its id', (done) ->
            pojo = {title: 'bar', index: 2}
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                db.length (err, count) ->
                    expect(err).to.be.null
                    db.delete obj._id, (err) ->
                        expect(err).to.be.null
                        db.length (err, count) ->
                            expect(count).to.be.equal 0
                            done()

    describe '.changes()', () ->

        it 'should return the changes of a simple object', (done) ->
            pojo = {title: 'arf', index: 2}
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                obj.index = 3
                obj.foo = 'bar'
                delete obj.title
                changes = db.changes(obj)
                expect(changes.added.foo).to.be.equal 'bar'
                expect(changes.added.index).to.be.equal 3
                expect(changes.removed.index).to.be.equal 2
                done()

        it 'should return the changes of a complex object', (done) ->
            pojo = {
                literal: 'foo'
                oldliteral: 'bar'
                i18n: {en: 'foo', fr: 'toto'},
                multi: [1, 2, 3],
                multiI18n: {en: [1, 3, 5], fr: [2, 4, 6]}
            }
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null

                # literal
                obj.literal = 'changed'
                obj.newliteral = 'bar'
                delete obj.oldliteral
                # multi field
                obj.multi[0] = -1
                delete obj.multi[1]
                obj.multi.push 'changed'
                # i18n field
                obj.i18n.en = 'changed'
                obj.i18n.es = 'otros'
                delete obj.i18n.fr
                # multi i18n field
                delete obj.multiI18n.en[1]
                obj.multiI18n.en[0] = -1
                obj.multiI18n.en.push 7
                obj.multiI18n.es = [10, 11, 12]

                changes = db.changes(obj)
                # literal field
                expect(changes.added.literal).to.be.equal 'changed'
                expect(changes.removed.literal).to.be.equal 'foo'
                expect(changes.removed.oldliteral).to.be.equal 'bar'
                expect(changes.added.newliteral).to.be.equal 'bar'
                # multi field
                expect(changes.added.multi).to.be.include -1, 'changed'
                expect(changes.removed.multi).to.be.include 2, 1
                # i18n field
                expect(changes.added.i18n.en).to.be.equal 'changed'
                expect(changes.removed.i18n.fr).to.be.equal 'toto'
                expect(changes.removed.i18n.en).to.be.equal 'foo'
                expect(changes.added.i18n.es).to.be.equal 'otros'
                # multi i18n field
                # expect(changes.added.multiI18n.en)
                done()

    describe '.find()', () ->
        it 'should return the doc that match the id', (done) ->
            pojo = {title: 'bar', index: 2}
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                db.find obj._id, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].title).to.be.equal pojo.title
                    expect(results[0].index).to.be.equal pojo.index
                    expect(results[0]._id).to.be.equal pojo._id
                    done()

        it 'should return the docs that match the ids', (done) ->
            pojo = {title: 'bar', index: 2}
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                pojo2 = {title: 'foo', index: 3}
                db.sync pojo2, (err, obj2, infos) ->
                    expect(err).to.be.null
                    expect(infos.dbTouched).to.be.true
                    expect(obj2._id).to.be.not.null
                    db.find [obj._id, obj2._id], (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 2
                        titles = (o.title for o in results)
                        expect(titles).to.include 'bar', 'foo'
                        indexes = (o.index for o in results)
                        expect(indexes).to.include 2, 3
                        done()

        it 'should return the docs that match the query', (done) ->
            pojos = [
                {title: 1, index: 10}
                {title: 2, index: 20}
                {title: 3, index: 30}
                {title: 4, index: 40}
                {title: 5, index: 50}
            ]
            db.batchSync pojos, (err, results) ->
                expect(err).to.be.null
                db.find {title: {$gt: 2}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 3
                    done()

    describe '.first()', () ->
        it 'should return the doc that match the id', (done) ->
            pojo = {title: 'bar', index: 2}
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                db.first obj._id, (err, doc) ->
                    expect(err).to.be.null
                    console.log doc
                    expect(doc.title).to.be.equal pojo.title
                    expect(doc.index).to.be.equal pojo.index
                    expect(doc._id).to.be.equal pojo._id
                    done()

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


