chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

_ = require 'underscore'
config = require('../config')

describe.skip 'model.find[fields]', ()->

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
                required: true
            integer:
                type: 'integer'
            float:
                type: 'float'
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

    describe '.find(fields) [simple]', () ->
        it 'should keep only specified fields', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'float', 4.3
            literal.set 'date', new Date(2014, 1, 1)

            literal2 = new db.Literal
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal.set 'float', 3.4
            literal2.set 'date', new Date(2014, 1, 2)

            db.batchSync [literal, literal2], (err, data) ->
                expect(err).to.be.null

                db.Literal.find {}, {fields: {string: 1, integer: 1}}, (err, results) ->
                    expect(err).to.be.null
                    console.log(i.toJSONObject() for i in results)
                    expect(results.length).to.be.equal 2
                    for item in results
                        expect(item.get('string')).to.exist
                        expect(item.get('integer')).to.exist
                        expect(item.get('float')).to.not.exist
                        expect(item.get('date')).to.not.exist
                        expect(item.get('i18n', 'en')).to.not.exist
                    done()


        it 'should remove specified fields', (done) ->
            literal = new db.Literal
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'float', 4.3
            literal.set 'date', new Date(2014, 1, 1)

            literal2 = new db.Literal
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal2.set 'float', 3.4
            literal2.set 'date', new Date(2014, 1, 2)

            db.batchSync [literal, literal2], (err, data) ->
                expect(err).to.be.null

                db.Literal.find {}, {fields: {string: 0, integer: 0}}, (err, results) ->
                    console.log(i.toJSONObject() for i in results)
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    for item in results
                        expect(item.get('string')).to.not.exist
                        expect(item.get('integer')).to.not.exist
                        expect(item.get('float')).to.exist
                        expect(item.get('date')).to.exist
                        expect(item.get('i18n', 'en')).to.exist
                    done()

        it 'should keep specified relations fields', (done) ->
            literal = new db.Literal
            literal.set '_id', 'literal1'
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)
            one = new db.One
            one.set 'literal', literal

            literal2 = new db.Literal
            literal2.set '_id', 'literal2'
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal.set 'float', 3.4
            literal2.set 'date', new Date(2014, 1, 2)
            two = new db.One
            two.set 'literal', literal2

            db.batchSync [one, two], (err, data) ->
                expect(err).to.be.null

                db.One.find {}, {fields: {literal: 1}}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 2
                    for item in results
                        expect(item.get('literal')).to.exist
                    done()

    describe '.find(fields) [deep]', () ->
        it 'should keep specified fields in relations', (done) ->
            startTime = Date.now()
            literal = new db.Literal
            literal.set '_id', 'literal1'
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)

            literal2 = new db.Literal
            literal2.set '_id', 'literal2'
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal.set 'float', 3.4
            literal2.set 'date', new Date(2014, 1, 2)

            db.batchSync [literal, literal2], (err) ->
                expect(err).to.be.null

                one = new db.One
                one.set 'literal', literal

                two = new db.One
                two.set 'literal', literal2

                db.batchSync [one, two], (err, data) ->
                    expect(err).to.be.null

                    db.One.find {}, {fields: {'literal.integer': 1, 'literal.string': 1}}, (err, results) ->
                        expect(err).to.be.null
                        expect(results.length).to.be.equal 2
                        for item in results
                            expect(item.get('literal')).to.exist
                            expect(item.get('literal').get('integer')).to.exist
                            expect(item.get('literal').get('string')).to.exist
                            expect(item.get('literal').get('date')).to.not.exist
                            expect(item.get('literal').get('i18n', 'en')).to.not.exist
                        console.log(Date.now() - startTime)
                        done()

        it 'should throw an error if there are relation fields and no required fields', (done) ->
            startTime = Date.now()
            literal = new db.Literal
            literal.set '_id', 'literal1'
            literal.set 'i18n', 'hello', 'en'
            literal.set 'i18n', 'salut', 'fr'
            literal.set 'string', 'hello'
            literal.set 'integer', 2
            literal.set 'date', new Date(2014, 1, 1)

            literal2 = new db.Literal
            literal2.set '_id', 'literal2'
            literal2.set 'i18n', 'bye', 'en'
            literal2.set 'i18n', 'au revoir', 'fr'
            literal2.set 'string', 'hi'
            literal2.set 'integer', 3
            literal.set 'float', 3.4
            literal2.set 'date', new Date(2014, 1, 2)

            db.batchSync [literal, literal2], (err) ->
                expect(err).to.be.null

                one = new db.One
                one.set 'literal', literal

                two = new db.One
                two.set 'literal', literal2

                db.batchSync [one, two], (err, data) ->
                    expect(err).to.be.null

                    db.One.find {}, {fields: {'literal.integer': 1, 'literal.date': 1}}, (err, results) ->
                        expect(err).to.be.equal "Error: you must pass at least filter on a required field"
                        done()


        it 'should return the specified field of a multi relations', (done) ->
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
            literal.set 'inner2', [inner2, inner2bis]

            one = new db.One
            one.set 'literal', literal

            one.save (err, savedOne, infos) ->
                expect(err).to.be.null

                db.One.find {}, {fields: {'!literal.inner2.string': 1}}, (err, results) ->
                    expect(err).to.be.null
                    console.log '::::=====', results
                    done();
