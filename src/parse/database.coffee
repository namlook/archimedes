# # Parse adapter

_ = require 'underscore'
async = require 'async'
request = require 'request'
querystring = require 'querystring'

DatabaseInterface = require '../interface/database'

class Parse

    constructor: (options) ->
        @applicationId = options.applicationId
        @restApiKey = options.restApiKey
        @_batchOperations = []
        @_batchOperationsItems = []

    _addBatchOperations: (operation) ->
        if @_batchOperationsItems.length < 50
            @_batchOperationsItems.push operation
        else
            @_batchOperations.push @_batchOperationsItems
            @_batchOperationsItems = [operation]

    _request: (options, callback) ->
        {method, url, body, params} = options

        headers = {
            'X-Parse-Application-Id': @applicationId
            'X-Parse-REST-API-Key': @restApiKey
        }

        opts = {
            url: url
            headers: headers
        }

        if body
            if _.isObject(body)
                headers['content-type'] = 'application/json'
                body = JSON.stringify body
            opts.body = body

        if params
            opts.url += "?" + querystring.stringify params

        console.log opts

        request[method] opts, (err, res, body) ->
            if err
                return callback err

            try
                result = JSON.parse(body)
            catch e
                err = e

            if not err and result.code? and result.error?
                err = "Error #{result.code}: #{result.error} on #{opts.url}"

            if err
                console.log 'xxx', opts
                return callback err
            return callback null, result

    commit: (callback) ->
        if not callback
            throw 'callback is needed'

        url = 'https://api.parse.com/1/batch'
        if @_batchOperationsItems.length
            @_batchOperations.push @_batchOperationsItems
            @_batchOperationsItems = []
        async.map @_batchOperations, (operations, cb) =>
            body = {requests: operations}
            console.log body
            @_request {method: 'post', url: url, body: body}, cb
        , (err, data) =>
            if err
                return callback err
            @_batchOperations = []
            return callback null


    find: (type, query, callback) ->
        if not type or typeof(type) is 'function'
            throw 'type is needed'

        if typeof(query) is 'function'
            callback = query
            query = {}

        if query.where
            query.where = JSON.stringify(query.where)

        url = "https://api.parse.com/1/classes/#{type}"
        @_request {method: 'get', url: url, params: query}, (err, data) ->
            if err
                return callback err
            return callback null, data.results


    findId: (type, id, callback) ->
        if not type or typeof(type) is 'function'
            throw 'type is needed'

        if not id or typeof(id) is 'function'
            throw 'id is needed'

        url = "https://api.parse.com/1/classes/#{type}/#{id}"
        @_request {method: 'get', url: url}, callback


    create: (type, obj, callback) ->
        if not type or typeof(type) is 'function'
            throw 'type is needed'

        if not obj or typeof(obj) is 'function'
            throw 'obj is needed'

        @_addBatchOperations {
            method: 'POST'
            path: "/1/classes/#{type}"
            body: obj
        }

        if callback
            @commit callback


    update: (type, id, obj, callback) ->
        if not type or typeof(type) is 'function'
            throw 'type is needed'

        if not id or typeof(id) is 'function'
            throw 'id is needed'

        @_addBatchOperations {
            method: 'PUT'
            path: "/1/classes/#{type}/#{id}"
            body: obj
        }
        if callback
            @commit callback


    delete: (type, id, callback) ->
        if not type or typeof(type) is 'function'
            throw 'type is needed'

        if not id or typeof(id) is 'function'
            throw 'id is needed'

        @_addBatchOperations {
            method: 'DELETE'
            path: "/1/classes/#{type}/#{id}"
        }
        if callback
            @commit callback


    count: (type, query, callback) ->
        if not type or typeof(type) is 'function'
            throw 'type is needed'

        if typeof(query) is 'function'
            callback = query
            query = null

        url = "https://api.parse.com/1/classes/#{type}"
        params = {count: 1, limit: 0}
        if query
            params.where = query

        opts = {method: 'get', url: url, params: params}
        @_request opts, (err, data) ->
            if err
                return callback err
            return callback null, data.count


    clear: (type, callback) ->
        if not type or typeof(type) is 'function'
            throw 'type is needed'

        @count type, (err, count) =>
            if err
                return callback err
            async.mapSeries [0..(count/50)+1], (index, cb) =>
                console.log index, "skip: #{index*50}, limit: #{50}"
                @find type, {skip: index*50, limit: 50}, (err, results) =>
                    if err
                        return cb err
                    for item in results
                        @delete type, item.objectId
                        console.log 'delete', item.objectId
                    return cb null
            , (err) =>
                if err
                    return callback err
                @commit callback






class Database extends DatabaseInterface

    dbtype: 'parse'

    # options:
    #   - applicationId: parse application ID
    #   - restApiKey: parse rest API key
    #   - types: [], list of parse classes available in the application
    #
    constructor: (options) ->
        super options
        @parse = new Parse(options)


    # ## clear
    # empty the database
    #
    # example:
    #       @clear (err, ok) ->
    clear: (callback) ->
        @store.clear (err, numRemoved) ->
            if err
                return callback err
            return callback null, numRemoved


    # ## count
    # return the number of item that match the query
    #
    # example:
    #   @count: {_type: 'test'}, (err, total) ->
    count: (query, callback) =>
        if typeof query is 'function' and not callback
            callback = query
            query = {}

        @store.count query._type, (err, total) ->
            if err
                return callback err
            return callback null, total





if require.main is module
    parse = new Parse({
        applicationId: '0QyAmgnZzesyp0dwCia9i8CYdVuhdQ7IBWhL4mOw'
        restApiKey: 'UR04QojCucelFllqQ7QtJzMf167wtB9w8jXkLKtW'
    })

    parse.find 'test', {where: {foo: {$gt: 20, $lt: 26}}, order:'-foo'}, (err, res) ->
        console.log '>>>', err, res

    # for i in [0..200]
        # parse.create 'test', {thisis: 'atest', right: true, foo: i}
    # parse.commit (err, res) ->
        # console.log '====', err, 'ok'

        # parse.clear 'test', (err, res) ->
        #     console.log '.....>>>', err, res

        #     parse.count 'test', (err, res) ->
        #         console.log '#', err, res




            #     parse.create 'test', {thisis: 'atest', right: true}, (err, res) ->
            #         console.log '>>>', err, res, res.length,res[0].success.objectId

            #         parse.update 'test', res[0].success.objectId, {thisis: 'atest3', right: true, foo: 1}, (err, res) ->
            #             console.log '$$$$', err, res

            #         parse.clear 'test', (err, res) ->
            #             console.log '!!!XXX', err, res



