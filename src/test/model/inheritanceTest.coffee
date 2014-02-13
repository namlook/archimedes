
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

config = require('../config')


describe "Model's inheritance:", ()->

    models = {}

    class models.A extends config.Model
        schema:
            afield:
                readOnly: true
                type: 'string'
            foo:
                type: 'string'
                i18n: true
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

    db = config.Database()

    db.registerModels models

    describe 'meta', () ->
        it 'should have the model name', () ->
            a = new models.A
            expect(a.meta.name).to.be.equal 'A'
            b = new db.B
            expect(b.meta.name).to.be.equal 'B'
            c = new db.C
            expect(c.meta.name).to.be.equal 'C'


    describe 'schema', () ->
        it 'should inherite the schema structure', () ->
            c = new db.C
            expect(c.schema).to.include.key('foo')
            expect(c.schema).to.include.key('afield')
            expect(c.schema).to.include.key('bfield')
            expect(c.schema).to.include.key('cfield')

            c.set 'foo', 'foo', 'en'
            c.set 'afield', 'afield'
            c.set 'bfield', 'foo'
            c.set 'cfield', 'foo'

            expect(c.schema.afield.type).to.be.equal 'string'
            expect(c.schema.all.type).to.be.equal 'string'

        it 'should allow inherited fields to be overwritten', () ->
            a = new db.A
            expect(a.schema.afield.readOnly).to.be.true
            expect(a.schema.afield.type).to.be.equal 'string'
            expect(a.schema.foo.i18n).to.be.true
            expect(a.schema.foo.type).to.be.equal 'string'
            expect(a.schema.foo.readOnly).to.be.undefined
            expect(a.schema.all.type).to.be.equal 'integer'

            b = new db.B
            expect(b.schema.afield.readOnly).to.be.true
            expect(b.schema.afield.type).to.be.equal 'string'
            expect(b.schema.foo.i18n).to.be.true
            expect(b.schema.foo.type).to.be.equal 'string'
            expect(b.schema.foo.readOnly).to.be.true
            expect(b.schema.bfield.type).to.be.equal 'string'
            expect(b.schema.all.type).to.be.equal 'string'

            c = new db.C
            expect(c.schema.afield.readOnly).to.be.true
            expect(c.schema.afield.type).to.be.equal 'string'
            expect(c.schema.bfield.type).to.be.equal 'string'
            expect(c.schema.foo.i18n).to.be.true
            expect(c.schema.foo.type).to.be.equal 'string'
            expect(c.schema.foo.readOnly).to.be.false
            expect(c.schema.all.type).to.be.equal 'string'
            expect(c.schema.cfield.type).to.be.equal 'string'

        it 'should inherite readOnly fields', () ->
            c = new db.C
            c.set 'afield', 'foo'
            expect(-> c.set 'afield', 'foo2').to.throw('C.afield is read-only')

        it 'should overwrite readOnly fields', () ->
            c = new db.C
            c.set 'foo', 'bar', 'en'
            c.set 'foo', 'bar2', 'en'
            expect(c.get 'foo', 'en').to.be.equal 'bar2'





