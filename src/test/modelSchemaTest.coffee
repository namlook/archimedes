
_ = require 'underscore'
_.str = require 'underscore.string'

chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

Model = require('../interface').Model
Database = require('../interface').Database

describe 'Model.schema', ()->

    models = {}

    class models.A extends Model
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
                compute: (model, value) ->
                    "#{value} setted to #{model.meta.name}"
            computedMultiValue:
                multi: true
                type: 'integer'
                compute: (model, value) ->
                    parseInt(value, 10) * 100
            computedI18nValue:
                i18n: true
                type: 'string'
                compute: (model, value, lang) ->
                    "#{value} setted to #{model.meta.name} in #{lang}"
            computedMultiI18nValue:
                i18n: true
                multi: true
                type: 'string'
                compute: (model, value, lang) ->
                    "#{value}@#{lang}"

            readOnlyValue:
                type: 'string'
                readOnly: true
    db = new Database

    db.registerModels models

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
            a = new db.A {defaultValue: 'foo', defaultValueFn: 'bar', defaultDate: 123}
            expect(a.get 'defaultValue').to.be.equal 'foo'
            expect(a.get 'defaultValueFn').to.be.equal 'bar'
            expect(a.get 'defaultDate').to.be.equal 123

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
            expect(a.get 'computedMultiI18nValue', 'en').to.include '1@en', '2@en'
            expect(a.get 'computedMultiI18nValue', 'fr').to.include '4@fr', '2@fr'
            a.push 'computedMultiI18nValue', 4, 'en'
            a.push 'computedMultiI18nValue', 8, 'fr'
            expect(a.get 'computedMultiI18nValue', 'en').to.include '1@en', '2@en', '4@en'
            expect(a.get 'computedMultiI18nValue', 'fr').to.include '4@fr', '2@fr', '8@fr'


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

