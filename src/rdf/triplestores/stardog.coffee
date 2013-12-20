
_ = require 'underscore'
_.str = require 'underscore.string'
stardog = require 'stardog'


class StardogStore

    # options:
    #
    #   * endpoint: the sparql endpoint (default 'http://localhost:5820')
    #   * credentials.login: the user login to use
    #   * credentials.password: the password
    #   * database: the database name (or graph URI ?)
    constructor: (options) ->
        @endpoint = options.endpoint or 'http://localhost:5820'
        @credentials = options.credentials
        @databaseName = options.database
        unless @databaseName and options.graphURI?
            @databaseName = _.str.classify options.graphURI
            @databaseName = _.str.underscored @databaseName
            @databaseName = _.strRight @databaseName

        @_connection = new stardog.Connection()
        @_connection.setEndpoint(@endpoint);
        @_connection.setCredentials(@credentials.login, @credentials.password);

    setDatabase: (databaseName) =>
        @databaseName = databaseName

    # options:
    #
    #  * database: the database to use
    #  * limit: the number of row to returns
    #  * offset: the offset
    query: (sparqlQuery, options, callback) =>
        unless callback?
            if typeof(options) is 'function'
                callback = options
                options = {}
            else
                throw "callback required"

        options.query = sparqlQuery
        options.database or= @databaseName

        @_connection.query options, (data) ->
            if _.isString data
                return callback data
            return callback null, data.results.bindings

    # options:
    #
    #  * database: the database to use
    #  * limit: the number of row to returns
    #  * offset: the offset
    describe: (uri, options, callback) =>
        unless callback?
            if typeof(options) is 'function'
                callback = options
                options = {}
            else
                throw "callback required"

        options.query = "describe <#{uri}>"
        options.database or= @databaseName

        @_connection.queryGraph options, (data) ->
            if _.isString data
                return callback data
            return callback null, data[0].attributes



if require.main is module
    tripleStore = new StardogStore {
        graphURI: 'http://onto.test.org'
        endpoint: 'http://localhost:5820'
        credentials: {login: 'admin', password: 'admin'}
    }

    tripleStore.describe "http://www.Department0.University0.edu/GraduateCourse1", (err, data) ->
        if err
            throw err
        console.log data

    tripleStore.query "select * where {?s ?p ?o .}", {limit: 10}, (err, data) ->
        if err
            throw err
        console.log data
