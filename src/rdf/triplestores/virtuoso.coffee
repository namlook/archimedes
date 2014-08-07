
_ = require 'underscore'
querystring = require 'querystring'
request = require 'request'
async = require 'async'


module.exports = class Virtuoso

    # ## constructor
    # options:
    #
    #   * endpoint: the sparql endpoint (default 'http://localhost:8890')
    #   * credentials.login: the user login to use
    #   * credentials.password: the password
    #   * database: the database name (or graph URI ?)
    constructor: (options) ->
        host = options.host or 'localhost'
        port = options.port or '8890'
        @endpoint = options.endpoint or "http://#{host}:#{port}/sparql"
        console.log "using SPARQL endpoint: #{@endpoint}"
        unless @endpoint
            throw "endpoint is required"

        @graphURI = options.graphURI

    # ## sparql
    # perform a raw sparql query to the database
    sparql: (query, options, callback) ->
        if typeof(options) is 'function'
            callback = options
            options = {}
        unless callback?
            throw "callback required"

        opts = {
            uri: @endpoint
            headers: {
                'content-type':'application/x-www-form-urlencoded'
                'accept':'application/sparql-results+json'
            }
            body: querystring.stringify (query:query)
            encoding: 'utf8'
        }

        request.post opts, (err, res, body) ->
            if err
                return callback err

            regErr = new RegExp /^Virtuoso\s\w+\sError\s/
            if body.search(regErr) > -1
                return callback body

            try
                body = JSON.parse(body)
            catch e
                return callback e
            return callback null, body.results?.bindings

    # ## query
    # usefull for select and constructs query
    query: (query, options, callback) ->
        @sparql query, options, callback


    # ## describe
    # describe one or more URIs
    describe: (uris, options, callback) ->
        if typeof(options) is 'function'
            callback = options
            options = {}
        unless callback?
            throw "callback required"


        unless _.isArray uris
            uris = [uris]

        async.map uris, (uri, cb) =>
            @describeURI uri, (err, pojo) =>
                if err
                    return cb err
                return cb null, pojo
        , (err, results) =>
            if err
                return callback err
            return callback null, (r for r in results when r isnt null)


    # ## describeURI
    # describe one URI
    describeURI: (uri, options, callback) ->
        if typeof(options) is 'function'
            callback = options
            options = {}
        unless callback?
            throw "callback required"

        sparqlQuery = """
        construct {
          <#{uri}> ?p ?o .
        }  from <#{@graphURI}> where {
          <#{uri}> ?p ?o .
        }"""

        @sparql sparqlQuery, options, (err, data) ->
            if err
                return callback err
            result = {}
            for item in data
                result._ref = item.s.value
                result._uri = result._ref
                result._id = item.s.value.split('/').slice(-1)
                prop = item.p.value
                lang = item.o.lang
                value = item.o.value
                if prop is 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
                    result._class = value
                    result._type = value.split('/').slice(-1)
                    continue
                if item.o.type is 'uri'
                    value = {_ref: value}
                if lang?
                    result[prop] = {} unless result[prop]?
                    result[prop][lang] = [] unless result[prop][lang]?
                    result[prop][lang].push value
                else
                    result[prop] = [] unless result[prop]?
                    result[prop].push value

            for key, value of result
                if _.isArray(value) and value.length is 1
                    result[key] = value[0]
                else if _.isObject(value) and not _.isArray(value)
                    for lang, val of value
                        if _.isArray(val) and val.length is 1
                            result[key][lang] = val[0]

            if _.isEmpty result
                result = null
            return callback null, result

    # ## update
    # insert, update and delete data from the database
    #
    update: (sparqlQuery, options, callback) ->
        @sparql sparqlQuery, options, (err, data) ->
            if err
                return callback err
            return callback null, true


    # ## count
    # returns the number of object that match the query
    #
    # example:
    #       @count query, (err, total) ->
    count: (sparqlQuery, callback) ->
        @sparql sparqlQuery, (err, data) =>
            if err
                return callback err
            return callback null, parseInt(data[0].total.value)

    # ## length
    # returns the number of triples present into the db
    #
    # example:
    #       @length (err, total) ->
    length: (callback) ->
        unless callback?
            throw "callback required"

        sparqlQuery = """
            select (count(?s) as ?total)
            from <#{@graphURI}> where {?s ?p ?o .}
        """

        @sparql sparqlQuery, (err, data) =>
            if err
                return callback err
            return callback null, parseInt(data[0].total.value)

    # ## clear
    # remove all data of the database. The callback is optional
    #
    # example:
    #       @clear (err) ->
    clear: (callback) ->
        sparqlQuery = "clear graph <#{@graphURI}>"
        @sparql sparqlQuery, (err, data) =>
            if err
                return callback err
            return callback null

    begin: (callback) ->
        unless callback
            throw 'callback is required'
        process.nextTick () ->
            return callback null, false


    commit: (transactionId, callback) ->
        unless callback
            throw 'callback is required'
        process.nextTick () ->
            return callback null, false




if require.main is module
    graphURI = 'http://example.org'
    tripleStore = new Virtuoso {
        graphURI: graphURI
    }

    insertQuery = """
        insert data into <#{graphURI}>{
            <http://ex.org/book1> <http://ex.org/price> 43 .
            <http://ex.org/book1> <http://ex.org/title> \"bla\" .
            <http://ex.org/book2> <http://ex.org/price> 41 .
            <http://ex.org/book2> <http://ex.org/title> \"ble\" .
            <http://ex.org/foo1> <http://ex.org/book> <http://ex.org/book1> .
            <http://ex.org/foo2> <http://ex.org/book> <http://ex.org/book2> .
        }
    """

    tripleStore.sparql insertQuery, (err, data) ->
        if err
            throw err

        tripleStore.describe ['http://ex.org/book1', 'http://ex.org/book2'], (err, data) ->
            if err
                throw err

            tripleStore.clear (err, data) ->
                if err
                    throw err
                console.log '+++++', data

                tripleStore.count (err, total) ->
                    if err
                        throw err
                    console.log '....', total

                    tripleStore.describe ['http://ex.org/book1', 'http://ex.org/book2'], (err, data) ->
                        console.log err, data
                        if err
                            throw err
