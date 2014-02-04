# # NeDB adapter

_ = require 'underscore'

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


    # ## _update
    # update a pojo into the database
    _update: (pojo, changes, callback) ->
        @store.update {_id: pojo._id}, pojo, (err, obj) =>
            if err
                return callback err
            return callback null, obj


    # ## _insert
    # insert a pojo into the database
    _insert: (pojo, callback) ->
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



    # findModel: (model, IDsOrQuery, options, callback) =>
    #     if typeof options is 'function' and not callback
    #         callback = options
    #         options = {}

    #     unless IDsOrQuery
    #         return callback 'IDsOrQuery are required'

    #     if _.isArray(IDsOrQuery)
    #         query = {'$or': ({'_id': id} for id in IDsOrQuery)}
    #     else if _.isString(IDsOrQuery)
    #         query = {'_id': IDsOrQuery}
    #     else
    #         query = IDsOrQuery

    #     @store.find query, (err, data) ->
    #         if err
    #             return callback err
    #         results = []
    #         for item in data
    #             results.push new model(item)
    #         return callback null, results



    # ## syncModel
    # synchronize a model data with the database
    #
    # If the model is new (never saved) the model id is genreated automatically.
    #
    # example:
    #       @syncModel model, (err, modelId) ->
    # syncModel: (model, callback) =>

    #     changes = model.changes()

    #     # if there is no changes, we don't need to make a server call
    #     unless changes
    #         return callback null, {id: model.id, dbTouched: false}

    #     model.beforeSave (err) =>
    #         if err
    #             return callback err

    #         if model.isNew()
    #             @store.insert model.toJSONObject(), (err, newDoc) ->
    #                 if err
    #                     return callback err
    #                 return callback null, {id: newDoc._id, dbTouched: true}
    #         else
    #             @store.update {_id: model.id}, model.toJSONObject(), (err, newDoc) ->
    #                 if err
    #                     return callback err
    #                 return callback null, {id: newDoc._id, dbTouched: true}



module.exports = Database

