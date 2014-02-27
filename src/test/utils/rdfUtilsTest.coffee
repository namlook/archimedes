
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect
async = require 'async'
config = require('../config')
rdfutils = require '../../rdf/utils'
db = config.Database()

if db.dbtype isnt 'rdf'
    console.log "Database is not an RDF database (got #{db.dbtype}). Skipping..."
    return

describe 'RDF utils', ()->

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

    describe 'field2uri', () ->
        it "should convert a model field name into its related uri", () ->
            literal = new db.Literal {
                integer: 1,
                string: "test"
            }
            literal.save (err) ->
                expect(err).to.be.null
                uri = "http://onto.example.org/properties/string"
                expect(rdfutils.field2uri('string', db.Literal)).to.be.equal uri


        it "should convert a chained field names into its related uri", () ->
            one = new db.One {
                literal: new db.Literal {
                    integer: 1,
                    string: "test"
                    inner: new db.Inner({string: 'hello'})

                }
            }
            one.save (err) ->
                expect(err).to.be.null
                uri = "http://onto.example.org/properties/literal->http://onto.example.org/properties/inner->http://onto.example.org/properties/string"
                expect(rdfutils.field2uri('literal.inner.string', db.One)).to.be.equal uri



