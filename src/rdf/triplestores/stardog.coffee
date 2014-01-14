
_ = require 'underscore'
_.str = require 'underscore.string'
stardog = require 'stardog'


module.exports = class StardogStore

    # options:
    #
    #   * endpoint: the sparql endpoint (default 'http://localhost:5820')
    #   * credentials.login: the user login to use
    #   * credentials.password: the password
    #   * database: the database name (or graph URI ?)
    constructor: (options) ->
        @endpoint = options.endpoint or 'http://localhost:5820'
        unless @endpoint
            throw "endpoint is required"

        @credentials = options.credentials || {}
        @databaseName = options.database
        unless @databaseName and options.graphURI?
            @databaseName = _.str.classify options.graphURI
            @databaseName = _.str.underscored @databaseName
            @databaseName = _.str.strRight @databaseName

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
            if options.mimetype is 'text/boolean'
                return callback null, data
            if _.isString data
                return callback data
            return callback null, data.results.bindings


    # # insert, update and delete data
    #
    # options:
    #
    #   * database: the database to use
    update: (sparqlQuery, options, callback) =>
        unless callback?
            if typeof(options) is 'function'
                callback = options
                options = {}
            else
                throw "callback required"

        options.mimetype = 'text/boolean'
        options.query = sparqlQuery
        options.database or= @databaseName

        @_connection.query options, (data) ->
            unless _.isBoolean data
                return callback data
            return callback null, data


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


    # ## clear
    # remove all data of the database
    clear: (callback) =>
        @_connection.begin {database: @databaseName}, (transactionId) =>
            options = {database: @databaseName, txId: transactionId}
            @_connection.clearDB options, (ok) =>
                console.log '---', ok
                if _.isString ok
                    return callback ok
                @_connection.commit options, (data) =>
                    if _.isString data
                        return callback data
                    return callback null, ok

if require.main is module
    tripleStore = new StardogStore {
        graphURI: 'http://example.org'
        credentials: {login: 'admin', password: 'admin'}
    }

    tripleStore._connection.begin {database: 'http_example_org'}, (txId) ->
        console.log '>>>', txId
        tripleStore._connection.clearDB {database: 'http_example_org', txId: txId}, (ok) ->
            console.log '---', ok
            tripleStore._connection.commit {database: 'http_example_org', txId: txId}, (data) ->
                console.log '===', data
                tripleStore._connection.commit {database: 'http_example_org', txId: txId}, (data) ->
                    console.log 'ooo', data

    # tripleStore.describe "http://www.Department0.University0.edu/GraduateCourse1", (err, data) ->
    #     if err
    #         throw err
    #     console.log data

    # tripleStore.query "select * where {?s ?p ?o .}", {limit: 10}, (err, data) ->
    #     if err
    #         throw err
    #     console.log data
