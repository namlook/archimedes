

NeDB = () ->
    Database = require('../nedb/database')
    return {
        Model: require('../interface/model')
        Database: () -> new Database()
        nsprop: ''
        nsclass: ''
    }

Stardog = () ->
    Database = require('../rdf/database')
    return {
        Model: require('../rdf/model')
        Database: () ->
            new Database {
                store: 'stardog'
                namespace: 'http://onto.example.org'
                defaultInstancesNamespace: 'http://data.example.org'
                graphURI: 'http://example.org'
                credentials: {login: 'admin', password: 'admin'}
            }
        nsprop: 'http://onto.example.org/properties/'
        nsclass: 'http://onto.example.org/classes/'
    }

Virtuoso = () ->
    Database = require('../rdf/database')
    return {
        Model: require('../rdf/model')
        Database: () ->
            new Database {
                store: 'virtuoso'
                namespace: 'http://onto.example.org'
                defaultInstancesNamespace: 'http://data.example.org'
                graphURI: 'http://example.org'
            }
        nsprop: 'http://onto.example.org/properties/'
        nsclass: 'http://onto.example.org/classes/'
    }


# module.exports = NeDB()
module.exports = Virtuoso()