
chai = require('chai')
expect = chai.expect
chai.should()
rdf = require('../rdf')

describe 'Database', ()->

    db = new rdf.Database {
        name: 'example'
        endpoint: 'http://localhost:8889/sparql'
        graphURI: 'http://example.org/graph'
        defaultClassesNamespace: 'http://onto.example.org/classes'
        defaultPropertiesNamespace: 'http://onto.example.org/properties'
        defaultInstancesNamespace: 'http://data.example.org'
        defaultLang: 'en'
    }

    describe '#validate()', ()->

        it 'should throw an exception if no <fieldName>.type is specified'
        it 'should throw an exception if no <fieldName>.uri is specified'
