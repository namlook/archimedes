
expect = require('chai').expect
_ = require 'underscore'
config = require('../config')

describe 'model relations', ()->

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
            literals:
                type: 'Literal'
                multi: true


    db = config.Database()
    db.registerModels models

    beforeEach (done) ->
        db.clear done

    describe '.populate() [One]', () ->
        it 'should populate the relation fields', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            one = new db.One
            one.set 'literal', literal
            one.save (err, savedOne, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(one.id).to.be.not.null
                db.One.find savedOne.id, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    fetchedOne = results[0]
                    expect(fetchedOne.get('literal')).to.be.string

                    fetchedOne.populate (err, populatedOne) ->
                        expect(err).to.be.null
                        obj = populatedOne.get('literal')
                        expect(obj.get 'i18n', 'en').to.be.equal 'hello'
                        expect(obj.get 'i18n', 'fr').to.be.equal 'salut'
                        expect(obj.get 'string').to.be.equal 'hello'
                        expect(obj.get 'integer').to.be.equal 2
                        expect(obj.get('date').toISOString()).to.be.equal(
                            literal.get('date').toISOString())
                        done()

        it 'should populate inner relation fields', (done) ->
            inner = new db.Inner
            inner.set 'string', 'foo'

            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            literal.set 'inner', inner

            one = new db.One
            one.set 'literal', literal

            one.save (err, savedOne, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(one.id).to.be.not.null

                db.One.find savedOne.id, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    fetchedOne = results[0]
                    expect(fetchedOne.get('literal')).to.be.string

                    fetchedOne.populate {recursive: true}, (err, populatedOne) ->
                        expect(err).to.be.null
                        obj = populatedOne.get('literal')
                        expect(obj.get('inner').get('string')).to.be.equal 'foo'
                        expect(obj.get 'i18n', 'en').to.be.equal 'hello'
                        expect(obj.get 'i18n', 'fr').to.be.equal 'salut'
                        expect(obj.get 'string').to.be.equal 'hello'
                        expect(obj.get 'integer').to.be.equal 2
                        expect(obj.get('date').toISOString()).to.be.equal(
                            literal.get('date').toISOString())
                        done()


    describe '.first() [One]', () ->
        it 'should populate the first doc that match the id', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            one = new db.One
            one.set 'literal', literal
            one.save (err, savedOne, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(one.id).to.be.not.null
                db.One.first savedOne.id, {populate: true}, (err, result) ->
                    expect(err).to.be.null
                    obj = result.get 'literal'
                    expect(obj.get 'i18n', 'en').to.be.equal 'hello'
                    expect(obj.get 'i18n', 'fr').to.be.equal 'salut'
                    expect(obj.get 'string').to.be.equal 'hello'
                    expect(obj.get 'integer').to.be.equal 2
                    expect(obj.get('date').toISOString()).to.be.equal(
                        literal.get('date').toISOString())
                    done()

        it 'should populate inner relation fields', (done) ->
            inner = new db.Inner
            inner.set 'string', 'foo'

            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            literal.set 'inner', inner

            one = new db.One
            one.set 'literal', literal

            one.save (err, savedOne, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(one.id).to.be.not.null

                db.One.first savedOne.id, {populate: true}, (err, fetchedOne) ->
                    expect(err).to.be.null
                    obj = fetchedOne.get('literal')
                    expect(obj.get('inner').get('string')).to.be.equal 'foo'
                    expect(obj.get 'i18n', 'en').to.be.equal 'hello'
                    expect(obj.get 'i18n', 'fr').to.be.equal 'salut'
                    expect(obj.get 'string').to.be.equal 'hello'
                    expect(obj.get 'integer').to.be.equal 2
                    expect(obj.get('date').toISOString()).to.be.equal(
                        literal.get('date').toISOString())
                    done()


    describe '.find() [One]', () ->
        it 'should populate all docs that match the query', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            one = new db.One
            one.set 'literal', literal
            one.save (err, savedOne, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(one.id).to.be.not.null
                db.One.find savedOne.id, {populate: true}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    obj = results[0].get 'literal'
                    expect(obj.get 'i18n', 'en').to.be.equal 'hello'
                    expect(obj.get 'i18n', 'fr').to.be.equal 'salut'
                    expect(obj.get 'string').to.be.equal 'hello'
                    expect(obj.get 'integer').to.be.equal 2
                    expect(obj.get('date').toISOString()).to.be.equal(
                        literal.get('date').toISOString())
                    done()


        it 'should populate inner relation fields', (done) ->
            inner = new db.Inner
            inner.set 'string', 'foo'

            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            literal.set 'inner', inner

            one = new db.One
            one.set 'literal', literal

            one.save (err, savedOne, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(one.id).to.be.not.null

                db.One.find savedOne.id, {populate: true}, (err, results) ->
                    expect(err).to.be.null
                    fetchedOne = results[0]
                    obj = fetchedOne.get('literal')
                    expect(obj.get('inner').get('string')).to.be.equal 'foo'
                    expect(obj.get 'i18n', 'en').to.be.equal 'hello'
                    expect(obj.get 'i18n', 'fr').to.be.equal 'salut'
                    expect(obj.get 'string').to.be.equal 'hello'
                    expect(obj.get 'integer').to.be.equal 2
                    expect(obj.get('date').toISOString()).to.be.equal(
                        literal.get('date').toISOString())
                    done()


    describe '.populate() [Multi]', () ->
        it 'should populate the relation fields', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)

            literal2 = new db.Literal
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal2.set 'date', new Date(2014, 1, 2)

            multi = new db.Multi
            multi.push 'literals', literal
            multi.push 'literals', literal2

            multi.save (err, savedMulti, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(multi.id).to.be.not.null
                db.Multi.find savedMulti.id, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    fetchedMulti = results[0]
                    (expect(i).to.be.string for i in fetchedMulti.get('literals'))

                    fetchedMulti.populate {recursive: true}, (err, populatedMulti) ->
                        literals = populatedMulti.get('literals')
                        i18nen = (l.get('i18n', 'en') for l in literals)
                        expect(i18nen).to.be.include.members ['hello', 'bye']
                        i18nfr = (l.get('i18n', 'fr') for l in literals)
                        expect(i18nfr).to.be.include.members ['salut', 'au revoir']
                        strings = (l.get('string') for l in literals)
                        expect(strings).to.be.include.members ['hello', 'hi']
                        integers = (l.get('integer') for l in literals)
                        expect(integers).to.be.include.members [2, 3]
                        dates = (l.get('date').toISOString() for l in literals)
                        expect(dates).to.be.include.members [
                            new Date(2014, 1, 1).toISOString()
                            new Date(2014, 1, 2).toISOString()
                        ]
                        done()

        it 'should populate inner relation fields', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            literal.set 'inner', new db.Inner {string: 'foo'}

            literal2 = new db.Literal
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal2.set 'date', new Date(2014, 1, 2)
            literal2.set 'inner', new db.Inner {string: 'bar'}

            multi = new db.Multi
            multi.push 'literals', literal
            multi.push 'literals', literal2

            multi.save (err, savedMulti, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(multi.id).to.be.not.null
                db.Multi.find savedMulti.id, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    fetchedMulti = results[0]
                    (expect(i).to.be.string for i in fetchedMulti.get('literals'))

                    fetchedMulti.populate {recursive: true}, (err, populatedMulti) ->
                        literals = populatedMulti.get('literals')
                        inners = (l.get('inner').get('string') for l in literals)
                        expect(inners).to.be.include.members ['foo', 'bar']
                        i18nen = (l.get('i18n', 'en') for l in literals)
                        expect(i18nen).to.be.include.members ['hello', 'bye']
                        i18nfr = (l.get('i18n', 'fr') for l in literals)
                        expect(i18nfr).to.be.include.members ['salut', 'au revoir']
                        strings = (l.get('string') for l in literals)
                        expect(strings).to.be.include.members ['hello', 'hi']
                        integers = (l.get('integer') for l in literals)
                        expect(integers).to.be.include.members [2, 3]
                        dates = (l.get('date').toISOString() for l in literals)
                        expect(dates).to.be.include.members [
                            new Date(2014, 1, 1).toISOString()
                            new Date(2014, 1, 2).toISOString()
                        ]
                        done()


    describe '.first() [Multi]', () ->
        it 'should populate the first doc that match the id', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)

            literal2 = new db.Literal
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal2.set 'date', new Date(2014, 1, 2)

            multi = new db.Multi
            multi.push 'literals', literal
            multi.push 'literals', literal2

            multi.save (err, savedMulti, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(multi.id).to.be.not.null
                db.Multi.first savedMulti.id, {populate: true}, (err, populatedMulti) ->
                    expect(err).to.be.null
                    literals = populatedMulti.get('literals')
                    i18nen = (l.get('i18n', 'en') for l in literals)
                    expect(i18nen).to.be.include.members ['hello', 'bye']
                    i18nfr = (l.get('i18n', 'fr') for l in literals)
                    expect(i18nfr).to.be.include.members ['salut', 'au revoir']
                    strings = (l.get('string') for l in literals)
                    expect(strings).to.be.include.members ['hello', 'hi']
                    integers = (l.get('integer') for l in literals)
                    expect(integers).to.be.include.members [2, 3]
                    dates = (l.get('date').toISOString() for l in literals)
                    expect(dates).to.be.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 1, 2).toISOString()
                    ]
                    done()

        it 'should populate inner relation fields', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            literal.set 'inner', new db.Inner {string: 'foo'}

            literal2 = new db.Literal
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal2.set 'date', new Date(2014, 1, 2)
            literal2.set 'inner', new db.Inner {string: 'bar'}

            multi = new db.Multi
            multi.push 'literals', literal
            multi.push 'literals', literal2

            multi.save (err, savedMulti, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(multi.id).to.be.not.null
                db.Multi.first savedMulti.id, {populate: true}, (err, populatedMulti) ->
                    expect(err).to.be.null
                    literals = populatedMulti.get('literals')
                    inners = (l.get('inner').get('string') for l in literals)
                    expect(inners).to.be.include.members ['foo', 'bar']
                    i18nen = (l.get('i18n', 'en') for l in literals)
                    expect(i18nen).to.be.include.members ['hello', 'bye']
                    i18nfr = (l.get('i18n', 'fr') for l in literals)
                    expect(i18nfr).to.be.include.members ['salut', 'au revoir']
                    strings = (l.get('string') for l in literals)
                    expect(strings).to.be.include.members ['hello', 'hi']
                    integers = (l.get('integer') for l in literals)
                    expect(integers).to.be.include.members [2, 3]
                    dates = (l.get('date').toISOString() for l in literals)
                    expect(dates).to.be.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 1, 2).toISOString()
                    ]
                    done()

    describe '.find() [Multi]', () ->
        it 'should populate the docs that match the ids', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)

            literal2 = new db.Literal
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal2.set 'date', new Date(2014, 1, 2)

            multi = new db.Multi
            multi.push 'literals', literal
            multi.push 'literals', literal2

            multi.save (err, saved, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                db.Multi.find multi.id, {populate: true}, (err, results) ->
                    expect(err).to.be.null
                    populatedMulti = results[0]
                    literals = populatedMulti.get('literals')
                    i18nen = (l.get('i18n', 'en') for l in literals)
                    expect(i18nen).to.be.include.members ['hello', 'bye']
                    i18nfr = (l.get('i18n', 'fr') for l in literals)
                    expect(i18nfr).to.be.include.members ['salut', 'au revoir']
                    strings = (l.get('string') for l in literals)
                    expect(strings).to.be.include.members ['hello', 'hi']
                    integers = (l.get('integer') for l in literals)
                    expect(integers).to.be.include.members [2, 3]
                    dates = (l.get('date').toISOString() for l in literals)
                    expect(dates).to.be.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 1, 2).toISOString()
                    ]
                    done()

        it 'should populate inner relation fields', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            literal.set 'inner', new db.Inner {string: 'foo'}

            literal2 = new db.Literal
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal2.set 'date', new Date(2014, 1, 2)
            literal2.set 'inner', new db.Inner {string: 'bar'}

            multi = new db.Multi
            multi.push 'literals', literal
            multi.push 'literals', literal2

            multi.save (err, savedMulti, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(multi.id).to.be.not.null
                db.Multi.find savedMulti.id, {populate: true}, (err, results) ->
                    expect(err).to.be.null
                    populatedMulti = results[0]
                    literals = populatedMulti.get('literals')
                    inners = (l.get('inner').get('string') for l in literals)
                    expect(inners).to.be.include.members ['foo', 'bar']
                    i18nen = (l.get('i18n', 'en') for l in literals)
                    expect(i18nen).to.be.include.members ['hello', 'bye']
                    i18nfr = (l.get('i18n', 'fr') for l in literals)
                    expect(i18nfr).to.be.include.members ['salut', 'au revoir']
                    strings = (l.get('string') for l in literals)
                    expect(strings).to.be.include.members ['hello', 'hi']
                    integers = (l.get('integer') for l in literals)
                    expect(integers).to.be.include.members [2, 3]
                    dates = (l.get('date').toISOString() for l in literals)
                    expect(dates).to.be.include.members [
                        new Date(2014, 1, 1).toISOString()
                        new Date(2014, 1, 2).toISOString()
                    ]
                    done()

