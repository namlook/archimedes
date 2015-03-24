
{defaultTypes, Type} = require './types'
{extendOnClass} = require('extendonclass')
objectdiff = require 'objectdiff'
async = require 'async'
_ = require 'underscore'
{deepClone} = require './utils'


class Database
    # allow to extend the model in javascript
    @extend: extendOnClass

    constructor: (options) ->
        options = options || {}
        @modelsList = []
        @_cache = {}
        # the types used by the schema to describe, validate and compute values
        @_types = defaultTypes
        @inversedProperties = {}

    # ## count
    # return the number of documents that match the query
    count: (query, options, callback) ->
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
        if not callback and typeof(options) is 'function'
            callback = options
            options = {}
        else if not callback and typeof(query) is 'function'
            callback = query
            options = {}
            query = {}


        unless options.instances?
            options.instances = true

        unless callback
            throw 'callback is required'

        # if _.isString query
        #     @_findById query, options, callback
        # else if _.isArray query
        #     @_findByIds query, options, callback
        # else
        @_find query, options, callback


    # _findById: (query, options, callback) ->
    #     callback '_findById() is not implemented'

    # _findByIds: (query, options, callback) ->
    #     callback '_findByIds() is not implemented'

    _find: (query, options, callback) ->
        callback '_find() is not implemented'


    # ## findModelsFromReferences
    #
    # return the instantiated models from their references
    # (used for propagating deleltion)
    findModelsFromReferences: (references, options, callback) ->
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}

        unless callback
            throw 'callback is required'

        unless references
            return callback("references are required")

        unless _.isArray(references)
            references = [references]

        dereferences = (@dereference(ref) for ref in references)

        modelsByType = {}
        for deref in dereferences
            modelsByType[deref._type] = [] unless modelsByType[deref._type]?
            modelsByType[deref._type].push(deref._id)

        dbContext = @

        findByTypeFn = (type, ids) ->
            return (cb) ->
                dbContext[type].find {_id: ids}, (err, results) ->
                    if err
                        return cb(err)
                    return cb(null, results)

        parallelProcess = []
        for type, ids of modelsByType
            unless @[type]
                return callback "the model #{type} is not registered. You should register models in order to use findModelsFromReferences()"
            parallelProcess.push findByTypeFn(type, ids)

        async.parallel parallelProcess, (err, _results) ->
            if err
                return callback(err)

            results = []
            for res in _results
                results = results.concat(res)

            return callback(null, results)



    # ## first
    # Returns the first document that match the query
    #
    # example:
    #   @first query, options, (err, doc) ->
    first: (query, options, callback) ->
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}

        unless callback
            throw 'callback is required'

        options.limit = 1

        @find query, options, (err, results) ->
            if err
                return callback err
            if results.length > 0
                results = results[0]
            else
                results = null
            return callback null, results

    # ## facets
    # `facets(field, [query], [options], callback)`
    #
    # Performe a group count on a specified field. A query can be added to filter
    # the data to aggregate
    #
    # It takes the following options
    #   * limit: (default 30) the maximum of results to return
    #
    facets: (query, options, callback) =>
        callback 'facets() is not implemented'


    # ## sync
    # Insert or update a pojo into the database. An `_id` attribute
    # will be added if there isn't already.
    #
    # Note that the pojo should have an _type field.
    #
    #
    # The callback takes the model and an information object which have the
    # following form:
    #
    # * dbTouched: true if the database has been hit.
    #
    # example:
    #   @sync pojo, 'Test', (err, obj, infos) ->
    #   @sync pojo, {type: 'Test'}, (err, obj, infos) ->
    sync: (pojo, options, callback) ->
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}
        unless callback
            throw 'callback is required'

        unless pojo._type?
            callback "_type field not found in pojo"

        changes = null

        changes = @changes pojo
        if changes is null
            return callback null, pojo, {dbTouched: false}

        if pojo._id
            options.changes = changes
            @_update pojo, options, (err, obj) =>
                if err
                    return callback err
                @_updateCache(pojo)
                return callback null, pojo, {dbTouched: true}
        else
            @_insert pojo, options, (err, obj) =>
                if err
                    return callback err
                @_updateCache(obj)
                return callback null, obj, {dbTouched: true}


    _update: (pojo, options, callback) ->
        callback '_update() is not implemented'


    _insert: (pojo, options, callback) ->
        callback '_insert() is not implemented'

    # ## batchSync
    #
    # Sync multiple objects at the same time.
    # Objects can be pojos or models. In fact, `batchSync()` will call
    # the method `toSerializableObject()` on each object if it exists. If not
    # the object is treated as a regular pojo.
    #
    # example:
    #   @batchSync objects, (err, data)
    batchSync: (objects, options, callback) ->
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}
        unless callback
            throw 'callback is required'
        unless objects or not _.isArray(objects)
            throw 'an array of objects is required'

        pojos = (pojo.toSerializableObject? and pojo.toSerializableObject()\
         or pojo for pojo in objects)

        async.map pojos, (pojo, cb) =>
            @sync pojo, options, (err, result, options) ->
                if err
                    return cb err
                return cb null, {result: result, options: options}
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
                                            added[fieldName][lang].push __infos.value
                                        else if __infos.changed is 'removed'
                                            removed[fieldName][lang].push __infos.value
                                        else if __infos.changed is 'primitive change'
                                            added[fieldName][lang].push __infos.added
                                            removed[fieldName][lang].push __infos.removed

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

            # attach the reference of the database to the model
            # We need the db to be available from class and instance methods
            model::db = @
            model.db = @

            # validate and attach the model to the database
            @validateModel(modelName, model)
            @_registerInversedProperties(modelName, model)
            @[modelName] = model
            @modelsList.push modelName


    # # clearRegisteredModels
    # unregister the registered models
    clearRegisteredModels: () ->
        for modelName in @modelsList
            delete @[modelName]
        @modelsList = []

    # ## beforeRegister
    beforeRegister: (modelName, model) ->
        # Update the model's schema which inherits of its parent's
        schema = {}
        for key, value of model.__super__?.schema or {}
            schema[key] = deepClone(value)
        for key, value of model::schema or {}
            schema[key] = deepClone(value, schema[key])
        model::schema = schema

        # # Update the model's meta which inherits of its parent's
        meta = {}
        for key, value of model.__super__?.meta or {}
            meta[key] = value
        for key, value of model::meta or {}
            meta[key] = value
        meta.name = modelName
        meta.type = modelName
        model::meta = meta

        # if the model doesn't specify default language, we set it
        unless model::meta.defaultLang
            model::meta.defaultLang = @defaultLang


    # ## validateModel
    # Check the model structure for any errors
    validateModel: (modelName, model) ->
        unless model::schema?
            throw "#{modelName} has not schema"

        for fieldName, field of model::schema
            if field.i18n and field.type isnt 'string'
                throw "#{modelName}.#{fieldName} is i18n and must be of type string"

    # ## reference
    # build a unique string from a couple type/id. The reference is used
    # to specify relationship between objects
    reference: (type, id) ->
        if not id?
            throw "id is required to build reference"
        if not type?
            throw "type is required to build reference"
        return "#{type}::#{id}"

    # ## dereference
    # take a reference and convert id into a pojo of the following form:
    #  {
    #     _id: 'the_object_id', _type: 'the_object_type'
    #  }
    dereference: (reference) ->
        if not reference or reference.indexOf('::') is -1
            throw "unknown reference"
        splitedRef = reference.split('::')
        return {
            _id: splitedRef.slice(-1)[0],
            _type: splitedRef.slice(0, -1).join('::')
        }

    # ## isReference
    # Returns true if the string is reference
    isReference: (str) ->
        if str.split('::').length > 1
            return true
        return false

    #
    #
    # Private methods
    #
    #

    # ## _registerInversedProperties
    _registerInversedProperties: (modelName, model) ->
        for fieldName, infos of model::schema
            if infos.inverse?
                unless @inversedProperties[infos.type]?
                    @inversedProperties[infos.type] = {}
                @inversedProperties[infos.type][infos.inverse] = {
                    type: modelName,
                    fieldName: fieldName
                }

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
        rand = Math.floor(Math.random() * 10000)
        return parseInt(rand).toString(36) + parseInt(now.getTime()).toString(36)


module.exports = Database
