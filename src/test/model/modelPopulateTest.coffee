
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

_ = require 'underscore'
config = require('../config')

describe 'model relations', ()->

    models = {}

    class models.Inner extends config.Model
        schema:
            string:
                type: 'string'
            inner2:
                type: 'Inner2'

    class models.Inner2 extends config.Model
        schema:
            string:
                type: 'string'
            inner:
                type: 'Inner'

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
            inner2:
                type: 'Inner2'
                multi: true


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
                db.One.find savedOne.reference(), (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    fetchedOne = results[0]
                    expect(fetchedOne.get('literal')).to.be.a('string')

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

                db.One.find savedOne.reference(), (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    fetchedOne = results[0]
                    expect(fetchedOne.get('literal')).to.be.a('string')

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

        it 'should populate inner relation fields from differents type', (done) ->
            inner = new db.Inner
            inner.set 'string', 'foo'

            inner2 = new db.Inner2
            inner2.set 'string', 'bar'

            inner2bis = new db.Inner2
            inner2bis.set 'string', 'bar bis'

            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            literal.set 'inner', inner
            literal.set 'inner2', [inner2, inner2bis]

            one = new db.One
            one.set 'literal', literal

            one.save (err, savedOne, infos) ->
                expect(err).to.be.null
                expect(infos.dbTouched).to.be.true
                expect(one.id).to.be.not.null

                db.One.find savedOne.reference(), (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    fetchedOne = results[0]
                    expect(fetchedOne.get('literal')).to.be.a('string')

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

        it 'should populate only specified fields', (done) ->
            inner2 = new db.Inner2
            inner2.set 'string', 'bar'

            inner = new db.Inner
            inner.set 'string', 'foo'
            inner.set 'inner2', inner2

            literal = new db.Literal
            literal.set 'inner', inner

            literal.save (err) ->
                expect(err) .to.be.null
                db.Literal.first literal.reference(), (err, fetchLiteral) ->
                    expect(err).to.be.null
                    expect(fetchLiteral.get('inner')).to.be.a('string')
                    fetchLiteral.populate ['inner'], (err) ->
                        expect(err).to.be.null
                        expect(fetchLiteral.get('inner').get('string')).to.be.equal 'foo'
                        expect(fetchLiteral.get('inner').get('inner2')).to.be.a('string')
                        return done();

        it 'should populate recursively only specified fields', (done) ->
            inner2 = new db.Inner2
            inner2.set 'string', 'bar'

            inner = new db.Inner
            inner.set 'string', 'foo'
            inner.set 'inner2', inner2

            literal = new db.Literal
            literal.set 'inner', inner

            literal.save (err) ->
                expect(err) .to.be.null
                db.Literal.first literal.reference(), (err, fetchLiteral) ->
                    expect(err).to.be.null
                    expect(fetchLiteral.get('inner')).to.be.a('string')
                    fetchLiteral.populate ['inner'], {recursive: true}, (err) ->
                        expect(err).to.be.null
                        expect(fetchLiteral.get('inner').get('string')).to.be.equal 'foo'
                        expect(fetchLiteral.get('inner').get('inner2').get('string')).to.be.equal 'bar'
                        return done();

        it 'should populate into a specific level of recursivity', (done) ->
            inner = new db.Inner
            inner.set 'string', 'foo'

            inner2 = new db.Inner2
            inner2.set 'string', 'bar'
            inner2.set 'inner', new db.Inner({string: 'foo2'})

            inner.set 'inner2', inner2

            literal = new db.Literal
            literal.set 'inner', inner

            literal.save (err, savedLiteral) ->
                expect(err) .to.be.null
                db.Literal.first savedLiteral.reference(), (err, fetchLiteral) ->
                    expect(err).to.be.null
                    expect(fetchLiteral.get('inner')).to.be.a('string')
                    fetchLiteral.populate ['inner'], {recursive: 3}, (err, fetchLiteral) ->
                        expect(err).to.be.null
                        expect(fetchLiteral.get('inner').get('string')).to.be.equal 'foo'
                        expect(fetchLiteral.get('inner').get('inner2').get('string')).to.be.equal 'bar'
                        expect(fetchLiteral.get('inner').get('inner2').get('inner')).to.not.be.a('string')
                        expect(fetchLiteral.get('inner').get('inner2').get('inner').get('string')).to.be.equal 'foo2'
                        db.Literal.first savedLiteral.reference(), (err, fetchLiteral2) ->
                            expect(err).to.be.null
                            expect(fetchLiteral2.get('inner')).to.be.a('string')
                            fetchLiteral2.populate ['inner'], {recursive: 2}, (err) ->
                                expect(err).to.be.null
                                expect(fetchLiteral2.get('inner').get('string')).to.be.equal 'foo'
                                expect(fetchLiteral2.get('inner').get('inner2').get('string')).to.be.equal 'bar'
                                expect(fetchLiteral2.get('inner').get('inner2').get('inner')).to.be.a('string')
                                fetchLiteral2.get('inner').get('inner2').populate ['inner'], {recursive: 1}, (err) ->
                                    expect(err).to.be.null
                                    expect(fetchLiteral2.get('inner').get('inner2').get('inner').get('string')).to.be.equal 'foo2'
                                    return done();


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
                db.One.first savedOne.reference(), {populate: true}, (err, result) ->
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

                db.One.first savedOne.reference(), {populate: true}, (err, fetchedOne) ->
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


        it 'should populate into a specific level of recursivity', (done) ->
            inner = new db.Inner
            inner.set 'string', 'foo'

            inner2 = new db.Inner2
            inner2.set 'string', 'bar'
            inner2.set 'inner', new db.Inner({string: 'foo2'})

            inner.set 'inner2', inner2

            literal = new db.Literal
            literal.set 'inner', inner

            literal.save (err, savedLiteral) ->
                expect(err) .to.be.null
                db.Literal.first savedLiteral.reference(), {populate: 2}, (err, fetchLiteral) ->
                    expect(err).to.be.null
                    expect(fetchLiteral.get('inner').get('string')).to.be.equal 'foo'
                    expect(fetchLiteral.get('inner').get('inner2').get('string')).to.be.equal 'bar'
                    expect(fetchLiteral.get('inner').get('inner2').get('inner')).to.be.a('string')
                    db.Literal.first savedLiteral.reference(), {populate: 3}, (err, fetchLiteral) ->
                        expect(err).to.be.null
                        expect(fetchLiteral.get('inner').get('string')).to.be.equal 'foo'
                        expect(fetchLiteral.get('inner').get('inner2').get('string')).to.be.equal 'bar'
                        expect(fetchLiteral.get('inner').get('inner2').get('inner')).to.not.be.a('string')
                        expect(fetchLiteral.get('inner').get('inner2').get('inner').get('string')).to.be.equal 'foo2'
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
                db.One.find savedOne.reference(), {populate: true}, (err, results) ->
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

                db.One.find savedOne.reference(), {populate: true}, (err, results) ->
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

        it 'should populate into a specific level of recursivity', (done) ->
            inner = new db.Inner
            inner.set 'string', 'foo'

            inner2 = new db.Inner2
            inner2.set 'string', 'bar'
            inner2.set 'inner', new db.Inner({string: 'foo2'})

            inner.set 'inner2', inner2

            literal = new db.Literal
            literal.set 'inner', inner

            literal.save (err, savedLiteral) ->
                expect(err) .to.be.null
                db.Literal.find savedLiteral.reference(), {populate: 2}, (err, fetchLiterals) ->
                    expect(err).to.be.null
                    expect(fetchLiterals[0].get('inner').get('string')).to.be.equal 'foo'
                    expect(fetchLiterals[0].get('inner').get('inner2').get('string')).to.be.equal 'bar'
                    expect(fetchLiterals[0].get('inner').get('inner2').get('inner')).to.be.a('string')
                    db.Literal.find savedLiteral.reference(), {populate: 3}, (err, fetchLiterals) ->
                        expect(err).to.be.null
                        expect(fetchLiterals[0].get('inner').get('string')).to.be.equal 'foo'
                        expect(fetchLiterals[0].get('inner').get('inner2').get('string')).to.be.equal 'bar'
                        expect(fetchLiterals[0].get('inner').get('inner2').get('inner')).to.not.be.a('string')
                        expect(fetchLiterals[0].get('inner').get('inner2').get('inner').get('string')).to.be.equal 'foo2'
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
                db.Multi.find savedMulti.reference(), (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    fetchedMulti = results[0]
                    (expect(i).to.be.a('string') for i in fetchedMulti.get('literals'))

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
                db.Multi.find savedMulti.reference(), (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    fetchedMulti = results[0]
                    (expect(i).to.be.a('string') for i in fetchedMulti.get('literals'))

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

        it 'should populate into a specific level of recursivity', (done) ->
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
                db.Multi.find savedMulti.reference(), {populate: 1}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    fetchedMulti = results[0]
                    for literal in fetchedMulti.get('literals')
                        expect(literal).to.not.be.a('string')
                        expect(literal.get('inner')).to.be.a('string')
                    db.Multi.find savedMulti.reference(), {populate: 2}, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 1
                        fetchedMulti = results[0]
                        for literal in fetchedMulti.get('literals')
                            expect(literal).to.not.be.a('string')
                            expect(literal.get('inner')).to.not.be.a('string')
                            expect(literal.get('inner').get('string')).to.be.a('string')
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
                db.Multi.first savedMulti.reference(), {populate: true}, (err, populatedMulti) ->
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
                db.Multi.first savedMulti.reference(), {populate: true}, (err, populatedMulti) ->
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
                db.Multi.find multi.reference(), {populate: true}, (err, results) ->
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
                db.Multi.find savedMulti.reference(), {populate: true}, (err, results) ->
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

    describe '.find(fields)', () ->
        it 'should returns only the specified fields', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            # literal.set 'inner', new db.Inner {string: 'foo'}

            literal2 = new db.Literal
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal2.set 'date', new Date(2014, 1, 2)
            # literal2.set 'inner', new db.Inner {string: 'bar'}

            db.batchSync [literal, literal2], (err, data) ->
                expect(err).to.be.null
                db.Literal.find {}, {fields: ['string', 'integer'], sortBy: 'integer'}, (err, results) ->
                    expect(err).to.be.null
                    expect(results[0].get('string')).to.be.equal 'hello'
                    expect(results[0].get('integer')).to.be.equal 2
                    expect(results[0].get('date')).to.not.exist
                    expect(results[0].get('i18n', 'en')).to.not.exist

                    expect(results[1].get('string')).to.be.equal 'hi'
                    expect(results[1].get('integer')).to.be.equal 3
                    expect(results[1].get('date')).to.not.exist
                    expect(results[1].get('i18n', 'en')).to.not.exist
                    done();
