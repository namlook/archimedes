
chai = require('chai')
chai.Assertion.includeStack = true;
expect = chai.expect

_ = require 'underscore'
config = require('../config')

describe 'bad models', ()->

    badmodels = {}

    class badmodels.BadI18n extends config.Model
        schema:
            integer:
                type: 'integer'
                i18n: true

    db = config.Database()

    describe 'i18n', () ->
        it 'should throw an error if an i18n field is not string', () ->
            expect(-> db.registerModels({I18n: badmodels.BadI18n})).to.throw(
                'I18n.integer is i18n and must be of type string')
