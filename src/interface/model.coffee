
# # Model

_ = require 'underscore'
objectdiff = require 'objectdiff'

class ValueError extends Error
class ModelError extends Error

class Model

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
    # - **default**: if a value, set the value automatically while creating the
    #      model. If a function is specified, the returned value will be used
    #      validate: take a `function(value, model)` to validate the value
    #      transform: take a `function(value, model)` which will transform the
    #      value and return it (usefull for hashing passwords by example)
    # - **reversed**: the name of the property which will be include into the
    #      related model. This allow to fetch reversed relations via mongo-like
    #      queries. For instance, with `reversed: 'posts'`, blogs can be fetched
    #      directly via the query:
    #
    #         db.Blog.find {'posts.author.login': 'bob'}, (err, blogs) ->
    #             console.log blogs
    schema: null


    constructor: (properties) ->
        # where the values are actually stored
        @_properties = {}

    	# where the related instances (fetched via uris) are stored
        @_instances = {}

        # store initial properties so we can track changes later
        @_initProperties = {}

        for key, value of properties
            @_properties[key] = _.clone(value)
            @_initProperties[key] = _.clone(value)

        @id = @_properties.id if @_properties.id?
        @_isNew = true

    # # Static methods

    # ## find
    # `find URIsOrQuery, [options], (err, results) ->`
    #
    # Returns an arraw of instances
    # The `find` method is the only way to fetch objects.
    #
    # If `URIsOrQuery` is:
    #
    # - un array, fetch all instance by their ids
    # - un object, performs a mongo-like query
    # - a string, performs a sparql query
    #
    # `find` takes the following options:
    #
    # - **limit**: (default 10) the number limit of documents to return
    # - **sortBy**: (default null) the field name by which the results should be
    #    sorted
    # - **order**: 1 or -1 (default null)
    # - **skip**: (default 0)
    # - **populate**: (default false) if true, fetch asynchronously all the
    #    related instance object (if they exists). If an array of field name
    #    is passed, fetch only those instances.
    # - **hide**: (default true) if true, hide all hidden-fields. An array can be
    #    passed to specified other fields to hide.
    #    If fields are hiden a 'field hidden' error will be throw if their value
    #    are been read or modified
    # - **describe**: (default false) if true, return a field with all the label
    #    of the related instances. A lang code can be to specify which i18n
    #    version to use
    # - **prefixes**: if true, prefix the sparql query with the one specified on
    #    the db. If `prefixes` is an object, the key is the prefix and the value
    #    the full URL.
    @find: (URIsOrQuery, options, callback)=>
        unless URIsOrQuery
            throw new ModelError('URIsOrQuery are required')

        if typeof options is 'function' and not callback
            callback = options

        if _.isArray URIsOrQuery
            return @_findViaURIs URIsOrQuery, options, callback
        else if _.isString URIsOrQuery
            return @_findViaSparqlite URIsOrQuery, options, callback
        else
            return @_findViaMongo URIsOrQuery, options, callback


    # #### Query
    #
    # ##### Mongo-like query
    # A mongo-like query take the following form:
    #
    #     {fieldName: value}
    #
    # we can reach relations with the doted notation
    #
    #     {'blogPost.comment.author.name': 'Nico'}
    @_findViaMongo: (mongoQuery, options, callback) =>


    # ##### Sparql-like query (aka Sparqlite)
    # A Sparql-like query take the followin form:
    #
    #     ?this <[[fieldName]]> "value" .
    #
    # We can reach relations and make complex query like this
    #
    #     ?this <[BlogPost.comment]> ?comment .
    #     ?comment <[Comment.author]> ?author .
    #     ?author <[Author.name]> "Nico" .
    #     ?this <[BlogPost.blog]>  <#{nicoblog.id}>  .
    #
    # `?this` should be type of the object we are calling the `find` method.
    @_findViaSparqlite: (SparqliteQuery, options, callback) =>
        # ...


    @_findViaURIs: (URIs, options, callback) =>
        # ...



    # ## findURIs
    # `findURIs URIsOrQuery, [options], (err, URIs) ->`
    #
    # Like `find` but returns only the object ids (uri)
    @findURIs: (URIsOrQuery, options, callback) =>
        options.instance = false
        @find URIsOrQuery, options, callback


    # ## first
    # Like `find` but returns only the first object found
    #
    # `first URIOrQUery, [options], (err, model) ->`
    #
    # If `URIOrQuery` is:
    #
    # - an URI, fetch the related instance
    # - an object, performs a mongo-like query
    # - a string, performs a sparql query
    #
    # `first` takes the same options than `find`
    @first: (URIOrQuery, options, callback) =>
        options.limit = 1
        @find URIsOrQuery, options, callback

    # ## firstURI
    # Like `first` but returns only the first object URI
    #
    # `firstURI URIOrQuery, [options], (err, URI) ->`
    @firstURI: (URIOrQuery, options, callback)=>
        options.limit = 1
        options.instance = false
        @find URIsOrQuery, options, callback


    # ## facets
    # `facets(query, [options], callback)`

    # Performe a group count of the query. It takes the following options:

    # * fields: faceting only on the specified fields. If no fields are
    #     set, then the faceting is done for all fields
    @facets: (query, options, callback)=>
        if typeof(options) is 'function' and not callback
            callback = options
        # ...


    # ## populate
    # Asyncronously populate the instance with all related object values.
    #
    # `populate [fields], (err, model) ->`
    #
    # `fields` can be a fieldName or an array of fieldNames
    #
    # **example**:
    #
    #     @populate [fieldname1, fieldname2],  (err, instance1, instance2...) ->
    #
    #
    # if `fields` are not specified, populate all fields which values are URIs.
    #
    # **example**:
    #
    #     @populate (err, {fieldname1: instance1, fieldname2: instance2}) ->
    #
    # If field values are already populated, do nothing.
    populate: (fields, callback) =>
        unless callback
            if typeof(fields) isnt 'function'
                throw 'a callback is required'
            callback = fields
        # ...


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
    # - If the field is i18n and no optionslang is specified, the default
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
        if @schema[fieldName].i18n
            @_properties[fieldName] = {} unless @_properties[fieldName]?
            lang = @__getLang(fieldName, options)
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
        lang = @__getLang(fieldName, options)
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
    # - If the field is a i18n-field, a optionslang can be passed.
    # - If the field is a non-i18n field, the `options.lang` is ignored.
    #
    # `options`:
    # - **lang**: the lang used in value (for i18n fields)
    # - **validate**: (default true) if false, do not validate the value
    #
    # If `options` is a string, it is taken as a lang code
    set: (fieldName, value, options) =>
        if _.isArray(value) and not @schema[fieldName].multi
            throw new ValueError("'#{fieldName}' doesn't accept array")
        if @schema[fieldName].i18n
            unless @_properties[fieldName]?
                @_properties[fieldName] = {}
            lang = @__getLang(fieldName, options)
            @_properties[fieldName][lang] = value
        else
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
    #
    # If `options` is a string, it is taken as a lang code
    push: (fieldName, value, options) =>
        unless @schema[fieldName].multi
            throw new Error("#{@constructor.name}.#{fieldName} is not a multi field")

        if @schema[fieldName].i18n
            @_properties[fieldName] = {} unless @_properties[fieldName]?
            lang = @__getLang(fieldName, options)
            unless @_properties[fieldName][lang]?
                @_properties[fieldName][lang] = []
            @_properties[fieldName][lang].push value
        else
            @_properties[fieldName] = [] unless @_properties[fieldName]
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
    #
    # If `options` is a string, it is taken as a lang code
    pull: (fieldName, value, options) =>
        unless @schema[fieldName].multi
            throw new Error("#{@constructor.name}.#{fieldName} is not a multi field")

        if @schema[fieldName].i18n
            lang = @__getLang(fieldName, options)
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
    #
    # If `options` is a string, it is taken as a lang code
    unset: (fieldName, options)=>
        if @schema[fieldName].i18n
            lang = @__getLang(fieldName, options)
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
        if @schema[fieldName].i18n
            lang = @__getLang(fieldName, options)
            return @_properties[fieldName]?[lang]?
        @_properties[fieldName]?


    # ## isPopulated
    # Returns true if the value of the field is a relation and the instance has
    # already been fetched
    #
    # `isPopulated(fieldName)`
    isPopulated: (fieldName) =>
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
        diff = objectdiff.diff(@_initProperties, @_properties)

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
    # `save (err, model) ->`
    #
    # Only the field marked as change will be updated. If fields has been unset,
    # their related property uri will be delete.
    save: (callback) =>
        @db.sync @, (err, id) =>
            if err
                if callback
                    return callback err
                return

            @_initProperties = {}
            for key, value of @_properties
                @_initProperties[key] = _.clone(value)
            @_isNew = false
            @id = id

            if callback
                return callback null, @


    # ## rollback
    # returns the model to the state it was the last time it was saved (or created)
    rollback: () =>
        @_properties = {}
        for key, value of @_initProperties
            @_properties[key] = _.clone(value)


    # ## delete
    # delete the model instance and all its related property uris.
    #
    # example:
    #       @delete (err) ->
    delete: (callback) =>
        @db.deleteModel @, (err) =>
            if err
                if callback
                    return callback err
                return

            @_isNew = true

            if callback
                return callback null


    # ## validate
    # If the field as a validate field in schema, apply the validator against
    # the value. Example:
    #
    #    value:
    #       type: 'integer'
    #       require: true
    #       validation: (value, obj) ->
    #           value > 0 && model.get('othervalue') is value
    #
    validate: () =>
      # ...


    # ## clone
    # Returns a new instance of the model with identical attributes.
    # Note that the new cloned instance is a new object thus it has no id.
    clone: ()=>
        return new @constructor(@_properties)


    # ## isNew
    # Returns true if the object has not been saved yet.
    isNew: () =>
        return @_isNew


    # ## toJSONObject
    # Convert the model into a plain old javascript object (usefull for
    # templating)
    toJSONObject: () =>
        jsonObject = {}
        for key, value of @_properties
            jsonObject[key] = _.clone(value)
        if @id
            jsonObject.id = @id
        return jsonObject


    # ## toJSON
    # Convert the model into a JSON string
    toJSON: () =>
        return JSON.stringify @toJSONObject()


    # # Private methods
    #
    # ## __getLang
    # `__getLang(fieldName, [options])`
    #
    # return the language if specified in options, fallback to @meta.defaultLang
    # otherwise and throw an error if no language are found.
    # `options` can be a string (the lang code) or an object with the following
    # keys:
    #
    # * lang: the lang used
    __getLang: (fieldName, options) =>
        lang = options?.lang or options or @meta.defaultLang
        unless lang
            throw "'#{fieldName}' is i18n and need a language"
        return lang


module.exports = Model
