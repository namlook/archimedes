
chai = require('chai')
expect = chai.expect
chai.should()
RdfDatabase = require('../rdf').Database

describe 'Database', ()->

    db = new RdfDatabase {
        endpoint: 'http://localhost:8890/sparql'
        graphURI: 'http://graph.example.org'
        namespace: 'http://onto.example.org' # optional
        defaultLang: 'en'
    }

    describe '#validate()', ()->

        it 'should throw an exception if no <fieldName>.type is specified'
        it 'should throw an exception if no <fieldName>.uri is specified'
