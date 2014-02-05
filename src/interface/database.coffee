
{defaultTypes, Type} = require './types'
{extendOnClass} = require('extendonclass')
objectdiff = require 'objectdiff'
async = require 'async'
_ = require 'underscore'


class Database
    # allow to extend the model in javascript
    @extend: extendOnClass

    constructor: (options) ->
        options = options || {}
        @_cache = {}
        # the types used by the schema to describe, validate and compute values
        @_types = defaultTypes

    # ## count
    # return the number of documents that match the query
    count: (query, callback) ->
        callback 'count() is not implemented'


    # ## syncModel
    # synchronize the model instance with the database
    # syncModel: (model, callback) =>
    #     if model.id?
    #         id = model.id
    #     else
    #         id = @__buildId()
    #     return callback null, {id: id, dbTouched: true};


    # ## clear
    # remove all data from the database
    clear: (callback) =>
        callback 'clear() is not implemented'


    # ## find
    # Returns the document that match the query
    #
    # example
    #   @find {title: foo, age: {$gt: 1}}, options, (err, docs) ->
    find: (query, options, callback) ->
        if typeof options is 'function' and not callback
            callback = options
            options = {}

        unless callback
            throw 'callback is required'

        if _.isString query
            @_findById query, options, callback
        else if _.isArray query
            @_findByIds query, options, callback
        else
            @_find query, options, callback


    _findById: (query, options, callback) ->
        callback '_findById() is not implemented'

    _findByIds: (query, options, callback) ->
        callback '_findByIds() is not implemented'

    _find: (query, options, callback) ->
        callback '_find() is not implemented'


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



    # ## sync
    # Insert or update a pojo into the database. An `_id` attribute
    # will be added if there isn't already.
    #
    # example:
    #   @sync pojo, (err, obj) ->
    sync: (pojo, callback) ->

        unless callback
            throw 'callback is required'

        changes = null

        changes = @changes pojo
        if changes is null
            return callback null, pojo, {dbTouched: false}

        if pojo._id
            @_update pojo, changes, (err, obj) =>
                if err
                    return callback err
                @_updateCache(pojo)
                return callback null, pojo, {dbTouched: true}
        else
            @_insert pojo, (err, obj) =>
                if err
                    return callback err
                @_updateCache(obj)
                return callback null, obj, {dbTouched: true}


    _update: (pojo, changes, callback) ->
        callback '_update() is not implemented'


    _insert: (pojo, callback) ->
        callback '_insert() is not implemented'

    # ## batchSync
    #
    # Sync multiple pojo at a time
    #
    # example:
    #   @batchSync pojos, (err, data)
    batchSync: (pojos, callback) ->

        unless callback
            throw 'callback is required'

        async.map pojos, (pojo, cb) =>
            @sync pojo, (err, result, options) ->
                cb err, {result: result, options: options}
        , (err, results, options) ->
            if err
                return callback err
            return callback null, results

    # ## changes
    # Returns the changed properties before the last synchronisation of the model.
    # Returns null if nothing has changed
    # Return undefined if the pojo is not yet saved into the db
    changes: (pojo) ->

        if @_cache[pojo._id] is undefined
            return undefined

        cachedPojo = @_cache[pojo._id]
        diff = objectdiff.diff(cachedPojo, pojo)
        added = {}
        removed = {}

        if diff.changed is 'object change'
            for fieldName, infos of diff.value
                if infos.changed is 'object change'
                    if _.isArray pojo[fieldName]
                        if infos.changed isnt 'equal'
                            # process multi field
                            for key, _infos of infos.value
                                if _infos.changed isnt 'equal'
                                    added[fieldName] = [] unless added[fieldName]
                                    removed[fieldName] = [] unless removed[fieldName]
                                    if _infos.changed is 'added'
                                        added[fieldName].push _infos.value
                                    else if _infos.changed is 'removed'
                                        removed[fieldName].push _infos.value
                                    else if _infos.changed is 'primitive change'
                                        added[fieldName].push _infos.added
                                        removed[fieldName].push _infos.removed

                    else # this is i18n
                        if infos.changed isnt 'equal'
                            added[fieldName] = {} unless added[fieldName]
                            removed[fieldName] = {} unless removed[fieldName]
                            for lang, _infos of infos.value
                                if _infos.changed is 'added'
                                    added[fieldName][lang] = _infos.value
                                else if _infos.changed is 'removed'
                                    removed[fieldName][lang] = _infos.value
                                else if _infos.changed is 'primitive change'
                                    added[fieldName][lang] = _infos.added
                                    removed[fieldName][lang] = _infos.removed
                                else if _infos.changed is 'object change'
                                    # this is a multi-i18n field
                                    for index, __infos of _infos.value
                                        added[fieldName][lang] = [] unless added[fieldName][lang]
                                        removed[fieldName][lang] = [] unless removed[fieldName][lang]
                                        if __infos.changed is 'added'
                                            added[fieldName][lang] = __infos.value
                                        else if __infos.changed is 'removed'
                                            removed[fieldName][lang] = __infos.value
                                        else if __infos.changed is 'primitive change'
                                            added[fieldName][lang] = __infos.added
                                            removed[fieldName][lang] = __infos.removed

                else # this is a regular field
                    if infos.changed is 'added'
                        added[fieldName] = infos.value
                    else if infos.changed is 'removed'
                        removed[fieldName] = infos.value
                    else if infos.changed is 'primitive change'
                        added[fieldName] = infos.added
                        removed[fieldName] = infos.removed

            return {
                added: added
                removed: removed
            }

        return null


    ################################
    #
    #
    # Model dealing section
    #
    #
    ################################

    # ## registerCustomTypes
    #
    # allow the developper to add custom types. The type should take the form or
    # a schema's field. Example:
    #
    # db.registerCustomType({
    #   slug: {
    #       type: 'string',
    #       compute: function(model, value, lang){
    #           return lang+'-'+value.toLowerCase().split(' ').join('-')-
    #       }),
    #       validate: function(value) ->
    #           return value.indexOf(' ') === -1
    #    }
    # });
    #
    # Note that one can overwrite the default values (eg: string, boolean) so be
    # carreful !
    registerCustomTypes: (types) ->
        for typeName, type of types
            @_types[typeName] = new Type(@, type)

    # Register the models
    # The registration make some fill the models with default values and sanitize
    # and check their schema. Finally, attach each models to the database
    # instance so we can access them easily
    registerModels: (models) =>
        for modelName, model of models
            @beforeRegister(modelName, model)

            # Update the schema of model which inherits of its parent's
            for field, value of model.__super__?.schema
                model::schema[field] = value

            @validateModel(modelName, model)
            model::db = @
            model.db = @
            @[modelName] = model

    # ## beforeRegister
    beforeRegister: (modelName, model) ->
        unless model::meta?
            model::meta = {}

        model::meta.name = modelName

        unless model::schema?
            throw "#{modelName} has not schema"

        # if the model doesn't specify default language, we set it
        unless model::meta.defaultLang
            model::meta.defaultLang = @defaultLang


    # ## validateModel
    # Check the model structure for any errors
    validateModel: (modelName, model) =>
        # throw "not implemented"


    #
    #
    # Private methods
    #
    #

    # ## _updateCache
    #
    # Update the internal cache. This cache is useful for tracking pojos changes
    _updateCache: (obj) ->
        @_cache[obj._id] = {}
        for key, value of obj
            if _.isArray value
                @_cache[obj._id][key] = (_.clone(val) for val in value)
            else if _.isObject(value) and not _.isArray(value)
                @_cache[obj._id][key] = {} unless @_cache[obj._id][key]
                for lang, val of value
                    @_cache[obj._id][key][lang] = _.clone(val)
            else
                @_cache[obj._id][key] = _.clone(value)


    # ## __buildId
    #
    # Generate a unique ID for the model
    __buildId: () ->
        now = new Date()
        rand = Math.floor(Math.random() * 10)
        return rand + parseInt(now.getTime()).toString(36)


module.exports = Database
