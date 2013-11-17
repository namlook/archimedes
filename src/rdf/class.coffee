
_ = require 'underscore'

class Class

    constructor: (fields) ->
        unless @meta
            @meta = {}
        unless @defaultLang
            @defaultLang = 'en'

        # Construct meta.uri base on @baseURI if not specified
        if not @meta.uri and @classesBaseURI
            name = @meta.name or @constructor.name
            @meta.uri = "#{@classesBaseURI}/#{name}"

        unless @meta.uri
            throw "#{@constructor.name}.meta.uri not specified"

        @model = {}
        
        for key, value of fields
            @set key, value

    # The `find` method is the only way to fetch objects
    # Object can be fetched by id (URI), or via a query
    # A query can be a mongo-like or sparql-like query
    #
    # Mongo-like query
    # ----------------
    # A mongo-like query take the following form:
    #     {fieldName: value}
    # we can reach relations with the doted notation
    #
    #    {'blogPost.comment.author.name': 'Nico'}
    #
    # Sparql-like query (aka Sparqlite)
    # ---------------------------------
    # A Sparql-like query take the followin form:
    #
    #  ?this <[[fieldName]]> "value" .
    #
    # We can reach relations and make complex query like this
    #
    #  ?this <[BlogPost.comment]> ?comment .
    #  ?comment <[Comment.author]> ?author .
    #  ?author <[Author.name]> "Nico" .
    #
    # ?this should be type of the object we are calling the `find` method.
    #
    # options:
    #   * limit: (int)
    #   * sortBy: 'fieldName'
    #   * order: 1 or -1
    #   * skip: (int)
    #   * populate: (default false) if true, fetch asynchronously all the
    #       related instance object. If an array of field name is passed,
    #       fetch only those instances.
    find: (URIsOrQuery, options, callback)=>
        unless URIsOrQuery
            throw new Error('URIsOrQuery are required')
        if typeof options is 'function' and not callback
            callback = options
        # if not options and not callback
            # return query as promise
        # ...

    _findMongo: (mongoQuery, options, callback)=>
        # ...

    _findSparqlite: (SparqliteQuery, options, callback)=>
        # ...

    _findByURI: (URIs, options, callback)=>
        # ...
    
    _findSparql: (sparqlQuery, options, callback)=>
        # ...
    
    
    # like `find` but returns only the object ids (uri)
    findUris: (URIsOrQuery, options, callback)=>
        options.instance = false
        @find URIsOrQuery, options, callback

    # like `find` but returns only the first object found
    first: (URIsOrQuery, options, callback) =>
        options.limit = 1
        @find URIsOrQuery, options, callback
    
    # like `first` but returns only the first object uri
    firstUri: (URIsOrQuery, options, callback)=>
        options.limit = 1
        options.instance = false
        @find URIsOrQuery, options, callback 
    
    # Performe a groupCount for the query
    #
    #   options:
    #       * fields: faceting only on the specified fields. If no fields are
    #                 set, then the faceting is done for all fields
    facets: (query, options, callback)=>
        if typeof options is 'function' and not callback
            callback = options
        # ...

    # Asyncronously populate the instance with all related object values
    # `fields` can be a fieldName or an array of fieldNames
    #
    # example:
    # @populate [fieldname1, fieldname2],  (err, instance1, instance2...) ->
    #   # ...
    #
    # if `fields` are not specified, populate all fields which values are URIs
    # example:
    # @populate (err, {fieldname1: instance1, fieldname2: instance2}) ->
    #   # ...
    # if field values are already populated, do nothing.
    populate: (fields, callback) ->
        unless callback
            fields = callback
        # ..


    # return the field. If the field type is an object, the related object
    # will be fetched. 
    #
    #   If the field is i18n, options.lang must be pass to specify in which
    # local the value will be returned.
    #   If the field is i18n and no optionslang is specified, the default
    # language is used.
    #  If a options.lang is passed on a non-i18n field, the lang is not taked in
    # account.
    #   If the field is a multi-field, the value returned will be an array
    # of objects
    #   If the field is a relation field, the URI is returned.
    #
    #  options:
    #     * lang: the lang used for i18n fields
    get: (fieldName, options) =>
        if @structure[fieldName].i18n
            @model[fieldName] = {} unless @model[fieldName]?
            lang = options and options.lang or @defaultLang
            return @model[fieldName][lang]
        @model[fieldName]


    # return the instance if the value of the requested field is a relation
    # if options.lang is specified, all i18n field's value will be return in
    # that language
    getInstance: (fieldName, options) =>
        # ...

    # Set the value of a field.
    # The value can be of any valid type (included instance)
    # If the field is multi, the value should be an array of object/uris
    # If the field is a i18n-field, a optionslang can be passed.
    # If the field is a non-i18n field, the options.lang is ignored.
    #
    # options:
    #       * lang: the lang used in value (for i18n fields)
    #       * validate: (default true) if false, do not validate the value
    set: (fieldName, value, options) =>
        if @structure[fieldName].i18n
            @model[fieldName] = {} unless @model[fieldName]?
            lang = options and options.lang or @defaultLang
            @model[fieldName][lang] = value
        else
            @model[fieldName] = value

    
    # Set the value of a multi-field
    # The value can be of any valid type (included instance)
    # If the field is a non-multi field, an error is throwed
    # if the field is an i18n-field, a options.lang can be passed to specify the
    # local, it is ignored otherwise.
    #
    # options:
    #       * lang: the lang used in value
    #       * validate: (default true) if false, do not validate the value
    push: (fieldName, value, options) =>
        if @structure[fieldName].multi
            if @structure[fieldName].i18n
                @model[fieldName] = {} unless @model[fieldName]?
                lang = options and options.lang or @defaultLang
                @model[fieldName][lang] = [] unless @model[fieldName][lang]?
                @model[fieldName][lang].push value
            else
                @model[fieldName] = [] unless @model[fieldName]
                @model[fieldName].push value
        else
            throw "#{@constructor.name}.#{fieldName} is not a multi field"

    # Remove the value of a multi-field
    # The value can be of any valid type (included instance)
    # If the field is a non-multi field, an error is throwed
    #
    # options:
    #       * lang: the lang used in value
    pull: (fieldName, value, options) =>
        if @structure[fieldName].multi
            if @structure[fieldName].i18n
                lang = options and options.lang or @defaultLang
                if @model[fieldName]?[lang]?
                    @model[fieldName][lang] = _.without @model[fieldName][lang], value
            else
                if @model[fieldName]
                    @model[fieldName] = _.without @model[fieldName], value
        else
            throw "#{@constructor.name}.#{fieldName} is not a multi field"

    # Remove the value of a field.
    # The value can be of any valid type (included instance)
    # If the field is an i18n-field, pass the lang to specify which version of
    # the field should be deleted.
    #
    # options:
    #       * lang: the lang used
    unset: (fieldName, options)=>
        if @structure[fieldName].i18n
            lang = options and options.lang or @defaultLang
            if @model[fieldName]?[lang]?
                delete @model[fieldName][lang]
        else
            delete @model[fieldName]


    # Returns true if the field value exists and is not null.
    # If the field is a i18n-field, pass the options.lang to specify the locale
    #
    # options:
    #       * lang: the lang used in value
    has: (fieldName, options) =>
        if @structure[fieldName].i18n
            lang = options and options.lang or @defaultLang
            return @model[fieldName]?[lang]?
        @model[fieldName]?
    

    # return true if the value of the field is a relation and the instance has
    # already been fetched
    isPopulated: (fieldName) =>
        # ...

    # Delete all the field values of the object
    clear: =>
        @model = {}


    # true if the object has changed before its last synchronisation
    hasChanged: ()->
        # ...

    # Sync the changed field into the database
    # Only the field marked as change will be updated. If fields has been unset,
    # their related property uri will be delete.
    # 
    # callback: (err, nugget)
    save: (callback) =>
        # ...
    
    onBeforeSave: (next) =>
        # ...
    
    onAfterSave:  =>
        # ...
    

    # Delete the object and all its related property uris.
    delete: (callback) =>
        # ...

    onBeforeDelete: (next) =>
        # ...
    
    onAfterDelete: =>
        # ...

    # # validate all field against the structure declaration
    # validate: (callback) =>
    #   # ...
    
    # onBeforeValidate: (next) =>
    #   # ...
    
    # onAfterValidate: =>
    #   # ...

    # Returns a new instance of the model with identical attributes. If `id` is
    # specified, use it for the new instance id, else a new id will be generated
    clone: (id)=>
        # ...
        

    # Returns true if the object has not been saved yet.
    isNew: =>
        # ...

    # Convert the model into a plain old javascript object (usefull for
    # templating)
    toJSONObject: ()->
        # ...

    # Convert the model into a JSON string
    toJSON: ()->
        # ...

module.exports = Class