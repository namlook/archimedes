
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

Model = require('../interface').Model
# Database = require('../interface').Database
Database = require('./config').Database


describe "Model's inheritance:", ()->

    models = {}

    class models.A extends Model
        schema:
            afield:
                readOnly: true
                type: 'string'
            foo:
                type: 'string'
            all:
                type: 'integer'

    class models.B extends models.A
        schema:
            foo:
                readOnly: true
            bfield:
                type: 'string'
            all:
                type: 'string'


    class models.C extends models.B
        schema:
            foo:
                readOnly: false
            cfield:
                type: 'string'

    db = Database()

    db.registerModels models

    describe 'schema', () ->
        it 'should inherite the schema structure', () ->
            c = new db.C
            expect(c.schema).to.include.key('foo')
            expect(c.schema).to.include.key('afield')
            expect(c.schema).to.include.key('bfield')
            expect(c.schema).to.include.key('cfield')

            c.set 'foo', 'foo'
            c.set 'afield', 'afield'
            c.set 'bfield', 'foo'
            c.set 'cfield', 'foo'

            expect(c.schema.afield.type).to.be.equal 'string'
            expect(c.schema.all.type).to.be.equal 'integer'

        it 'should inherite readOnly fields', () ->
            c = new db.C
            c.set 'afield', 'foo'
            expect(-> c.set 'afield', 'foo2').to.throw('C.afield is read-only')

        it 'should overwrite readOnly fields', () ->
            c = new db.C
            c.set 'foo', 'bar'
            c.set 'foo', 'bar2'
            expect(c.get 'foo').to.be.equal 'bar2'





