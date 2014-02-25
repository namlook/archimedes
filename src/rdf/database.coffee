# # RDF Database

_ = require 'underscore'
DatabaseInterface = require '../interface/database'
async = require 'async'
{mongo2sparql, value2rdf, options2sparql} = require './utils'

triplestores = {
    'stardog': require './triplestores/stardog'
    'virtuoso': require './triplestores/virtuoso'
}

class Database extends DatabaseInterface

    dbtype: 'rdf'

    # options:
    #
    #   * store: the triple store name (default: stardog)
    #   * endpoint: the sparql endpoint
    #   * credentials.login: the user login to use
    #   * credentials.password: the password
    constructor: (options) ->
        super options

        # the URI where the data will be stored
        @graphURI = options.graphURI
        unless @graphURI
            throw "graphURI is required"

        # what store do we have to use ?
        unless options.store
            throw "store is required"

        @store = new triplestores[options.store](options)

        # if namespace is not specified, graphURI is used
        # example 'http://onto.example.org'
        @namespace = options.namespace
        unless @namespace
            @namespace = @graphURI

        # example 'http://onto.example.org/classes'
        @defaultClassesNamespace = options.defaultClassesNamespace
        unless @defaultClassesNamespace
            @defaultClassesNamespace = "#{@namespace}/classes"

        # example 'http://onto.example.org/properties'
        @defaultPropertiesNamespace = options.defaultPropertiesNamespace
        unless @defaultPropertiesNamespace
            @defaultPropertiesNamespace = "#{@namespace}/properties"

        # example 'http://data.example.org/user/namlook'
        @defaultInstancesNamespace = options.defaultInstancesNamespace
        unless @defaultInstancesNamespace
            @defaultInstancesNamespace = "#{@namespace}/instances"

        @_propertiesIndexURI = {}


    # ## clear
    # empty the database
    #
    # example:
    #       @clear (err, ok) ->
    clear: (callback) =>
        @store.clear callback


    # ## count
    # return the number of item that match the query
    count: (query, options, callback) =>
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}
        if typeof(query) is 'function'
            callback = query
            options = {}
            query = null

        unless callback?
            throw "callback required"

        try
            query = mongo2sparql(query)
        catch e
            return callback e

        sparqlQuery = """
            select (count(distinct ?s) as ?total)
            from <#{@graphURI}> where #{query}
        """

        @store.count sparqlQuery, callback


    # ## _find
    # Perform a find query against a regular query.
    # The query is a mongo-like query which take the following form:
    #
    #     {fieldName: value, 'i18nfield@en': 'english content'}
    #
    # we can reach relations with the doted notation
    #
    #     {'blogPost.comment.author.name': 'Nico'}
    #
    # example:
    #   @_find query, options, (err, docs) ->
    _find: (query, options, callback) ->
        try
            query = mongo2sparql(query, options)
        catch e
            return callback e

        sparqlQuery = """
            select distinct ?s from <#{@graphURI}> where #{query}
        """

        # console.log sparqlQuery

        @store.query sparqlQuery, (err, data) =>
            if err
                return callback err

            ids = (item.s.value for item in data)
            unless options.instances
                return callback null, ids
            else
                return @_findByIds ids, callback


    # ## _findByIds
    # fetch documents by their ids
    #
    # example:
    #   @_findByIds ids, options, (err, docs) ->
    _findByIds: (ids, options, callback) ->
        @store.describe ids, options, (err, results) =>
            if err
                return callback err
            return callback null, results


    # ## _findById
    # fetch a document by its id
    #
    # example:
    #   @_findById id, options, (err, docs) ->
    _findById: (id, options, callback) ->
        @_findByIds [id], options, callback


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
    @_findViaSparqlite: (SparqliteQuery, options, callback) ->
        # ...

    # ## delete
    # Delete the item in database that match the id
    #
    # example:
    #       @remove uri, (err) ->
    delete: (uri, callback) =>
        unless uri
            return callback "id must not be null"

        deleteQuery = """
            delete {graph <#{@graphURI}> {<#{uri}> ?p ?o .}}
            where {<#{uri}> ?p ?o .}
        """

        @store.update deleteQuery, (err, ok) ->
            if err
                return callback err
            unless ok
                return callback "error while deleting the data"
            return callback null


    # ## facets
    # `facets(field, [query], [options], callback)`
    #
    # Performe a group count on a specified field. A query can be added to filter
    # the data to aggregate
    #
    # It takes the following options
    #   * limit: (default 30) the maximum of results to return
    #
    facets: (field, query, options, callback) =>
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}
        else if typeof(query) is 'function'
            callback = query
            query = {}
            options = {}

        unless field
            throw 'field is required'
        unless callback
            throw 'callback is required'
        unless options.limit?
            options.limit = 30
        unless options.order?
            options.order = 'desc'


        sparqlQuery = ''
        unless _.isEmpty query
            try
                sparqlQuery = mongo2sparql(query, options, {queryOnly: true})
            catch e
                return callback e

        sparqlQuery = """
            select ?facet, (count(?facet) as ?count) from <#{@graphURI}> where {
                ?s <#{field}> ?facet .
                #{sparqlQuery}
            }
            group by ?facet
            order by #{options.order}(?count) asc(?facet)
            limit #{options.limit}
        """

        # console.log sparqlQuery

        @store.query sparqlQuery, (err, data) =>
            if err
                return callback err
            results = []
            for item in data
                results.push {
                    facet: item.facet.value,
                    count: parseInt(item.count.value, 10)
                }
            return callback null, results


    # ## sync
    # Insert or update a pojo into the database. An `_id` attribute
    # will be added if there isn't already.
    #
    # example:
    #   @sync pojo, (err, obj) ->
    sync: (pojo, options, callback) ->
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}
        unless callback
            throw 'callback is required'

        convertedPojo = @__fillPojoUri(pojo)
        sparqlQuery = @_getSparqlSyncQuery(convertedPojo)

        if sparqlQuery is null
            return callback null, pojo, {dbTouched: false}

        @store.update sparqlQuery, options, (err, ok) =>
            if err
                return callback err
            unless ok
                return callback "error while syncing the data"
            # @_updateCache(convertedPojo)
            return callback null, convertedPojo, {dbTouched: true}

    # ## serialize
    # Convert a pojo into ntriples
    serialize: (pojo) ->
        unless pojo._id?
            pojo._id = @__buildURI()
        ntriples = @_pojo2nt(pojo._id, pojo)
        return ntriples.join(' .\n') + ' .\n'


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

        pojos = (pojo.toSerializableObject? and pojo.toSerializableObject() \
            or pojo for pojo in objects)

        async.map pojos, ((pojo, cb) =>
            try
                convertedPojo = @__fillPojoUri(pojo)
                sparqlQuery = @_getSparqlSyncQuery(convertedPojo)
            catch e
                return cb e

            if sparqlQuery is null
                sparqlQuery = ''
                dbTouched = false
            else
                dbTouched = true
            return cb null, {
                pojo: convertedPojo
                dbTouched: dbTouched
                sparqlQuery: sparqlQuery
            }).bind(@)
        , (err, data) =>
            if err
                return callback err

            sparqlQuery = []
            results = []
            for item in data
                sparqlQuery.push item.sparqlQuery
                results.push {result: item.pojo, options: {dbTouched: item.dbTouched}}

            @store.update sparqlQuery.join('\n'), (err, ok) =>
                if err
                    return callback err
                # for item in results
                    # @_updateCache(item.result)
                return callback null, results


    # ## _getSparqlSyncQuery
    # returns the sparql query in order to update the pojo
    _getSparqlSyncQuery: (pojo) ->
        sparqlQuery = []
        if pojo._id?
            sparqlQuery.push """delete {graph <#{@graphURI}> {<#{pojo._id}> ?p ?o .}}
                where {<#{pojo._id}> ?p ?o .};"""
        else
            pojo._id = @__buildURI()

        ntriples = @_pojo2nt(pojo._id, pojo)

        sparqlQuery.push """insert data {
            graph <#{@graphURI}> {#{ntriples.join(' .\n\t')} }
        };"""
        return sparqlQuery.join('\n')


        # changes = @changes pojo
        # if changes is null
        #     return null

        # if pojo._id and changes isnt undefined
        #     fillChangesTriples = (_changes) ->
        #         target = []
        #         for property, value of _changes
        #             if _.isArray(value)
        #                 for val in value
        #                     val = value2rdf(val)
        #                     target.push "<#{pojo._id}> <#{property}> #{val}"
        #             else if _.isObject(value)
        #                 for lang, val of value
        #                     if _.isArray val
        #                         for _val in val
        #                             _val = value2rdf(_val, lang)
        #                             target.push(
        #                                 "<#{pojo._id}> <#{property}> #{_val}")
        #                     else
        #                         val = value2rdf(val, lang)
        #                         target.push(
        #                             "<#{pojo._id}> <#{property}> #{val}")
        #             else
        #                 value = value2rdf(value, lang)
        #                 target.push "<#{pojo._id}> <#{property}> #{value}"
        #         return target

        #     addedNtriples = @_pojo2nt(pojo._id, changes.added)
        #     removedNtriples = @_pojo2nt(pojo._id, changes.removed)

        #     sparqlQuery = ''
        #     if removedNtriples.length
        #         sparqlQuery += "delete data {graph <#{@graphURI}> { #{removedNtriples.join(' .\n')} . }}; "
        #     if addedNtriples.length
        #         sparqlQuery += "insert data {graph <#{@graphURI}> { #{addedNtriples.join(' .\n')} . }}; "

        # else
        #     unless pojo._id?
        #         pojo._id = @__buildURI()
        #     ntriples = @_pojo2nt(pojo._id, pojo)
        #     sparqlQuery = "insert data {graph <#{@graphURI}> { #{ntriples.join(' .\n')} }};"

        # return sparqlQuery


    #
    #
    # Model dealing section
    #
    #


    registerModels: (models) =>
        super models
        for modelName, model of models
            for fieldName, field of model::schema
                uri = field.uri or "#{model::meta.propertiesNamespace}/#{fieldName}"
                @_propertiesIndexURI[uri] = fieldName


    # ## registerClasses
    # Alias to registerModels
    registerClasses: (classes) =>
        @registerModels(classes)


    # ## validateModel
    # Check the model schema for any errors
    validateModel: (modelName, model) ->
        super modelName, model
        requiredNS = ['uri','graphURI','instancesNamespace','propertiesNamespace']
        for ns in requiredNS
            unless model::meta[ns]
                throw "#{modelName}.meta.#{ns} not found"


    # ## beforeRegister
    # Fill the model's info which haven't been specified by default ones
    beforeRegister: (modelName, model) =>
        # if the model has a `properties` attribute, we aliases it with schema
        unless model::schema?
            model::schema = model::properties

        super(modelName, model)

        # if the model doesn't specify uri, we build it
        if not model::meta.uri
            model::meta.uri =  "#{@defaultClassesNamespace}/#{modelName}"

        # the model.meta.type is model.meta.uri
        model::meta.type = model::meta.uri

        # if the model doesn't specify graphURI, we set it
        if not model::meta.graphURI
            model::meta.graphURI = @graphURI

        # if the model doesn't specify @propertiesNamespace, we set it
        if not model::meta.propertiesNamespace
            loweredModelName = modelName.toLowerCase()
            model::meta.propertiesNamespace = @defaultPropertiesNamespace

        # if the model doesn't specify @instancesNamespace, we build it
        if not model::meta.instancesNamespace
            loweredModelName = modelName.toLowerCase()
            model::meta.instancesNamespace =  \
                "#{@defaultInstancesNamespace}/#{loweredModelName}"


    #
    #
    # Private methods
    #
    #

    # ## __buildURI
    #
    # Generate a unique URI for the model
    __buildURI: () ->
        return "#{@defaultInstancesNamespace}/#{@__buildId()}"


    # ## __fillPojoUri(pojo)
    #
    # replace pojo's field names by the corresponding URI if needed
    __fillPojoUri: (pojo) ->
        newpojo = {}
        for fieldName, value of pojo
            if fieldName in ['_id', '_type']
                newpojo[fieldName] = value
            else unless _.str.startsWith(fieldName, 'http://')
                newpojo["#{@defaultPropertiesNamespace}/#{fieldName}"] = value
            else
                newpojo[fieldName] = value
        return newpojo


    _pojo2nt: (uri, changes) ->
        ntriples = []

        addTriple = (value, lang) =>
            if _.isObject(value) and value._uri?
                triple = "<#{uri}> <#{property}> <#{value._uri}>"
            else
                value = value2rdf(value, lang)
                triple = "<#{uri}> <#{property}> #{value}"
            ntriples.push triple


        # build the n-triples
        for property, value of changes
            if property is '_id'
                continue
            else if property is '_type'
                ntriples.push "<#{uri}> a <#{value}>"
                continue

            if value._uri? and _.isArray(value._uri)
                value = ({_uri: val} for val in value._uri)

            # multi field
            if _.isArray(value)
                for val in value
                    if val not in [null, undefined]
                        addTriple(val)

            # i18n field
            else if _.isObject(value) and not value._uri? and not _.isDate(value)
                for lang, val of value
                    if _.isArray(val) # multi-i18n field
                        for _val in val
                            if _val not in [null, undefined]
                                addTriple(_val, lang)
                    else # regular i18n field
                        addTriple(val, lang)

            else # literal
                addTriple(value)

        return ntriples



module.exports = Database

