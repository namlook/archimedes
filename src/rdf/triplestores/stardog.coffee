
_ = require 'underscore'
_.str = require 'underscore.string'
stardog = require 'stardog'


module.exports = class StardogStore

    # ## constructor
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

        @credentials = options.credentials or {}
        unless (@credentials.login? and @credentials.password?)
            throw "credentials are required"
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


    sparql: (sparqlQuery, options, callback) ->
        if typeof(options) is 'function'
            callback = options
            options = {}
        unless callback?
            throw "callback required"
        @query sparqlQuery, options, callback

    # ## query
    # performs a database query via a sparql query
    #
    # options:
    #
    #  * database: the database to use
    #  * limit: the number of row to returns
    #  * offset: the offset
    query: (sparqlQuery, options, callback) =>
        if typeof(options) is 'function'
            callback = options
            options = {}
        unless callback?
            throw "callback required"

        options.query = sparqlQuery
        options.database or= @databaseName

        if options.txId?
            @_connection.queryInTransaction options, (data) ->
                if options.mimetype is 'text/boolean'
                    return callback null, data
                if _.isString data
                    return callback data
                return callback null, data.results.bindings
        else
            @_connection.query options, (data) ->
                if options.mimetype is 'text/boolean'
                    return callback null, data
                if _.isString data
                    return callback data
                return callback null, data.results.bindings


    # ## update
    # insert, update and delete data from the database
    #
    # options:
    #
    #   * database: the database to use
    update: (sparqlQuery, options, callback) =>
        if typeof(options) is 'function'
            callback = options
            options = {}
        unless callback?
            throw "callback required"

        options.mimetype = 'text/boolean'
        options.query = sparqlQuery
        options.database or= @databaseName

        @_connection.query options, (data) ->
            unless _.isBoolean data
                return callback data
            return callback null, data

    # ## describe
    # get all related data from a list of URIs
    #
    # options:
    #
    #  * database: the database to use
    #  * limit: the number of row to returns
    #  * offset: the offset
    #
    describe: (uris, options, callback) =>
        if typeof(options) is 'function'
            callback = options
            options = {}
        unless callback?
            throw "callback required"


        sparqlQuery = "describe "
        if _.isArray uris
            for uri in uris
                sparqlQuery += "<#{uri}> "
        else
            sparqlQuery += "<#{uris}>"

        options.query = sparqlQuery
        options.database or= @databaseName

        @_connection.queryGraph options, (rawdata) ->
            if _.isString rawdata
                return callback rawdata

            results = []
            for data in rawdata[0].attributes['@graph']
                properties = {}
                for uri, item of data
                    if uri is '@id'
                        properties._id = item

                    else
                        properties[uri] = []
                        for value in item
                            properties[uri].push value['@value']

                        # check if numbers has to be converted
                        if _.every(_.map properties[uri], (o) ->
                          not _.isNaN(parseFloat(o)))
                            properties[uri] = _.map properties[uri], (o) ->
                                parseFloat(o)

                        # check if boolean has to be converted
                        if _.every(_.map properties[uri], (o) ->
                          o is 'false' or o is 'true')
                            properties[uri] = _.map properties[uri], (o) ->
                                if o is 'true' then true else false

                        # check if the properties is an array
                        if properties[uri].length is 1
                            properties[uri] = properties[uri][0]

                results.push properties

            return callback null, results

    begin: (callback) ->
        unless callback
            throw 'callback is required'

        @_connection.begin {database: @databaseName}, (transactionId) ->
            return callback null, transactionId

    commit: (transactionId, callback) ->
        unless callback
            throw 'callback is required'

        @_connection.commit {database: @databaseName, txId: transactionId}, (data) ->
            if _.isString data
                return callback data
            return callback null

    # ## clear
    # remove all data of the database. The callback is optional
    #
    # example:
    #       @clear (err) ->
    clear: (callback) =>
        unless callback
            throw 'callback is required'

        @begin (err, transactionId) =>
            options = {database: @databaseName, txId: transactionId}
            @_connection.clearDB options, (ok) =>
                if _.isString ok
                    return callback ok
                @commit transactionId, (err) =>
                    if err
                        return callback err
                    unless ok
                        return callback 'something wrong happened while clearing the db'
                    return callback null

    # ## count
    # returns the number of object that match the query
    #
    # example:
    #       @count query, (err, total) ->
    count: (sparqlQuery, callback) =>
        @query sparqlQuery, (err, data) =>
            if err
                return callback err
            return callback null, parseInt(data[0].total.value, 10)


if require.main is module
    tripleStore = new StardogStore {
        graphURI: 'http://example.org'
        credentials: {login: 'admin', password: 'admin'}
    }

    insertQuery = """
        insert data {graph <http://example.org> {
            <http://ex.org/book1> <http://ex.org/price> 43 .
            <http://ex.org/book1> <http://ex.org/title> \"bla\" .
        }}
    """
    tripleStore.update insertQuery, (err, data) ->
        tripleStore.update """
            delete data {graph <http://example.org> {<http://ex.org/book1> <http://ex.org/price> 43 .}};
            insert data {graph <http://example.org> {<http://ex.org/book1> <http://ex.org/price> 42 .}};
        """, (err, data) ->
            console.log err, data
            tripleStore.query "select * where {?s ?p ?o .}", (err, res) ->
                console.log err, data, res


    # tripleStore.update insertQuery, (err, data) ->
    #     tripleStore.update """
    #         delete {<http://ex.org/book1> ?p ?o .}
    #         where {
    #             <http://ex.org/book1> ?p ?o .
    #         }
    #     """, (err, data) ->
    #         console.log err, data
    #         tripleStore.query "select * where {?s ?p ?o .}", (err, res) ->
    #             console.log err, data, res

    ###tripleStore._connection.begin {database: 'http_example_org'}, (txId) ->
        console.log '>>>', txId
        tripleStore._connection.clearDB {database: 'http_example_org', txId: txId}, (ok) ->
            console.log '---', ok
            tripleStore._connection.commit {database: 'http_example_org', txId: txId}, (data) ->
                console.log '===', data
                tripleStore._connection.commit {database: 'http_example_org', txId: txId}, (data) ->
                    console.log 'ooo', data
###
    # tripleStore.describe "http://www.Department0.University0.edu/GraduateCourse1", (err, data) ->
    #     if err
    #         throw err
    #     console.log data

    # tripleStore.query "select * where {?s ?p ?o .}", {limit: 10}, (err, data) ->
    #     if err
    #         throw err
    #     console.log data
