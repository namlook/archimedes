
# # Model

_ = require 'underscore'
async = require 'async'
objectdiff = require 'objectdiff'
{extendOnClass} = require 'extendonclass'
{isPojo} = require './utils'




class ValueError extends Error
class ModelError extends Error


class Model
    # allow to extend the model in javascript
    @extend: extendOnClass

    # The `db` attribute will be added when the model will be registered to the
    # database. It is used to fetch and store the model
    db: null


    # ### Meta informations
    # The `meta` attribute keeps all information about the model database:

    # - **uri**: The type URI.
    #     If unset, the type is automatically built against
    #     `db.defaultClassesNamespace` and the class name (`@constructor.name`)
    # - **instancesNamespace**:
    #     The namespace URI which will prefix all instances id.
    #     If unset, it is automatically built against `db.defaultInstancesNamespace`
    #     and the lowered class name (`@constructor.name`)
    # - **propertiesNamespace**:
    #     The default namespace URI used if no uri are specified in fields.
    #     If unset, it is automatically filled with `db.defaultPropertiesNamespace`
    # - **graphURI**:
    #     The graph URI where the data will be stored.
    #     If unset, it is automatically set via db.graphURI
    # - **schema**:
    #     If true, then fields which are not in schema will not be loaded and
    #     an error will be raised (unknown field) if a value is set.
    # - **label**:
    #     The name of the model to present to the user
    #     An i18n representation can be set by specifying an object which
    #     takes a lang code as key and the label as value.
    #     If unset, the lowered class name will be used (`@constructor.name`)
    # - **defaultLang**:
    #     Fallback to this lang for i18n fields
    #     if not set, it is automatically filled with `db.defaultLang`
    meta: null

    # ### schema
    #
    # A model has a schema which take a field name has a key and an object as
    # a value which takes the following form:

    # - **type**: the type of the field's value. Any values supported by
    #      node-validator are supported ('string', 'integer', 'boolean',
    #      'date', 'url', 'email'). To specified a relation with another
    #      model, just specify the model name (ex: `'User'`)
    # - **uri**: the uri of the property. If unset, it is automatically built
    #      against `@propertiesNameSpace` (or if not set, against
    #      `db.defaultPropertiesNameSpace`) and the lowered field name
    # - **label**: the i18n representation of the field name (ex: `{lang: value}`)
    # - **required**: if true, an exception will be raise if the field is unset
    #      while saving the model for the first time
    # - **i18n**: if true, allow to set multi value for the field (one for each
    #      language). See `@set` and `@get` for more details.
    # - **multi**: if true, takes an array of values. See `@push` and `@pull` for
    #      more details.
    # - **readOnly**: (default false) if true, the property won't accept any
    #       other values than the first one. Usefull for fields which have to be
    #       set only once (like `createdAt` or `slug`)
    # - **default**: if a value, set the value automatically while creating the
    #      model. If a function is specified, the returned value will be used
    #      validate: take a `function(value, model)` to validate the value
    #      transform: take a `function(value, model)` which will transform the
    #      value and return it (usefull for hashing passwords by example)
    # - **compute(model, value, lang)**: a function to be called each time a
    #       property is set. `compute` take the model, the value and the language
    #       is the field is i18n.
    # - **reversed**: the name of the property which will be include into the
    #      related model. This allow to fetch reversed relations via mongo-like
    #      queries. For instance, with `reversed: 'posts'`, blogs can be fetched
    #      directly via the query:
    #
    #         db.Blog.find {'posts.author.login': 'bob'}, (err, blogs) ->
    #             console.log blogs
    schema: _.clone({
        _id:
            readOnly: true
            type: 'string'
        _type:
            protected: true
            type: 'string'
            default: (model) ->
                model.meta.name
    })


    constructor: (properties) ->
        properties = properties or {}

        # where the values are actually stored
        @_properties = {}

    	# where the related instances (fetched via uris) are stored
        @_instances = {}

        # store initial properties so we can track changes later
        @_cachedProperties = {}

        # the model is not yet synced with the db
        @_isNew = true

        # fill the model with the values passed to the constructor
        for key, value of properties
            @set key, value

            # value = @__computeValue(value, {fieldName: key, model: @})
            # @_initProperties[key] = _.clone(value)

        # set all other properties to their default values if specified
        for fieldName, field of @schema
            if field.default? and not properties[fieldName]?
                if _.isFunction(field.default)
                    value = field.default(@)
                else
                    value = field.default #_.clone(field.default)

                @set fieldName, value, {quietReadOnly: true}

                # value = @__computeValue(value, {fieldName: fieldName, model: @})
                # @_initProperties[fieldName] = value

        @_updateCachedProperties()


    @beforeQuery: (query, options, callback) ->
        return callback null, query, options


    @count: (query, options, callback) ->
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}
        if typeof(query) is 'function'
            callback = query
            options = {}
            query = {_type: @::meta.type}
        return @db.count query, options, callback

    # # Static methods

    # ## find
    # `find query, [options], (err, results) ->`
    #
    # Returns an arraw of instances
    # The `find` method is the only way to fetch objects.
    #
    # If `query` is:
    #
    # - an id, then fetch the document that match this id
    # - un array of id, then fetch all instance by their ids
    # - un object, performs a mongo-like query
    #
    # `find` takes the following options:
    #
    # - **limit**: (default 10) the number limit of documents to return
    # - **sortBy**: (default null) the field name by which the results should be
    #    sorted
    # - **order**: 1 or -1 (default null)
    # - **skip**: (default 0)
    # - **populate**: (default false) if true, fetch asynchronously all the
    #    related instance object (if they exists). If an array of field names
    #    is passed, fetch only those instances.
    # - **hide**: (default true) if true, hide all hidden-fields. An array can be
    #    passed to specified other fields to hide.
    #    If fields are hiden a 'field hidden' error will be throw if their value
    #    are been read or modified
    # - **describe**: (default false) if true, return a field with all the label
    #    of the related instances. A lang code can be to specify which i18n
    #    version to use
    @find: (query, options, callback) ->
        if typeof(query) is 'function'
            callback = query
            query = {}
            options = {}
        else if typeof(options) is 'function' and not callback
            callback = options
            options = {}

        unless callback
            throw 'callback is required'

        unless query._type?
            query._type = @::meta.type

        @beforeQuery query, options, (err, query, options) =>
            @db.find query, options, (err, pojos) =>
                if err
                    return callback err

                instances = (new @(pojo) for pojo in pojos)
                if options.populate
                    async.map instances, (instance, cb) ->
                        populateOptions = {}
                        if _.isNumber options.populate
                            fields = (fname for fname, val of @schema when @db[val.type]?)
                        else # populate is a list of fields
                            fields = null
                            populateOptions.recursive = true
                        instance.populate fields, populateOptions, cb
                    , (err, data) =>
                        if err
                            return callback err
                        return callback null, instances
                else
                    return callback null, instances


    # ## findURIs
    # `findIDs query, [options], (err, ids) ->`
    #
    # Like `find` but returns only the object ids
    @findIDs: (query, options, callback) ->
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}

        unless callback
            throw 'callback is required'

        options.instance = false
        @find query, options, callback


    # ## first
    # Like `find` but returns only the first object found
    #
    # `first query, [options], (err, model) ->`
    #
    # If `query` is:
    #
    # - an id, fetch the related instance
    # - un array of id, then fetch all instance by their ids
    # - an object, performs a mongo-like query
    #
    # `first` takes the same options than `find`
    @first: (query, options, callback) ->
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}

        unless callback
            throw 'callback is required'

        options.limit = 1
        @find query, options, (err, pojos) ->
            if err
                return callback err
            unless pojos.length
                return callback null, null
            return callback null, pojos[0]


        # @db.first query, options, (err, pojo) =>
        #     if err
        #         return callback err

        #     obj = new @(pojo)

        #     if options.populate
        #         populateOptions = {}
        #         if _.isNumber options.populate
        #             fields = (fname for fname, val of @schema when @db[val.type]?)
        #         else # populate is a list of fields
        #             fields = null
        #             populateOptions.recursive = true
        #         obj.populate fields, populateOptions, (err, populatedObj) ->
        #             return callback null, populatedObj
        #     else
        #         return callback null, obj

    # ## firstURI
    # Like `first` but returns only the first object URI
    #
    # `firstURI query, [options], (err, URI) ->`
    @firstID: (query, options, callback) ->
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}

        unless callback
            throw 'callback is required'
        options.instance = false

        @first query, options, callback


    # ## facets
    # `facets(query, [options], callback)`

    # Performe a group count of the query. It takes the following options:

    # * fields: faceting only on the specified fields. If no fields are
    #     set, then the faceting is done for all fields
    @facets: (query, options, callback) ->
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}
        unless callback
            throw 'callback is required'
        # ...


    # ## populate
    # Asyncronously populate the instance with all related object values.
    #
    # `populate [fields...], options, (err, model) ->`
    #
    # `fields` is an array of fieldNames
    #
    # options:
    #   - recursive: (default false) if true, populate all inner relations
    #
    # **example**:
    #
    #     @populate [fieldname1, fieldname2],  (err, model) ->
    #
    #
    # if `fields` are not specified, populate all related fields.
    #
    # **example**:
    #
    #     @populate (err, model) ->
    #
    # If field values are already populated, do nothing.
    populate: (fields, options, callback) ->
        if typeof(fields) is 'function' and not callback
            callback = fields
            options = {}
            fields = null

        if typeof(options) is 'function' and not callback
            callback = options
            options = {}

        if _.isObject(fields) and not _.isArray(fields)
            options = fields
            fields = null

        # if no fields are specified, build it from the schema
        unless _.isArray(fields) and fields.length > 0
            fields = (fname for fname, val of @schema when @db[val.type]?)


        # build relations index for each field
        relationFieldNames = {}
        relationInstances = {}
        for fieldName in fields
            relationId = @get(fieldName)
            if relationId
                if _.isString relationId
                    relationId = [relationId]
                relationFieldNames[fieldName] = {
                    id: relationId
                    model: @db[@schema[fieldName].type]
                }
                for relId in relationId
                    relationInstances[relId] = {
                        model: @db[@schema[fieldName].type]
                    }

        relationIds = _.keys(relationInstances)

        # fetch the related instances
        @db.find relationIds, (err, data) =>
            if err
                return callback err

            # instanciate relations
            for pojo in data
                rinfo = relationInstances[pojo._id]
                relationInstances[pojo._id].instance = new rinfo.model(pojo)

            # dispatch all related instances into the correct fields
            instancesToPopulate = []
            for fieldName, relinfo of relationFieldNames
                if @schema[fieldName].multi
                    instance = (relationInstances[id].instance for id in relinfo.id)
                else
                    instance = relationInstances[relinfo.id].instance
                @set fieldName, instance

                if options.recursive
                    instancesToPopulate = _.union(instancesToPopulate, instance)

            # if recursive, populate the inner instances
            if options.recursive
                async.map instancesToPopulate, (instance, cb) ->
                    instance.populate options, cb
                , (err, data) =>
                    if err
                        return callback err
                    return callback null, @
            else
                return callback null, @


    # ## batchPopulate
    # Populate multi instances in one time
    #
    # `batchPopulate instances, options, (err)`
    #
    # options:
    #   - recursive: (default false), if true, populate all inner relation
    batchPopulate: (instances, options, callback) ->


    # ## Get
    # Returns a field's value.
    #
    # `get(fieldName, [options])`
    #
    # If the field type is an object, the related object
    # will be fetched.
    #
    # - If the field is i18n, options.lang must be pass to specify in which
    # local the value will be returned.
    # - If the field is i18n and no `options.lang` is specified, the default
    # language is used.
    # - If a options.lang is passed on a non-i18n field, the lang is not taked in
    # account.
    # - If the field is a multi-field, the value returned will be an array
    # of objects
    # - If the field is a relation field, the URI is returned.
    #
    # If `options`:
    #
    # - **lang**: the lang used for i18n fields
    #
    # If `options` is a string, it is taken as a lang code.
    get: (fieldName, options) =>
        @__checkFieldExistance(fieldName)

        options = @__parseOptions(options, {
            validate: true, quietReadOnly: false
        }, fieldName)

        if @schema[fieldName].i18n
            @_properties[fieldName] = {} unless @_properties[fieldName]?
            lang = options.lang
            return @_properties[fieldName][lang]
        @_properties[fieldName]


    # ## getInstance
    # Return the instance if the value of the requested field is a relation.
    #
    # `getInstance(fieldName, [options])`
    #
    # If `options.lang` is specified, all i18n field's value will be return in
    # that language. If `options` is a string, it is taken as a lang code.
    getInstance: (fieldName, options) =>
        @__checkFieldExistance(fieldName)
        # ...


    # ## getLabel
    # Returns the label of a field.
    #
    # `getLabel(fieldName, [options])`
    #
    # If the label is i18n then the lang should be specified in options.
    # If fieldName is null, return the label of model
    #
    # `options`:
    #
    # - **lang**: the specified language of the wanted label
    #
    # If `options` is a string, it is taken as a lang code
    getLabel: (fieldName, options) =>
        @__checkFieldExistance(fieldName)

        options = options or {}
        if _.isString options
            options = {lang: options}
        lang = options.lang

        label = @schema[fieldName].label
        if _.isObject label
            label = label[lang]
        if not label
            label = fieldName.toLowerCase();
        return label


    # ## describe
    # Describe the model and its schema
    #
    # `options`:
    #
    # - **lang**: if specified, returns only the label in this language
    #
    # If `options` is a string, it is taken as lang code
    describe: (fieldName, options) =>
        # ...


    # ## set
    # Set the value of a field.
    #
    # `set(fieldName, value, [options])`
    #
    # The value can be of any valid type (included instance).
    # - If the field is multi, the value should be an array of object/uris
    # - If the field is a i18n-field, a `options.lang` can be passed.
    # - If the field is a non-i18n field, the `options.lang` is ignored.
    #
    # If the value is null or underfined, then apply the `unset()` method
    # to the field (example: `obj.set('field', null)` is the same as
    # `obj.unset('field')`
    #
    # `options`:
    # - **lang**: the lang used in value (for i18n fields)
    # - **validate**: (default true) if false, do not validate the value
    # - **quietReadOnly**: (default false) if true, do not throw an error if
    #       a value is set to a read-only field
    #
    # If `options` is a string, it is taken as a lang code
    set: (fieldName, value, options) =>
        options = options or {}

        if value in [null, undefined]
            @unset(fieldName, options)
            return

        @__checkFieldExistance(fieldName)

        # parse options
        checkLang = fieldName
        if isPojo(value) and not value.meta?.name?
            checkLang = null
        options = @__parseOptions(options,
            {validate: true, quietReadOnly: false},
        checkLang)

        # check if the field is read-only. If so, throw an error if a value is
        # already set
        if @schema[fieldName].readOnly
            if (not @schema[fieldName].i18n and @_properties[fieldName]?) or (
              @schema[fieldName].i18n and @_properties[fieldName]?[options.lang]?)
                if options.quietReadOnly
                    return
                throw new ValueError("#{@meta.name}.#{fieldName} is read-only")

        # if the value is an array, delegate to @push
        if _.isArray(value)
            unless @schema[fieldName].multi
                throw new ValueError(
                    "#{@meta.name}.#{fieldName} doesn't accept array")
            options.quietReadOnly = true
            @unset fieldName, options
            for item in value
                @push fieldName, item, options
        else
            # set the value
            if @schema[fieldName].i18n
                unless @_properties[fieldName]?
                    @_properties[fieldName] = {}

                if isPojo(value) and not value.meta?.name
                    i18nValue = value
                else
                    lang = options.lang
                    i18nValue = {}
                    i18nValue[lang] = value

                for lang, val of i18nValue
                    if isPojo(value) and @schema[fieldName].multi
                        for valitem in val
                            @push fieldName, valitem, lang # XXX options not passed
                    else
                        val = @__processValue(val,
                            {fieldName: fieldName, lang: lang, model: @})

                        @_properties[fieldName][lang] = val
            else
                value = @__processValue(value, {fieldName: fieldName, model: @})

                if fieldName is '_id'
                    @id = value
                else if fieldName is '_type'
                    @type = value

                @_properties[fieldName] = value


    # ## push
    # Set the value of a multi-field
    #
    # `push(fieldName, value, [options])`
    #
    # The value can be of any valid type (included instance)
    # - If the field is a non-multi field, an error is throwed
    # - If the field is an i18n-field, a options.lang can be passed to specify
    #    the local, it is ignored otherwise.
    #
    # `options`:
    # - **lang**: the lang used in value
    # - **validate**: (default true) if false, do not validate the value
    # - **quietReadOnly**: (default false) if true, do not throw an error if
    #       a value is set to a read-only field
    #
    # If `options` is a string, it is taken as a lang code
    push: (fieldName, value, options) =>
        @__checkFieldExistance(fieldName)

        options = @__parseOptions(options, {
            validate: true, quietReadOnly: false
        }, fieldName)

        unless @schema[fieldName].multi
            throw new ValueError(
                "#{@meta.name}.#{fieldName} is not a multi field")

        # check if the field is read-only. If so, throw an error if a value is
        # already set
        if @schema[fieldName].readOnly
            if (not @schema[fieldName].i18n and @_properties[fieldName]?) or (
              @schema[fieldName].i18n and @_properties[fieldName]?[options.lang]?)
                if options.quietReadOnly
                    return
                throw new ValueError("#{@meta.name}.#{fieldName} is read-only")


        if @schema[fieldName].i18n
            @_properties[fieldName] = {} unless @_properties[fieldName]?

            lang = options.lang

            unless @_properties[fieldName][lang]?
                @_properties[fieldName][lang] = []

            value = @__processValue(value,
                {fieldName: fieldName, lang: lang, model: @})

            @_properties[fieldName][lang].push value

        else
            @_properties[fieldName] = [] unless @_properties[fieldName]

            value = @__processValue(value, {fieldName: fieldName, model: @})

            @_properties[fieldName].push value


    # ## pull
    # Remove the value of a multi-field
    #
    # `pull(fieldName, value, [options])`
    #
    # The value can be of any valid type (included instance).
    #
    # If the field is a non-multi field, an error is throwed
    #
    # `options`:
    # - **lang**: the lang used in value
    # - **quietReadOnly**: (default false) if true, do not throw an error if
    #       a value is set to a read-only field
    #
    # If `options` is a string, it is taken as a lang code
    pull: (fieldName, value, options) =>
        @__checkFieldExistance(fieldName)

        options = @__parseOptions(options, {
            quietReadOnly: false
        }, fieldName)

        unless @schema[fieldName].multi
            throw new ValueError(
                "#{@meta.name}.#{fieldName} is not a multi field")

        # a read-only field cannot be removed
        if @schema[fieldName].readOnly
            if options.quietReadOnly
                return
            throw new ValueError("#{@meta.name}.#{fieldName} is read-only")

        if @schema[fieldName].i18n
            lang = options.lang
            if @_properties[fieldName]?[lang]?

                values = _.without @_properties[fieldName][lang], value
                @_properties[fieldName][lang] = values
        else
            if @_properties[fieldName]

                values = _.without @_properties[fieldName], value
                @_properties[fieldName] = values


    # ## unset
    # Remove the value of a field.
    #
    # `unset(fieldName, [options])`
    #
    # The value can be of any valid type (included instance).
    #
    # If the field is an i18n-field, pass the lang to specify which version of
    # the field should be deleted.
    #
    # `options`:
    # - **lang**: the lang used
    # - **quietReadOnly**: (default false) if true, do not throw an error if
    #       a value is set to a read-only field
    #
    # If `options` is a string, it is taken as a lang code
    unset: (fieldName, options)=>
        options = options or {}
        @__checkFieldExistance(fieldName)

        # a read-only field cannot be unset
        if @schema[fieldName].readOnly
            if options.quietReadOnly
                return
            throw new ValueError("#{@meta.name}.#{fieldName} is read-only")

        # unset the field
        if @schema[fieldName].i18n
            if _.isString(options)
                options = {lang: options}
            if options.lang?
                lang = options.lang
                if @_properties[fieldName]?[lang]?
                    delete @_properties[fieldName][lang]

        else
            delete @_properties[fieldName]


    # ## has
    # Returns true if the field value exists and is not null.
    #
    # `has(fieldName, [options])`
    #
    # If the field is a i18n-field, pass the options.lang to specify the locale.
    #
    # `options`:
    # - **lang**: the lang used in value
    #
    # If `options` is a string, it is taken as a lang code
    has: (fieldName, options) =>
        unless @schema[fieldName]?
            return false

        options = @__parseOptions(options, {validate: true }, fieldName)

        if _.isString options
            if @schema[fieldName].i18n
                options = {lang: options}

        if @schema[fieldName].i18n
            lang = options.lang
            return @_properties[fieldName]?[lang]?
        @_properties[fieldName]?


    # ## isPopulated
    # Returns true if the value of the field is a relation and the instance has
    # already been fetched
    #
    # `isPopulated(fieldName)`
    isPopulated: (fieldName) =>
        @__checkFieldExistance(fieldName)
        # ...


    # ## clear
    # Delete all the field values of the object
    clear: =>
        @_properties = {}
        @_instances = {}


    # ## hasChanged
    # Returns true if the object has changed before its last synchronisation
    hasChanged: ()->
        @changes() isnt null


    # ## changes
    # Returns the changed properties before the last synchronisation of the model.
    # Returns null if nothing has changed
    changes: () ->
        setValue = (target, fieldName, value, options) ->
            options = options or {}
            i18n = options.i18n or false
            multi = options.multi or false
            lang = options.lang
            if i18n
                target[fieldName] = {} unless target[fieldName]?
                if multi
                    target[fieldName][lang] = [] unless target[fieldName][lang]?
                    target[fieldName][lang].push value
                else
                    target[fieldName][lang] = value
            else if multi
                target[fieldName] = [] unless target[fieldName]?
                target[fieldName].push value
            else
                target[fieldName] = value

        setDiff = (fieldName, infos, options) ->
            if infos.changed is 'added'
                setValue(added, fieldName, infos.value, options)
            else if infos.changed is 'removed'
                setValue(removed, fieldName, infos.value, options)
            else if infos.changed is 'primitive change'
                setValue(removed, fieldName, infos.removed, options)
                setValue(added, fieldName, infos.added, options)

        added = {}
        removed = {}
        diff = objectdiff.diff(@_cachedProperties, @_properties)

        if diff.changed is 'object change'
            for fieldName, infos of diff.value
                if infos.changed is 'object change'
                    if @schema[fieldName].i18n
                        for lang, linfos of infos.value
                            if linfos.changed is 'object change'
                                for index, mlinfos of linfos.value
                                    setDiff(fieldName, mlinfos, {
                                        i18n: true, lang: lang, multi: true
                                    })
                            else
                                setDiff(fieldName, linfos, {
                                    i18n: true, lang: lang
                                })
                    else if @schema[fieldName].multi
                        for index, minfos of infos.value
                            setDiff(fieldName, minfos, {multi: true})
                else
                    setDiff(fieldName, infos)

            return {
                added: added
                removed: removed
            }
        return null


    # ## save
    # Sync the changed field into the database
    #
    # `save (err, model, infos) ->`
    #
    # Only the field marked as change will be updated. If fields has been unset,
    # their related property uri will be delete.
    #
    # infos:
    #   - dbTouched: if true, its means that the data has hitted the database
    save: (callback) =>
        if not callback
            throw 'callback is required'

        if typeof(callback) isnt 'function'
            throw 'callback should be a function'

        try
            @__checkRequiredFields()
        catch e
            return callback e.message

        # save all pending relations...
        async.map @_getPendingRelations(), (model, cb) ->
            model.save (err, obj, infos) ->
                if err
                    return cb err
                return cb null, infos
        ,  (err, results) =>
            if err
                return callback err
            dbTouched =  _.some(_.map(results, (obj)-> obj.dbTouched))

            @db.sync @toSerializableObject(), (err, obj, infos) =>
                if err
                    return callback err

                if infos.dbTouched
                    @_isNew = false
                    unless @id?
                        @set '_id', obj._id

                dbTouched = infos.dbTouched or dbTouched

                @_updateCachedProperties()

                return callback null, @, {dbTouched: dbTouched}


    beforeSave: (next) ->
        next()

    # ## rollback
    # returns the model to the state it was the last time it was saved (or created)
    rollback: () =>
        @_properties = {}
        for key, value of @_cachedProperties
            if _.isArray value
                @_properties[key] = _.clone(value)
            else if _.isObject(value) and not _.isArray(value)
                @_properties[key] = {} unless @_properties[key]
                for lang, val of value
                    @_properties[key][lang] = val
            else
                @_properties[key] = value


    # ## delete
    # delete the model instance and all its related property uris.
    #
    # example:
    #       @delete (err) ->
    delete: (callback) =>
        unless callback
            throw 'callback is required'
        unless @id
            return callback "can't delete a non-saved model"
        @db.delete @id, (err) =>
            if err
                if callback
                    return callback err
                return

            @_isNew = true
            @_cachedProperties = {}

            if callback
                return callback null


    # ## clone
    # Returns a new instance of the model with identical attributes.
    # Note that the new cloned instance is a new object thus it has no id.
    clone: () ->
        props = @toJSONObject()
        delete props._id
        clonedObj = new @db[@meta.name](@toJSONObject())
        delete clonedObj._properties._id
        delete clonedObj.id
        return clonedObj


    # ## isNew
    # Returns true if the object has not been saved yet.
    isNew: () =>
        return @_isNew


    # ## toJSONObject
    # Convert the model into a plain old javascript object (usefull for
    # templating)
    #
    # options:
    #   - populate: if true, include the relation. For example, if a blogpost
    #       has a author setted, then the author is included into the resulted
    #       object. If `populate` is false, only the id of the related instance
    #       is added. If `populate` is equal to 'ref', then populate with
    #       `{_id: instanceId, _type: instanceType}`. This is useful if one
    #       wants to export in json but do not want to loose the type reference.
    toJSONObject: (options) =>
        options = options or {}
        jsonObject = {}
        for key, value of @_properties
            if @schema[key].multi and not @schema[key].i18n
                unless _.isArray(value)
                    value = [value]
                for val in value
                    jsonObject[key] = [] unless jsonObject[key]?
                    if val.meta?.name and val.toJSONObject?
                        if options.populate
                            if options.populate is 'ref'
                                jsonObject[key].push {_id: val.id, _type: val.type}
                            else
                                jsonObject[key].push val.toJSONObject(options)
                        else
                            jsonObject[key].push val.id
                    else
                        jsonObject[key].push val
            else if _.isObject(value) and not _.isArray(value) and not _.isDate(value)
                jsonObject[key] = {} unless jsonObject[key]?
                if value.meta?.name and value.toJSONObject?
                    if options.populate
                        if options.populate is 'ref'
                            jsonObject[key] = {_id: value.id, _type: value.type}
                        else
                            jsonObject[key] = value.toJSONObject(options)
                    else
                        jsonObject[key] = value.id
                else
                    for lang, val of value
                        jsonObject[key][lang] = val
            else
                jsonObject[key] = value
        return jsonObject



    # ## toSerializableObject
    # convert the model into a simple pojo which will be passed to the database
    # The implementation of this method may be different that toJSONObject
    # because of some database specificity. For instance, triples stores are
    # using uri for identifing fields.
    toSerializableObject: (options) ->
        options = options or {}
        options.populate = false
        return @toJSONObject(options)


    # ## serialize
    # Return a raw representation of the model. This representation is useful
    # if one wants to batch import the data directly into the database (with
    # is usualy faster than using the `sync()` method)
    serialize: (options) ->
        return @toSerializableObject(options)


    # ## toJSON
    # Convert the model into a JSON string
    toJSON: (options) =>
        return JSON.stringify @toJSONObject(options)


    # # Private methods
    #
    # ## __parseOptions
    #
    # take an options object, some defaultValues and return a sanitized object.
    # it will then throw an error if the field is i18n and no lang is found.
    # Note that the lang is `options` if `options` is a string
    __parseOptions: (options, defaultValues, fieldName) ->
        options = options or {}

        if fieldName
            if _.isString(options)
                if @schema[fieldName].i18n
                    options = {lang: options}
                else
                    throw "bad options: #{@meta.name}.#{fieldName} is not i18n"

            if @schema[fieldName].i18n and not options.lang
                throw "#{@meta.name}.#{fieldName} is i18n and need a language"

        for key, value of defaultValues
            unless options[key]?
                options[key] = value
        return options


    # ## __checkFieldExistance
    #
    # raise an error if the field doesn't exists in schema
    __checkFieldExistance: (fieldName) ->
        unless @schema[fieldName]?
            throw "'#{@meta.name}.#{fieldName}' not found"


    # ##  __checkRequiredFields
    #
    # raise an error if a requied field is empty
    __checkRequiredFields: () ->
        for fieldName, field of @schema
            if field.required
                ok = true
                unless @_properties[fieldName]?
                    ok = false
                else if field.i18n
                    keys = _.keys(@_properties[fieldName])
                    if keys.length is 0
                        ok = false
                    else if field.multi
                        for lang, values of @_properties[fieldName]
                            if values.length is 0
                                ok = false
                else if field.multi
                    if @_properties[fieldName].length is 0
                        ok = false
                unless ok
                    throw new ValueError("#{@meta.name}.#{fieldName} is required")


    # ## __processValue
    #
    # compute and validate the value before returning it.
    __processValue: (value, attrs) ->
        value = @__computeValue(value, attrs)
        @__validateValue(value, attrs)
        return value


    # ## __validateValue
    #
    # throw an error if the value is not to the correct type
    __validateValue: (value, attrs) ->
        type = @schema[attrs.fieldName].type
        ok = true
        if @db._types[type]?
            unless @db._types[type].validate(value)
                ok = false
        else if @db[type]? and type isnt value.meta?.name and \
          not _.isString(value) and not value._id?
            ok = false
        unless ok
            throw new ValueError(
                "#{@meta.name}.#{attrs.fieldName} must be a #{type}")


    # ## __computeValue
    #
    # return the computed the value by the schema's field's `compute` function
    __computeValue: (value, attrs) ->
        fieldName = attrs.fieldName
        lang = attrs.lang
        type = @schema[fieldName].type
        if @db._types[type]?.compute?
            value = @db._types[type].compute(value, attrs)
        if @schema[fieldName].compute?
            return @schema[fieldName].compute(value, attrs)
        return value


    # ## __getPendingRelations()
    #
    # returns all the pending relations of the model
    _getPendingRelations: () ->
        pendings = []
        for fieldName, value of @_properties
            schema = @schema[fieldName]
            if @db[schema.type]?
                if schema.i18n
                    for lang, val of value
                        if schema.multi
                            pendings = _.union(pendings, val)
                        else
                            pendings.push val
                else if schema.multi
                    pendings = _.union(pendings, value)
                else
                    pendings.push value
        return pendings


    # ## _updateCachedProperties()
    #
    # update the cached properties
    _updateCachedProperties: () ->
        @_cachedProperties = {}
        for key, value of @_properties
            if _.isArray value
                @_cachedProperties[key] = _.clone(value)
            else if _.isObject(value) and not _.isArray(value)
                @_cachedProperties[key] = {} unless @_cachedProperties[key]
                for lang, val of value
                    @_cachedProperties[key][lang] = val
            else
                @_cachedProperties[key] = value

module.exports = Model
