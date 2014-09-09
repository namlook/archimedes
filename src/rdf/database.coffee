# # RDF Database

_ = require 'underscore'
DatabaseInterface = require '../interface/database'
async = require 'async'
{mongo2sparql, value2rdf, options2sparql, buildTimeSeriesQuery} = require './utils'

triplestores = {
    'stardog': require './triplestores/stardog'
    'virtuoso': require './triplestores/virtuoso'
}

class Database extends DatabaseInterface

    type: 'rdf'

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
        unless triplestores[options.store]?
            throw "unkwown store"

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

        if query and query._type?
            query = _.clone(query)
            query._type = "#{@defaultClassesNamespace}/#{query._type}"

        try
            query = mongo2sparql(query)
        catch e
            return callback e

        sparqlQuery = """
            select (count(distinct ?s) as ?total)
            from <#{@graphURI}> where #{query}
        """

        # console.log sparqlQuery

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
        if query in [undefined, null]
            return callback "query cannot be #{query}"
        if query
            if _.isString(query)
                if @isReference(query)
                    return @_findByURI query, options, callback
                else
                    return callback "bad query: #{query}"
            else if _.isArray(query)
                uris = []
                for item in query
                    if @isReference(item)
                        uris.push(item)
                    else if item._id? and item._type?
                        uris.push(@reference(item._type, item._id))
                    else
                        return callback "bad query: #{query}"
                return @_findByURIs uris, options, callback
            else if query._id?
                if _.isArray(query._id)
                    uris = []
                    for id in query._id
                        if query._type?
                            uris.push(@reference(query._type, id))
                        else
                            return callback "bad query: #{query}"
                    return @_findByURIs uris, options, callback
                else
                    unless query._type?
                        return callback "bad query: #{query}"
                    uri = @reference(query._type, query._id)
                    return @_findByURI uri, options, callback


        query = _.clone(query)
        if query._type?
            query._type = "#{@defaultClassesNamespace}/#{query._type}"

        # otherwise, we have to convert the mongo-like query into a
        # sparql one.
        try
            query = mongo2sparql(query, options)
        catch e
            return callback e

        sparqlQuery = """
            select distinct ?s from <#{@graphURI}> where #{query}
        """

        # console.log 'find>>>', sparqlQuery

        @store.query sparqlQuery, (err, data) =>
            if err
                return callback err

            ids = (item.s.value for item in data)
            unless options.instances
                return callback null, ids
            else
                return @_findByURIs ids, options, callback


    # ## _findByIds
    # fetch documents by their ids
    #
    # example:
    #   @_findByIds ids, options, (err, docs) ->
    _findByURIs: (uris, options, callback) ->
        @store.describe uris, options, (err, results) =>
            if err
                return callback err
            return callback null, results


    # ## _findById
    # fetch a document by its id
    #
    # example:
    #   @_findById id, options, (err, docs) ->
    _findByURI: (uri, options, callback) ->
        @_findByURIs [uri], options, callback


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
    # Delete the item in database that match the URI.
    # Instead of the uri, the id and type can be passed:
    #
    # example:
    #       @remove uri, (err) ->
    #       @remove {_id: .., _type: ..}, (err) ->
    delete: (uri, callback) =>
        unless uri
            return callback "id must not be null"

        unless _.isString(uri)
            if uri._id? and uri._type?
                uri = @reference(uri._type, uri._id)

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

        lang = null
        if field.indexOf('@')
            [field, lang] = field.split('@')

        if field.indexOf('->') > -1 # XXX use mongo2sparql ?
            propURI = []
            for _prop in field.split('->')
                if _.str.startsWith(_prop, '_id::')
                    return callback("Error: you cannot use _id on the facet")
                inverse = ""
                if _prop[0] is '^'
                    _prop = _prop[1..]
                    inverse = "^"
                _propURI = "#{inverse}<#{_prop}>"
                propURI.push _propURI
            propURI = propURI.join('/')
        else
            propURI = "<#{field}>"

        langSection = ''
        if lang
            langSection = "FILTER(langMatches(lang(?facet), '#{lang}'))"

        query = _.clone(query)
        if query._type?
            query._type = "#{@defaultClassesNamespace}/#{query._type}"

        sparqlQuery = ''
        unless _.isEmpty query
            try
                sparqlQuery = mongo2sparql(query, options, {queryOnly: true})
            catch e
                return callback e

        sparqlQuery = """
            select ?facet, (count(distinct ?s) as ?count) from <#{@graphURI}> where {
                ?s #{propURI} ?facet .
                #{sparqlQuery}
                #{langSection}
            }
            group by ?facet
            order by #{options.order}(?count) str(?facet)
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


    # ## timeSeries
    # Aggregate the data by a specified step.
    #
    # Steps are : $year, $month, $day, $hours, $minutes and $seconds
    #   steps can be combined like "$month-$day" or "$year/$month" etc..
    timeSeries: (dateField, step, query, options, callback) ->
        unless dateField
            throw 'field is required'
        unless step
            throw 'step is required'

        if not callback and typeof(query) is 'function'
            callback = query
            query = {}
            options = {}
        else if not callback and typeof(options) is 'function'
            callback = options
            options = {}

        unless callback
            throw 'callback is required'

        unless options.limit?
            options.limit = 30
        unless options.order?
            options.order = 'asc'

        if step is '$second'
            return @facets dateField, query, options, callback

        if dateField.indexOf('->') > -1
            propURI = ("<#{_prop}>" for _prop in dateField.split('->')).join('/')
        else
            propURI = "<#{dateField}>"

        {modifiers, groupBy} = buildTimeSeriesQuery(step)

        sparqlQuery = ''
        unless _.isEmpty query
            try
                sparqlQuery = mongo2sparql(query, options, {queryOnly: true})
            catch e
                return callback e

        sparqlQuery = """
            select ?facet, (count(?s) as ?count) from <#{@graphURI}> where {
                #{sparqlQuery}
                ?s #{propURI} ?date .
                #{modifiers}
            }

            GROUP BY #{groupBy}
            order by #{options.order}(?facet)
            limit #{options.limit}
        """

        # console.log 'timeSeries>>>', sparqlQuery

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
    # Note that the type must be passed in options.
    #
    # Options:
    #   * type: the type of the pojo
    #
    # If `options` is a string, it is taken as a lang code.
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

        convertedPojo = @__fillPojoUri(pojo)
        sparqlQuery = @_getSparqlSyncQuery(convertedPojo)

        # console.log sparqlQuery

        if sparqlQuery is null
            return callback null, pojo, {dbTouched: false}

        @store.update sparqlQuery, options, (err, ok) =>
            if err
                return callback err
            unless ok
                return callback "error while syncing the data"
            # @_updateCache(convertedPojo)
            convertedPojo._ref = @reference(convertedPojo._type, convertedPojo._id)
            convertedPojo._uri = convertedPojo._ref
            return callback null, convertedPojo, {dbTouched: true}

    # ## serialize
    # Convert a pojo into ntriples
    serialize: (pojo) ->
        unless pojo._id?
            pojo._id = @__buildId()
        unless pojo._ref?
            pojo._ref = @reference(pojo._type, pojo._id)
            pojo._uri = pojo._ref
        ntriples = @_pojo2nt(pojo._uri, pojo)
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

        pojos = []
        for pojo in objects
            if pojo.toSerializableObject?
                pojo = pojo.toSerializableObject()
            unless pojo._type?
                callback "_type field not found in pojo: #{pojo}"
            pojos.push pojo

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
        unless pojo._id?
            pojo._id = @__buildId()
        unless pojo._ref?
            pojo._ref = @reference(pojo._type, pojo._id)
            pojo._uri = pojo._ref

        sparqlQuery.push """delete {graph <#{@graphURI}> {<#{pojo._ref}> ?p ?o .}}
            where {<#{pojo._ref}> ?p ?o .};"""

        pojo._class = "#{@defaultClassesNamespace}/#{pojo._type}"

        ntriples = @_pojo2nt(pojo._ref, pojo)

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
        # model::meta.type = model::meta.uri

        # if the model doesn't specify graphURI, we set it
        if not model::meta.graphURI
            model::meta.graphURI = @graphURI

        # if the model doesn't specify @propertiesNamespace, we set it
        if not model::meta.propertiesNamespace
            model::meta.propertiesNamespace = @defaultPropertiesNamespace

        # if the model doesn't specify @instancesNamespace, we build it
        if not model::meta.instancesNamespace
            underscoredModelName = _.str.underscored(modelName)
            model::meta.instancesNamespace =  \
                "#{@defaultInstancesNamespace}/#{underscoredModelName}"


    # ## reference
    # build an URI from a couple type/id.
    reference: (type, id) ->
        if not id?
            throw "id is required to build reference"
        if not type?
            throw "type is required to build reference"
        type = _.str.underscored(type)
        return "#{@defaultInstancesNamespace}/#{type}/#{id}"


    # ## dereference
    # take a reference (URI) and convert id into a pojo of the following form:
    #  {
    #     _id: 'the_object_id', _type: 'the_object_type'
    #  }
    #
    # Note that the URI should have the following structure:
    #  http://<namespace>/<type>/<id>
    dereference: (reference) ->
        if not reference or not _.str.startsWith(reference, "http://")
            throw "unknown reference"
        splitedRef = reference.split('/')
        return {
            _id: splitedRef.slice(-1)[0],
            _type: _.str.classify(splitedRef.slice(-2, -1)[0])
        }

    # ## isReference
    # Returns true if the string is reference
    isReference: (str) ->
        try
            if _.str.startsWith(str, 'http://') and str.split('/').length > 4
                return true
        catch e
            # the string is obviously not a reference
        return false

    #
    #
    # Private methods
    #
    #


    # ## __fillPojoUri(pojo)
    #
    # replace pojo's field names by the corresponding URI if needed
    __fillPojoUri: (pojo) ->
        newpojo = {}
        for fieldName, value of pojo
            if fieldName in ['_id', '_type', '_ref', '_uri', '_class']
                newpojo[fieldName] = value
            else unless _.str.startsWith(fieldName, 'http://')
                newpojo["#{@defaultPropertiesNamespace}/#{fieldName}"] = value
            else
                newpojo[fieldName] = value
        return newpojo


    _pojo2nt: (uri, changes) ->
        ntriples = []

        addTriple = (value, lang) =>
            if _.isObject(value) and value._ref?
                triple = "<#{uri}> <#{property}> <#{value._ref}>"
            else
                value = value2rdf(value, lang)
                triple = "<#{uri}> <#{property}> #{value}"
            ntriples.push triple


        # build the n-triples
        for property, value of changes
            if property in ['_id', '_ref', '_uri', '_type']
                continue
            else if property in ['_class']
                ntriples.push "<#{uri}> a <#{value}>"
                continue

            if value._ref? and _.isArray(value._ref)
                value = ({_ref: val} for val in value._ref)

            # multi field
            if _.isArray(value)
                for val in value
                    if val not in [null, undefined]
                        addTriple(val)

            # i18n field
            else if _.isObject(value) and not value._ref? and not _.isDate(value)
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

