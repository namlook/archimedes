# # RDF Database

_ = require 'underscore'
async = require 'async'

DatabaseInterface = require '../interface/database'
Datastore = require 'nedb'

class Database extends DatabaseInterface

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


    # ## length
    # return the number of data present into the db
    length: (callback) =>
        @store.count {}, (err, count) ->
            if err
                return callback err
            return callback null, count


    # ## sync
    # Insert or update a pojo into the database. An `_id` attribute
    # will be added if there isn't already.
    #
    # example:
    #   @sync pojo, (err, obj) ->
    sync: (pojo, callback) ->

        changes = null

        changes = @changes pojo
        if changes is null
            return callback null, pojo, {dbTouched: false}

        if pojo._id
            @store.update {_id: pojo._id}, pojo, (err, obj) =>
                if err
                    return callback err
                @_updateCache(pojo)
                return callback null, pojo, {dbTouched: true}
        else
            @store.insert pojo, (err, obj) =>
                if err
                    return callback err
                @_updateCache(pojo)
                return callback null, obj, {dbTouched: true}


    batchSync: (pojos, callback) ->
        async.map pojos, (pojo, cb) =>
            @sync pojo, (err, result, options) ->
                cb err, {result: result, options: options}
        , (err, results, options) ->
            if err
                return callback err
            return callback null, results

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


    # ## find
    # Returns the document that match the query
    #
    # example
    #   @find {title: foo, age: {$gt: 1}}, options, (err, docs) ->
    find: (query, options, callback) ->
        if typeof options is 'function' and not callback
            callback = options
            options = {}

        if _.isString query
            @_findById query, options, callback
        else if _.isArray query
            @_findByIds query, options, callback
        else
            @_find query, options, callback


    # ## _find
    # perform a find query against a regular query
    #
    # example:
    #   @_find query, options, (err, docs) ->
    _find: (query, options, callback) ->
        call = @store.find query
        if options.limit
            call.limit options.limit
        call.exec callback

    # ## _findByIds
    # fetch documents by their ids
    #
    # example:
    #   @_findByIds ids, options, (err, docs) ->
    _findByIds: (ids, options, callback) ->
        query = {$or: ({_id: id} for id in ids)}
        @store.find query, callback

    # ## _findById
    # fetch a document by its id
    #
    # example:
    #   @_findById id, options, (err, docs) ->
    _findById: (id, options, callback) ->
        @store.find {_id: id}, callback


    # ## first
    # Returns the first document that match the query
    #
    # example:
    #   @first query, options, (err, doc) ->
    first: (query, options, callback) ->
        if typeof options is 'function' and not callback
            callback = options
            options = {}
        options.limit = 1

        @find query, options, (err, results) ->
            if err
                return callback err
            if results.length > 0
                results = results[0]
            else
                results = null
            return callback null, results

    findModel: (model, IDsOrQuery, options, callback) =>
        if typeof options is 'function' and not callback
            callback = options
            options = {}

        unless IDsOrQuery
            return callback 'IDsOrQuery are required'

        if _.isArray(IDsOrQuery)
            query = {'$or': ({'_id': id} for id in IDsOrQuery)}
        else if _.isString(IDsOrQuery)
            query = {'_id': IDsOrQuery}
        else
            query = IDsOrQuery

        @store.find query, (err, data) ->
            if err
                return callback err
            results = []
            for item in data
                results.push new model(item)
            return callback null, results



    # ## syncModel
    # synchronize a model data with the database
    #
    # If the model is new (never saved) the model id is genreated automatically.
    #
    # example:
    #       @syncModel model, (err, modelId) ->
    syncModel: (model, callback) =>

        changes = model.changes()

        # if there is no changes, we don't need to make a server call
        unless changes
            return callback null, {id: model.id, dbTouched: false}

        model.beforeSave (err) =>
            if err
                return callback err

            if model.isNew()
                @store.insert model.toJSONObject(), (err, newDoc) ->
                    if err
                        return callback err
                    return callback null, {id: newDoc._id, dbTouched: true}
            else
                @store.update {_id: model.id}, model.toJSONObject(), (err, newDoc) ->
                    if err
                        return callback err
                    return callback null, {id: newDoc._id, dbTouched: true}



module.exports = Database

