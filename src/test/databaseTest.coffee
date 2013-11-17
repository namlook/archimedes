
chai = require('chai')
expect = chai.expect
chai.should()
rdf = require('../rdf')

describe 'Database', ()->

    db = new rdf.Database {
        name: 'example'
        endpoint: 'http://localhost:8889/sparql'
        graphURI: 'http://example.org/graph'
    }

    describe '#validate()', ()->
        
        it 'should throw an exception if no <fieldName>.type is specified'
        it 'should throw an exception if no <fieldName>.uri is specified'
        