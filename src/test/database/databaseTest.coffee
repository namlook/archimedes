
expect = require('chai').expect
_ = require 'underscore'
config = require('../config')

describe 'Database', ()->

    db = config.Database()

    f = {
        title: "#{config.nsprop}title"
        index: "#{config.nsprop}index"
        foo: "#{config.nsprop}foo"
    }

    beforeEach (done) ->
        db.clear done

    describe '.count()', () ->
        it 'should return the number of item of the db', (done) ->
            pojo = {_type: 'Test'}
            pojo[f.title] = 'hello'
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                db.count (err, count) ->
                    expect(err).to.be.null
                    expect(count).to.be.equal 1
                    pojo2 = {_type: 'Test'}
                    pojo2[f.index] = 'hello2'
                    db.sync pojo2, (err, obj, infos) ->
                        expect(err).to.be.null
                        expect(infos.dbTouched).to.be.true
                        db.count (err, count) ->
                            expect(err).to.be.null
                            expect(count).to.be.equal 2
                            pojo3 = {_type: 'Test'}
                            pojo3[f.index] = 'hello3'
                            db.sync pojo3, (err, obj, infos) ->
                                expect(err).to.be.null
                                expect(infos.dbTouched).to.be.true
                                db.count (err, count) ->
                                    expect(err).to.be.null
                                    expect(count).to.be.equal 3
                                    done()

        it 'should return the number of item of the specified type', (done) ->
            pojo = {_type: 'Test'}
            pojo[f.title] = 'hello'
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                db.count (err, count) ->
                    expect(err).to.be.null
                    expect(count).to.be.equal 1
                    pojo2 = {_type: 'Test2'}
                    pojo2[f.index] = 'hello2'
                    db.sync pojo2, (err, obj, infos) ->
                        expect(err).to.be.null
                        expect(infos.dbTouched).to.be.true
                        db.count (err, count) ->
                            expect(err).to.be.null
                            expect(count).to.be.equal 2
                            pojo3 = {_type: 'Test3'}
                            pojo3[f.index] = 'hello3'
                            db.sync pojo3, (err, obj, infos) ->
                                expect(err).to.be.null
                                expect(infos.dbTouched).to.be.true
                                db.count {_type: 'Test'}, (err, count) ->
                                    expect(err).to.be.null
                                    expect(count).to.be.equal 1
                                    done()


    describe '.delete()', () ->
        it 'should delete an item from its id and type', (done) ->
            pojo = {_type: 'Test'}
            pojo[f.title] = 'bar'
            pojo[f.index] = 2
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null
                db.count (err, count) ->
                    expect(err).to.be.null
                    db.delete {_id: obj._id, _type: obj._type}, (err) ->
                        expect(err).to.be.null
                        db.count (err, count) ->
                            expect(count).to.be.equal 0
                            done()


    describe.skip '.changes()', () ->

        it 'should return the changes of a simple object', (done) ->
            pojo = {}
            pojo[f.title] = 'arf'
            pojo[f.index] = 2
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                obj[f.index] = 3
                obj[f.foo] = 'bar'
                delete obj[f.title]
                changes = db.changes(obj)
                expect(changes.added[f.foo]).to.be.equal 'bar'
                expect(changes.added[f.index]).to.be.equal 3
                expect(changes.removed[f.index]).to.be.equal 2
                done()

        it 'should return the changes of a i18n object', (done) ->
            pojo = {}
            pojo[f.title] = {en: 'foo', fr: 'toto'}
            pojo[f.foo] = 'old'
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null

                # literal
                obj[f.foo] = 'changed'
                obj[f.index] = 'new'
                # i18n field
                obj[f.title].en = 'changed'
                obj[f.title].es = 'otros'
                delete obj[f.title].fr

                changes = db.changes(obj)

                # literal field
                expect(changes.added[f.foo]).to.be.equal 'changed'
                expect(changes.removed[f.foo]).to.be.equal 'old'
                expect(changes.added[f.index]).to.be.equal 'new'
                # i18n field
                expect(changes.added[f.title].en).to.be.equal 'changed'
                expect(changes.removed[f.title].fr).to.be.equal 'toto'
                expect(changes.removed[f.title].en).to.be.equal 'foo'
                expect(changes.added[f.title].es).to.be.equal 'otros'
                done()

        it 'should return the changes of a multi object', (done) ->
            pojo = {}
            pojo[f.index] = [1, 2, 3]
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null

                # multi field
                obj[f.index][0] = -1
                delete obj[f.index][1]
                obj[f.index].push 'changed'

                changes = db.changes(obj)

                # multi field
                expect(changes.added[f.index]).to.include.members [-1, 'changed']
                expect(changes.removed[f.index]).to.include.members [2, 1]
                done()

        it 'should return the changes of a multi-i18n object', (done) ->
            pojo = {}
            pojo[f.index] = {en: ['1', '3', '5'], fr: ['2', '4', '6']}
            db.sync pojo, (err, obj, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(obj._id).to.be.not.null

                # multi i18n field
                delete obj[f.index].en[1]
                obj[f.index].en[0] = '-1'
                obj[f.index].en.push '7'
                obj[f.index].es = ['10', '11', '12']

                changes = db.changes(obj)

                # multi i18n field
                expect(changes.added[f.index].en).to.include.members ['-1', '7']
                expect(changes.added[f.index].en).to.not.include.members ['1', '3']
                expect(changes.removed[f.index].en).to.include.members ['1', '3']
                expect(changes.added[f.index].fr).to.be.undefined
                expect(changes.added[f.index].es).to.include.members ['10', '11', '12']
                done()

