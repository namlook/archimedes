# # NeDB adapter

_ = require 'underscore'

DatabaseInterface = require '../interface/database'
Datastore = require 'nedb'

class Database extends DatabaseInterface

    dbtype: 'nedb'


    # options:
    #
    constructor: (options) ->
        super options
        @store = new Datastore()


    # ## clear
    # empty the database
    #
    # example:
    #       @clear (err, ok) ->
    clear: (callback) ->
        @store.remove {}, {multi: true}, (err, numRemoved) ->
            if err
                return callback err
            return callback null, numRemoved


    # ## count
    # return the number of item that match the query
    count: (query, callback) =>
        if typeof query is 'function' and not callback
            callback = query
            query = {}

        @store.count query, (err, count) ->
            if err
                return callback err
            return callback null, count


    # ## _update
    # update a pojo into the database
    _update: (pojo, options, callback) ->
        @store.update {_id: pojo._id}, pojo, (err, obj) =>
            if err
                return callback err
            return callback null, obj


    # ## _insert
    # insert a pojo into the database
    _insert: (pojo, options, callback) ->
        @store.insert pojo, (err, obj) =>
            if err
                return callback err
            return callback null, obj


    # ## delete
    # Delete the item in database that match the id
    #
    # example:
    #       @remove id, (err) ->
    delete: (id, callback) =>
        unless id
            return callback "id must no be null"
        @store.remove { _id: id }, {}, (err, numRemoved) ->
            if err
                return callback err
            return callback null, numRemoved


    # ## _find
    # perform a find query against a regular query
    #
    # example:
    #   @_find query, options, (err, docs) ->
    _find: (query, options, callback) ->
        newQuery = {}
        for key, value of query
            if '@' in key
                newkey = key.replace('@', '.')
                query[newkey] = value
                delete query[key]
        call = @store.find query
        if options.limit
            call.limit options.limit
        call.exec (err, data) =>
            if err
                return callback err

            return callback null, data


    # ## _findByIds
    # fetch documents by their ids
    #
    # example:
    #   @_findByIds ids, options, (err, docs) ->
    _findByIds: (ids, options, callback) ->
        query = {$or: ({_id: id} for id in ids)}
        @_find query, options, callback

    # ## _findById
    # fetch a document by its id
    #
    # example:
    #   @_findById id, options, (err, docs) ->
    _findById: (id, options, callback) ->
        @_find {_id: id}, options, callback



module.exports = Database

