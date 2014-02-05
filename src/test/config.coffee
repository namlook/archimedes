

NeDB = () ->
    Database = require('../nedb/database')
    return {
        Database: () -> new Database()
        nsprop: ''
    }

Stardog = () ->
    Database = require('../rdf/database')
    return {
        Database: () ->
            new Database {
                store: 'stardog'
                namespace: 'http://onto.example.org'
                defaultInstancesNamespace: 'http://data.example.org'
                graphURI: 'http://example.org'
                credentials: {login: 'admin', password: 'admin'}
            }
        nsprop: 'http://onto.example.org/properties/'
    }


module.exports = NeDB()
# module.exports = Stardog()