
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

_ = require 'underscore'
config = require('../config')

describe 'model inverse relations', ()->

    models = {}

    class models.Inner extends config.Model
        schema:
            string:
                type: 'string'
            # inner2:
            #     type: 'Inner2'

    class models.Inner2 extends config.Model
        schema:
            string:
                type: 'string'
            # inner:
            #     type: 'Inner'

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
                inverse: 'literals'
            inner2:
                type: 'Inner2'
                # multi: true
                inverse: 'literals'


    class models.One extends config.Model
        schema:
            title:
                type: 'string'
            inner:
                type: 'Inner'
                inverse: 'ones'
            literal:
                type: 'Literal'
                required: true
                inverse: 'ones'

    class models.Multi extends config.Model
        schema:
            literals:
                type: 'Literal'
                multi: true


    db = config.Database()
    db.registerModels models

    beforeEach (done) ->
        db.clear done

    describe '.find(inverse) [One]', () ->
        it 'should return the results with inverse relation in query', (done) ->

            inner = new db.Inner
            inner.set '_id', 'inner1'
            inner.set 'string', 'foo'

            innerbis = new db.Inner
            innerbis.set '_id', 'innerbis'
            innerbis.set 'string', 'foo bis'

            literal = new db.Literal
            literal.set '_id', 'literal1'
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            literal.set 'inner', inner

            one = new db.One
            one.set '_id', 'one1'
            one.set 'title', 'hello'
            one.set 'inner', innerbis
            one.set 'literal', literal

            two = new db.One
            two.set '_id', 'one2'
            two.set 'title', 'hello'
            two.set 'inner', inner
            two.set 'literal', literal

            db.batchSync [inner, innerbis, literal, one, two], (err) ->
                expect(err).to.be.null

                db.Literal.find {'ones.inner.string': 'foo bis'}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].get '_id').to.be.equal 'literal1'
                    done()

        it 'should return the results with inverse relation in deep query', (done) ->

            inner = new db.Inner
            inner.set '_id', 'inner1'
            inner.set 'string', 'foo'

            innerbis = new db.Inner
            innerbis.set 'string', 'foo bis'


            inner2 = new db.Inner2
            inner2.set 'string', 'bar'

            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            literal.set 'inner', inner
            literal.set 'inner2', inner2

            one = new db.One
            one.set '_id', 'one1'
            one.set 'title', 'hello'
            one.set 'inner', innerbis
            one.set 'literal', literal
            one.save (err, savedOne, infos) ->
                expect(err).to.be.null

                db.Inner.find {'literals.ones.inner.string': 'foo bis'}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 1
                    expect(results[0].get '_id').to.be.equal 'inner1'
                    done()


