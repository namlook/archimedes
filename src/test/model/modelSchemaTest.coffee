
_ = require 'underscore'
_.str = require 'underscore.string'

chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

config = require('../config')

describe 'Model.schema', ()->

    models = {}

    class models.Literal extends config.Model
        schema:
            i18n:
                type: 'string'
                i18n: true
            string:
                type: 'string'
            integer:
                type: 'integer'
            float:
                type: 'float'
            date:
                type: 'date'


    class models.Multi extends config.Model
        schema:
            string:
                type: 'string'
                multi: true
            integer:
                type: 'integer'
                multi: true
            date:
                type: 'date'
                multi: true
            literal:
                type: 'Literal'
                multi: true


    class models.I18n extends config.Model
        schema:
            string:
                type: 'string'
                i18n: true
            strings:
                type: 'string'
                i18n: true
                multi: true


    class models.A extends config.Model
        schema:
            defaultValue:
                type: 'string'
                default: 'hello'
            defaultValueFn:
                type: 'string'
                default: (model) ->
                    "hello from #{model.meta.name}"
            defaultDate:
                type: 'date'
                default: () -> new Date()
            defaultMulti:
                multi: true
                type: 'integer'
                default: [1, 2, 3]

            computedValue:
                type: 'string'
                compute: (value, attrs) ->
                    "#{value} setted to #{attrs.model.meta.name}"
            computedMultiValue:
                multi: true
                type: 'integer'
                compute: (value, attrs) ->
                    parseInt(value, 10) * 100
            computedI18nValue:
                i18n: true
                type: 'string'
                compute: (value, attrs) ->
                    "#{value} setted to #{attrs.model.meta.name} in #{attrs.lang}"
            computedMultiI18nValue:
                i18n: true
                multi: true
                type: 'string'
                compute: (value, attrs) ->
                    "#{value}@#{attrs.lang}"

            readOnlyValue:
                type: 'string'
                readOnly: true
            readOnlyI18nValue:
                type: 'string'
                i18n: true
                readOnly: true
            readOnlyValues:
                type: 'string'
                readOnly: true
                multi: true
            readOnlyI18nValues:
                type: 'string'
                readOnly: true
                multi: true
                i18n: true


    db = null

    beforeEach (next) ->
        db = config.Database()
        db.registerModels models
        next()


    describe 'constructor', () ->
        it 'should convert non array values if multi-fields', () ->
            multi = new db.Multi {
                string: 'foo',
                integer: 3,
                literal: {string: 'bar'}
            }
            expect(multi.get('string')).to.be.instanceof(Array)
            expect(multi.get('integer')).to.be.instanceof(Array)
            expect(multi.get('literal')).to.be.instanceof(Array)

            expect(multi.get('string')[0]).to.be.equal 'foo'
            expect(multi.get('integer')[0]).to.be.equal 3
            expect(multi.get('literal')[0].get('string')).to.be.equal 'bar'

    describe 'type validation', () ->
        it 'should throw an error if the value is not an integer', () ->
            literal = new db.Literal
            literal.set 'integer', '9'
            expect(typeof literal.get 'integer').to.be.equal 'number'
            expect(literal.get 'integer').to.be.equal 9
            expect(-> literal.set 'integer', 'arf').to.throw(
                'Literal.integer must be a integer')

        it 'should throw an error if the value is not a float', () ->
            literal = new db.Literal
            literal.set 'float', '9.90'
            expect(typeof literal.get 'float').to.be.equal 'number'
            expect(literal.get 'float').to.be.equal 9.9
            expect(-> literal.set 'float', 'arf').to.throw(
                'Literal.float must be a float')

    describe 'default value', () ->

        it 'should allow literals as default value', () ->
            a = new db.A
            expect(a.get 'defaultValue').to.be.equal 'hello'

        it 'should allow function as default value', () ->
            a = new db.A
            expect(a.get 'defaultValueFn').to.be.equal 'hello from A'
            expect(a.get 'defaultDate').to.be.number

        it 'should be able to set a multi-field', () ->
            a = new db.A
            expect(a.get 'defaultMulti').to.include 1, 2, 3

        it 'should not set the same object reference', () ->
            a = new db.A
            expect(a.get 'defaultMulti').to.include 1, 2, 3
            b = new db.A
            expect(a.get 'defaultMulti').to.include 1, 2, 3
            expect(a.get 'defaultMulti').to.not.equal b.get 'defaultMulti'
            expect(a._properties.defaultMulti).to.not.equal b._properties.defaultMulti
            a.push 'defaultMulti', 4
            expect(b.get 'defaultMulti').to.not.include 4

        it 'should not be set if a value is passed to the constructor', () ->
            date = new Date()
            a = new db.A {defaultValue: 'foo', defaultValueFn: 'bar', defaultDate: date}
            expect(a.get 'defaultValue').to.be.equal 'foo'
            expect(a.get 'defaultValueFn').to.be.equal 'bar'
            expect(a.get 'defaultDate').to.be.equal date

            date2 = new Date()
            a.set 'defaultDate', date2
            expect(a.get 'defaultDate').to.be.equal date2
            a.set 'defaultDate', date2.toJSON()
            expect(a.get('defaultDate').toJSON()).to.be.equal date2.toJSON()

    describe 'computed value', () ->

        it 'should computed value when setting a value to a computed field', () ->
            a = new db.A
            expect(a.get 'computedValue').to.be.undefined
            a.set 'computedValue', 'foo'
            expect(a.get 'computedValue').to.be.equal 'foo setted to A'

        it 'should computed value on a multi field', () ->
            a = new db.A
            a.set 'computedMultiValue', [1, 2, 3]
            expect(a.get 'computedMultiValue').to.include 100, 200, 300
            a.push 'computedMultiValue', 4
            expect(a.get 'computedMultiValue').to.include 100, 200, 300, 400

        it 'should computed value on a i18n field', () ->
            a = new db.A
            expect(a.get 'computedI18nValue', 'en').to.be.undefined
            a.set 'computedI18nValue', 'foo', 'en'
            a.set 'computedI18nValue', 'toto', 'fr'
            expect(a.get 'computedI18nValue', 'en').to.be.equal 'foo setted to A in en'
            expect(a.get 'computedI18nValue', 'fr').to.be.equal 'toto setted to A in fr'

        it 'should computed value on a multi-i18n field', () ->
            a = new db.A
            a.set 'computedMultiI18nValue', [1, 2], 'en'
            a.set 'computedMultiI18nValue', [4, 2], 'fr'
            expect(a.get 'computedMultiI18nValue', 'en').to.include.members ['1@en', '2@en']
            expect(a.get 'computedMultiI18nValue', 'fr').to.include.members ['4@fr', '2@fr']
            a.push 'computedMultiI18nValue', 4, 'en'
            a.push 'computedMultiI18nValue', 8, 'fr'
            expect(a.get 'computedMultiI18nValue', 'en').to.include.members ['1@en', '2@en', '4@en']
            expect(a.get 'computedMultiI18nValue', 'fr').to.include.members ['4@fr', '2@fr', '8@fr']


    describe 'read only field', () ->
        it 'should throw an error when setting a value to a read-only field', () ->
            a = new db.A
            a.set 'readOnlyValue', 'this-is-a-test'
            expect(-> a.set 'readOnlyValue', 'another-test').to.throw(
                /A.readOnlyValue is read-only/)
            expect(a.get 'readOnlyValue').to.be.equal 'this-is-a-test'

        it 'should not be able to modify a read-only field passed by constructor', () ->
            a = new db.A {readOnlyValue: 'foo'}
            expect(-> a.set 'readOnlyValue', 'another-test').to.throw(
                /A.readOnlyValue is read-only/)
            expect(a.get 'readOnlyValue').to.be.equal 'foo'

        it 'should not throw an error when setting a value when quietReadOnly is true', () ->
            a = new db.A
            a.set 'readOnlyValue', 'this-is-a-test'
            expect(
                -> a.set 'readOnlyValue', 'another-test', {quietReadOnly: true}
            ).to.not.throw(/A.readOnlyValue is read-only/)
            expect(a.get 'readOnlyValue').to.be.equal 'this-is-a-test'

        it 'should not be able to unset a setted value', () ->
            a = new db.A
            a.set 'readOnlyValue', 'test'
            expect(-> a.unset 'readOnlyValue').to.throw(
                /A.readOnlyValue is read-only/)

        it 'should not be able to unset a setted value (i18n)', () ->
            a = new db.A
            a.set 'readOnlyI18nValue', 'test', 'en'
            expect(-> a.unset 'readOnlyI18nValue', 'en').to.throw(
                /A.readOnlyI18nValue is read-only/)

        it 'should not be able to pull a setted value', () ->
            a = new db.A
            a.push 'readOnlyValues', 'test'
            expect(-> a.push 'readOnlyValues', 'test2').to.throw(
                /A.readOnlyValues is read-only/)
            expect(-> a.pull 'readOnlyValues').to.throw(
                /A.readOnlyValues is read-only/)

        it 'should not be able to pull a setted value (i18n)', () ->
            a = new db.A
            a.push 'readOnlyI18nValues', 'test', 'en'
            expect(-> a.push 'readOnlyI18nValues', 'test2', 'en').to.throw(
                /A.readOnlyI18nValues is read-only/)
            expect(-> a.pull 'readOnlyI18nValues', 'test', 'en').to.throw(
                /A.readOnlyI18nValues is read-only/)

        it 'should set readOnly-multi field', () ->
            a = new db.A
            a.set 'readOnlyValues', ['foo', 'bar']
            expect(-> a.push 'readOnlyValues', 'arf').to.throw(/A.readOnlyValues is read-only/)

        it 'should set readOnly-i18n field', () ->
            a = new db.A
            a.set 'readOnlyI18nValue', 'foo', 'en'
            a.set 'readOnlyI18nValue', 'toto', 'fr'
            expect(-> a.set 'readOnlyI18nValue', 'bar', 'en').to.throw(/A.readOnlyI18nValue is read-only/)

        it 'should set readOnly-i18n-multi field', () ->
            a = new db.A
            a.set 'readOnlyI18nValues', ['foo', 'bar'], 'en'
            a.set 'readOnlyI18nValues', ['toto', 'tata'], 'fr'
            expect(-> a.push 'readOnlyI18nValues', 'arf', 'en').to.throw(/A.readOnlyI18nValues is read-only/)
            expect(-> a.push 'readOnlyI18nValues', 'titi', 'fr').to.throw(/A.readOnlyI18nValues is read-only/)

            a = new db.A
            a.push 'readOnlyI18nValues', 'foo', 'en'
            expect(-> a.push 'readOnlyI18nValues', 'bar', 'en').to.throw(/A.readOnlyI18nValues is read-only/)
            a.push 'readOnlyI18nValues', 'toto', 'fr'
            expect(-> a.push 'readOnlyI18nValues', 'titi', 'fr').to.throw(/A.readOnlyI18nValues is read-only/)

    describe 'required fields', () ->
        it 'should throw an error on save if a required field is empty', (done) ->
            class B extends models.A
                schema:
                    requiredValue:
                        type: 'string'
                        required: true

            db.registerModels {B: B}

            b = new db.B {requiredValue: 'foo'}
            b.save (err) ->
                expect(err).to.be.null

                b = new db.B
                b.save (err) ->
                    expect(err).to.be.equal 'B.requiredValue is required'
                    b.set 'requiredValue', 'foo'
                    b.save (err) ->
                        expect(err).to.be.null
                        done()

        it 'should check required-multi fields (via constructor)', (done) ->
            class B extends models.A
                schema:
                    requiredValues:
                        type: 'string'
                        required: true
                        multi: true

            db.registerModels {B: B}

            b = new db.B {requiredValues: ['foo']}
            b.save (err) ->
                expect(err).to.be.null
                done()

        it 'should check required-multi fields (push)', (done) ->
            class B extends models.A
                schema:
                    requiredValues:
                        type: 'string'
                        required: true
                        multi: true

            db.registerModels {B: B}

            b = new db.B
            b.save (err) ->
                expect(err).to.be.equal 'B.requiredValues is required'
                b.push 'requiredValues', 'foo'
                b.save (err) ->
                    expect(err).to.be.null
                    done()

        it 'should check required-multi fields (set)', (done) ->


            class B extends models.A
                schema:
                    requiredValues:
                        type: 'string'
                        required: true
                        multi: true

            db.registerModels {B: B}

            b = new db.B
            b.save (err) ->
                expect(err).to.be.equal 'B.requiredValues is required'
                b.set 'requiredValues', ['foo']
                b.save (err) ->
                    expect(err).to.be.null
                    done()

        it 'should check required-multi fields (empty list)', () ->
            class B extends models.A
                schema:
                    requiredValues:
                        type: 'string'
                        required: true
                        multi: true

            db.registerModels {B: B}

            b = new db.B
            b.save (err) ->
                expect(err).to.be.equal 'B.requiredValues is required'
                b.set 'requiredValues', ['foo']
                b.pull 'requiredValues', 'foo'
                b.save (err) ->
                    expect(err).to.be.equal 'B.requiredValues is required'
                    b.set 'requiredValues', []
                    b.save (err) ->
                        expect(err).to.be.equal 'B.requiredValues is required'

        it 'should check required-i18n fields (via constructor)', (done) ->
            class B extends models.A
                schema:
                    requiredI18nValue:
                        type: 'string'
                        required: true
                        i18n: true

            db.registerModels {B: B}

            b = new db.B {requiredI18nValue: {en: 'foo', fr: 'bar'}}
            b.save (err) ->
                expect(err).to.be.null
                done()

        it 'should check required-i18n fields (via constructor)', (done) ->
            class B extends models.A
                schema:
                    requiredI18nValue:
                        type: 'string'
                        required: true
                        i18n: true

            db.registerModels {B: B}

            b = new db.B
            b.save (err) ->
                expect(err).to.be.equal 'B.requiredI18nValue is required'
                b.set 'requiredI18nValue', 'foo', 'en'
                b.save (err) ->
                    expect(err).to.be.null
                    done()

        it 'should check required-i18n fields (empty)', () ->
            class B extends models.A
                schema:
                    requiredI18nValue:
                        type: 'string'
                        required: true
                        i18n: true

            db.registerModels {B: B}

            b = new db.B
            b.save (err) ->
                expect(err).to.be.equal 'B.requiredI18nValue is required'
                b.set 'requiredI18nValue', {}
                b.save (err) ->
                    expect(err).to.be.equal 'B.requiredI18nValue is required'

        it 'should check required-multi-i18n fields (via constructor)', (done) ->
            class B extends models.A
                schema:
                    requiredI18nValues:
                        type: 'string'
                        required: true
                        i18n: true
                        multi: true

            db.registerModels {B: B}

            b = new db.B {requiredI18nValues: {en: ['foo'], fr: ['bar']}}
            b.save (err) ->
                expect(err).to.be.null
                done()

        it 'should check required-multi-i18n fields (set)', (done) ->
            class B extends models.A
                schema:
                    requiredI18nValues:
                        type: 'string'
                        required: true
                        i18n: true
                        multi: true

            db.registerModels {B: B}

            b = new db.B
            b.save (err) ->
                expect(err).to.be.equal 'B.requiredI18nValues is required'
                b.set 'requiredI18nValues', ['foo'], 'en'
                b.save (err) ->
                    expect(err).to.be.null
                    done()

        it 'should check required-multi-i18n fields (push)', (done) ->
            class B extends models.A
                schema:
                    requiredI18nValues:
                        type: 'string'
                        required: true
                        i18n: true
                        multi: true

            db.registerModels {B: B}

            b = new db.B
            b.save (err) ->
                expect(err).to.be.equal 'B.requiredI18nValues is required'
                b.push 'requiredI18nValues', 'foo', 'en'
                b.save (err) ->
                    expect(err).to.be.null
                    done()


        it 'should check required-multi-i18n fields (empty)', () ->
            class B extends models.A
                schema:
                    requiredI18nValues:
                        type: 'string'
                        required: true
                        i18n: true
                        multi: true

            db.registerModels {B: B}

            b = new db.B
            b.save (err) ->
                expect(err).to.be.equal 'B.requiredI18nValues is required'
                b.set 'requiredI18nValues', [], 'en'
                b.save (err) ->
                    expect(err).to.be.equal 'B.requiredI18nValues is required'
                    b.set 'requiredI18nValues', {}
                    b.save (err) ->
                        expect(err).to.be.equal 'B.requiredI18nValues is required'

    describe 'custom types', () ->

        it 'should be able to register custom types', () ->
            db.registerCustomTypes {
                foo:
                    compute: (value) ->
                        "foo-#{value}"
                    validate: (value) ->
                        ok = value[4] isnt '5'
                        return ok
            }

            class B extends config.Model
                schema:
                    thefoo:
                        type: 'foo'

            db.registerModels(B: B)

            b = new db.B
            b.set 'thefoo', 'abc'
            expect(-> b.set 'thefoo', '5st').to.throw('B.thefoo must be a foo')


        it 'should be able to register custom types with inherited validation', () ->
            db.registerCustomTypes {
                slug:
                    type: 'string'
                    compute: (value, attrs) ->
                        name = attrs.model.meta.name
                        "#{name}-#{value.toLowerCase().split(' ').join('-')}"
                    validate: (value) ->
                        value.split('-')[1][0] isnt '5'
            }

            class B extends config.Model
                schema:
                    theslug:
                        type: 'slug'

            db.registerModels(B: B)

            b = new db.B
            b.set 'theslug', 'Hello World'
            expect(b.get 'theslug').to.be.equal "B-hello-world"
            expect(-> b.set 'theslug', 234).to.throw('B.theslug must be a string')
            expect(-> b.set 'theslug', '534').to.throw('B.theslug must be a slug')
