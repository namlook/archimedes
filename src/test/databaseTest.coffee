
chai = require('chai')
expect = chai.expect
chai.should()
Database = require('../interface').Database

describe 'Database', ()->

    db = new Database

    describe 'validate()', ()->

        it 'should throw an exception if no <fieldName>.type is specified'
        it 'should throw an exception if no <fieldName>.uri is specified'
