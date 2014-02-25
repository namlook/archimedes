
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect
async = require 'async'
config = require('../config')
db = config.Database()

if db.dbtype isnt 'rdf'
    console.log "Database is not an RDF database (got #{db.dbtype}). Skipping..."
    return

describe 'model deep find', ()->

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


    describe 'simple', () ->
        it 'should be able to query on relations', (done) ->
            ones  = []
            for i in [1..15]
                ones.push new db.One {
                    literal: new db.Literal {integer: i, string: "#{i%2}"}
                }
             async.map ones, (one, cb) ->
                one.save cb
            , (err, results) ->
                expect(err).to.be.null
                db.One.find {'literal.string': "1"}, {populate: true}, (err, results) ->
                    expect(err).to.be.null
                    expect(results.length).to.be.equal 8
                    expect(
                        (1 for r in results when r.get('literal').get('string') is "1").length
                    ).to.be.equal 8
                    done()


        it 'should return an error if quering a unknown field', (done) ->
            ones  = []
            for i in [1..15]
                ones.push new db.One {
                    literal: new db.Literal {integer: i, string: "#{i%2}"}
                }
             async.map ones, (one, cb) ->
                one.save cb
            , (err, results) ->
                expect(err).to.be.null
                db.One.find {'literal.arf': "1"}, (err, results) ->
                    expect(err).to.be.equal "Unknown field Literal.arf"
                    expect(results).to.be.undefined
                    done()

