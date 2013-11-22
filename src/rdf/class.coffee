

_ = require 'underscore'
Model = require '../interface/model'

class RdfClass extends Model

    # @db will be added when the model will be registered to the database
    # This is use to fetch and store the model
    db: null

    # @meta is keep all information about the model database
    #   * typeURI: The type URI.
    #       If unset, the type is automatically built against
    #       db.defaultClassesNamespace and the class name (@constructor.name)
    #
    #   * instancesNamespace:
    #       The namespace URI which will prefix all instances id.
    #       If unset, it is automatically built against db.defaultInstancesNamespace
    #       and the lowered class name (@constructor.name)
    #
    #   * propertiesNamespace:
    #       The default namespace URI used if no uri are specified in fields.
    #       If unset, it is automatically filled with db.defaultPropertiesNamespace
    #
    #   * graphURI:
    #       The graph URI where the data will be stored.
    #       If unset, it is automatically set via db.graphURI
    #
    #   * schema:
    #       If true, then fields which are not in structure will not be loaded and
    #       an error will be raised (unknown field) if a value is set.
    #
    #   * label:
    #       The name of the model to present to the user
    #       An i18n representation can be set by specifying an object which
    #       takes a lang code as key and the label as value.
    #       If unset, the lowered class name will be used (@constructor.name)
    #
    #   * defaultLang:
    #       Fallback to this lang for i18n fields
    #       if not set, it is automatically filled with db.defaultLang
    meta: null

    # The structure of the model
    #
    #  fieldName:
    #       type: the type of the field's value. Any values supported by
    #             node-validator are supported ('string', 'integer', 'boolean',
    #            'date', 'url', 'email'). To specified a relation with another
    #            model, just specify the model name (ex: 'User')
    #       uri: the uri of the property. If unset, it is automatically built
    #            against @propertiesNameSpace (or if not set, against
    #            db.defaultPropertiesNameSpace) and the lowered field name
    #       labels: the i18n representation of the field name (ex: {lang: value})
    #       required: if true, an exception will be raise if the field is unset
    #            while saving the model for the first time
    #       i18n: if true, allow to set multi value for the field (one for each
    #            language). See `@set` and `@get` for more details.
    #       multi: if true, takes an array of values. See `@push` and `@pull` for
    #            more details.
    #       default: if a value, set the value automatically while creating the
    #            model. If a function is specified, the returned value will be used
    #       validate: take a function(value, @) to validate the value
    #       transform: take a function(value, @) which will transform the value
    #             and return it (usefull for hashing passwords by example)
    structure: null


    constructor: () ->
        super
        unless (@meta.typeURI \
             or @meta.propertiesNamespace \
             or @meta.instancesNamespace)
            throw "#{@constructor.name}'s namespaces are missing"


    # Returns an arraw of instances
    # The `find` method is the only way to fetch objects
    # Object can be fetched by id (URI), via an arraw of ids or via a query
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
    #   * limit: (default 10) the number limit of documents to return
    #   * sortBy: (default null) the field name by which the results should be
    #        sorted
    #   * order: 1 or -1 (default null)
    #   * skip: (default 0)
    #   * populate: (default false) if true, fetch asynchronously all the
    #       related instance object (if they exists). If an array of field name
    #       is passed, fetch only those instances.
    #   * hide: (default true) if true, hide all hidden-fields. An array can be
    #       passed to specified other fields to hide.
    #       If fields are hiden a 'field hidden' error will be throw
    #       if their value are been read or modified
    #   * describe: (default false) if true, return a field with all the label
    #        of the related instances. A lang code can be to specify which i18n
    #        version to use
    @find: (URIsOrQuery, options, callback)=>
        unless URIsOrQuery
            throw new Error('URIsOrQuery are required')
        if typeof options is 'function' and not callback
            callback = options
        # if not options and not callback
            # return query as promise
        # ...

    @_findMongo: (mongoQuery, options, callback)=>
        # ...

    @_findSparqlite: (SparqliteQuery, options, callback)=>
        # ...

    @_findByURI: (URIs, options, callback)=>
        # ...

    @_findSparql: (sparqlQuery, options, callback)=>
        # ...


    # like `find` but returns only the object ids (uri)
    @findURIs: (URIsOrQuery, options, callback)=>
        options.instance = false
        @find URIsOrQuery, options, callback

    # like `find` but returns only the first object found
    @first: (URIsOrQuery, options, callback) =>
        options.limit = 1
        @find URIsOrQuery, options, callback

    # like `first` but returns only the first object uri
    @firstURI: (URIsOrQuery, options, callback)=>
        options.limit = 1
        options.instance = false
        @find URIsOrQuery, options, callback

    # Performe a groupCount for the query
    #
    #   options:
    #       * fields: faceting only on the specified fields. If no fields are
    #                 set, then the faceting is done for all fields
    @facets: (query, options, callback)=>
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
    populate: (fields, callback) =>
        unless callback
            fields = callback
        # ..


    # return the language if specified in options, fallback to @meta.defaultLang
    # otherwise and throw an error if no language are found
    # options:
    #   * lang: the lang used
    # If options is a string, it is taken as a lang code
    __getLang: (fieldName, options) =>
        lang = options?.lang or options or @meta.defaultLang
        unless lang
            throw "#{fieldName} is i18n and need a language"
        return lang


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
    # If options is a string, it is taken as a lang code
    get: (fieldName, options) =>
        if @structure[fieldName].i18n
            @_properties[fieldName] = {} unless @_properties[fieldName]?
            lang = @__getLang(fieldName, options)
            return @_properties[fieldName][lang]
        @_properties[fieldName]


    # return the instance if the value of the requested field is a relation
    # if options.lang is specified, all i18n field's value will be return in
    # that language
    getInstance: (fieldName, options) =>
        # ...


    # Return the label of the field.
    # If the label is 18n then the lang should be specified in options.
    # If fieldName is null, return the label of model
    #
    # options:
    #   lang: the specified language of the wanted label
    # If options is a string, it is taken as a lang code
    getLabel: (fieldName, options) =>
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
    # If options is a string, it is taken as a lang code
    set: (fieldName, value, options) =>
        if @structure[fieldName].i18n
            unless @_properties[fieldName]?
                @_properties[fieldName] = {}
            lang = @__getLang(fieldName, options)
            @_properties[fieldName][lang] = value
        else
            @_properties[fieldName] = value


    # Set the value of a multi-field
    # The value can be of any valid type (included instance)
    # If the field is a non-multi field, an error is throwed
    # if the field is an i18n-field, a options.lang can be passed to specify the
    # local, it is ignored otherwise.
    #
    # options:
    #       * lang: the lang used in value
    #       * validate: (default true) if false, do not validate the value
    # If options is a string, it is taken as a lang code
    push: (fieldName, value, options) =>
        unless @structure[fieldName].multi
            throw "#{@constructor.name}.#{fieldName} is not a multi field"

        if @structure[fieldName].i18n
            @_properties[fieldName] = {} unless @_properties[fieldName]?
            lang = @__getLang(fieldName, options)
            unless @_properties[fieldName][lang]?
                @_properties[fieldName][lang] = []
            @_properties[fieldName][lang].push value
        else
            @_properties[fieldName] = [] unless @_properties[fieldName]
            @_properties[fieldName].push value


    # Remove the value of a multi-field
    # The value can be of any valid type (included instance)
    # If the field is a non-multi field, an error is throwed
    #
    # options:
    #       * lang: the lang used in value
    # If options is a string, it is taken as a lang code
    pull: (fieldName, value, options) =>
        unless @structure[fieldName].multi
            throw "#{@constructor.name}.#{fieldName} is not a multi field"

        if @structure[fieldName].i18n
            lang = @__getLang(fieldName, options)
            if @_properties[fieldName]?[lang]?
                values = _.without @_properties[fieldName][lang], value
                @_properties[fieldName][lang] = values
        else
            if @_properties[fieldName]
                values = _.without @_properties[fieldName], value
                @_properties[fieldName] = values


    # Remove the value of a field.
    # The value can be of any valid type (included instance)
    # If the field is an i18n-field, pass the lang to specify which version of
    # the field should be deleted.
    #
    # options:
    #       * lang: the lang used
    # If options is a string, it is taken as a lang code
    unset: (fieldName, options)=>
        if @structure[fieldName].i18n
            lang = @__getLang(fieldName, options)
            if @_properties[fieldName]?[lang]?
                delete @_properties[fieldName][lang]
        else
            delete @_properties[fieldName]


    # Returns true if the field value exists and is not null.
    # If the field is a i18n-field, pass the options.lang to specify the locale
    #
    # options:
    #       * lang: the lang used in value
    # If options is a string, it is taken as a lang code
    has: (fieldName, options) =>
        if @structure[fieldName].i18n
            lang = @__getLang(fieldName, options)
            return @_properties[fieldName]?[lang]?
        @_properties[fieldName]?


    # return true if the value of the field is a relation and the instance has
    # already been fetched
    isPopulated: (fieldName) =>
        # ...

    # Delete all the field values of the object
    clear: =>
        @_properties = {}
        @_instances = {}


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

module.exports = RdfClass

