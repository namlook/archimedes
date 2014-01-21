# # RDF Database

_ = require 'underscore'
DatabaseInterface = require '../interface/database'

triplestores = {
    'stardog': require './triplestores/stardog'
}

class Database extends DatabaseInterface

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
    validateModel: (modelName, model) =>
        requiredNS = ['uri','graphURI','instancesNamespace','propertiesNamespace']
        for ns in requiredNS
            unless model::meta[ns]
                throw "#{modelName}.meta.#{ns} not found"
        # ...


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


    findModel: (model, URIsOrQuery, options, callback) =>
        if typeof options is 'function' and not callback
            callback = options
            options = {}

        unless URIsOrQuery
            return callback 'URIsOrQuery are required'

        if _.isArray(URIsOrQuery)
            return @_describe model, URIsOrQuery, options, callback
        else if (_.isString(URIsOrQuery) and  _.str.startsWith(URIsOrQuery, 'http://'))
            return @_describe model, [URIsOrQuery], options, callback
        else if _.isString URIsOrQuery
            return @_findViaSparqlite model, URIsOrQuery, options, callback
        else
            return @_findViaMongo model, URIsOrQuery, options, callback

    _describe: (model, uris, options, callback) =>
        @store.describe uris, options, (err, rawdata) =>
            if err
                return callback err

            properties = {}
            schema = model::schema

            results = []
            for data in rawdata
                for uri, item of data
                    if uri is '@id'
                        properties._id = item

                    else if uri isnt '@type'
                        prop = @_propertiesIndexURI[uri]
                        if schema[prop].i18n
                            unless properties[prop]?
                                properties[prop] = {}
                            for _item in item
                                lang = _item['@language']
                                value = _item['@value']
                                if schema[prop].multi
                                    unless lang
                                        throw 'something wrong'
                                    unless properties[prop][lang]?
                                        properties[prop][lang] = []
                                    properties[prop][lang].push value
                                else
                                    properties[prop][lang] = value

                        else if schema[prop].multi
                            properties[prop] = (_item['@value'] for _item in item)
                        else
                            properties[prop] = item[0]['@value']
                results.push new model(properties)
            return callback null, results

    # ## clear
    # empty the database
    #
    # example:
    #       @clear (err, ok) ->
    clear: (callback) =>
        @store.clear callback


    # ## length
    # return the number of data present into the db
    length: (callback) =>
        @store.length callback


    # ## deleteModel
    # remove a model instance from the database
    #
    # example:
    #       @removeModel model, (err) ->
    deleteModel: (model, callback) =>
        unless model.id?
            return callback "can't delete a non-saved model"
        modelURI = model.id
        deleteQuery = "delete {<#{modelURI}> ?p ?o .} where {<#{modelURI}> ?p ?o .}"
        @store.update deleteQuery, (err, ok) =>
            if err
                return callback err
            unless ok
                return callback "error while deleting the data"
            return callback null


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

            addedTriples = []
            removedTriples = []
            if changes
                addedTriples = @_fieldsToTriples(model, changes.added)
                removedTriples = @_fieldsToTriples(model, changes.removed)

            if model.isNew()
                addedTriples.push "<#{model.id}> a  <#{model.meta.uri}>"

            sparqlQuery = ''
            if removedTriples.length
                sparqlQuery += "DELETE DATA { #{removedTriples.join(' .\n')} } "

            if addedTriples.length
                sparqlQuery += "INSERT DATA { #{addedTriples.join(' .\n')} }"

            @store.update sparqlQuery, (err, ok) =>
                if err
                    return callback err
                unless ok
                    return callback "error while syncing the data"

                return callback null, {id: model.id, dbTouched: true}



    _fieldsToTriples: (model, fields) =>
        schema = model.schema
        triples = []
        unless model.id?
            throw "'#{model.meta.name}' has no id"
        modelURI = model.id

        for fieldName, value of fields
            # get the property uri
            propertyUri = schema[fieldName].uri
            unless propertyUri
                propertyUri = "#{model.meta.propertiesNamespace}/#{fieldName}"

            # get the property type
            fieldType = schema[fieldName].type

            if schema[fieldName].i18n
                for lang, val of value
                    if schema[fieldName].multi
                        for vl in val
                            rdfValue = @_valueToRdf(vl, {
                                'type': fieldType
                                'lang': lang
                            })
                            triples.push "<#{modelURI}> <#{propertyUri}> #{rdfValue}"
                    else
                        rdfValue = @_valueToRdf(val, {
                            'type': fieldType
                            'lang': lang
                        })
                        triples.push "<#{modelURI}> <#{propertyUri}> #{rdfValue}"
            else if schema[fieldName].multi
                for val in value
                    rdfValue = @_valueToRdf(val, {'type': fieldType})
                    triples.push "<#{modelURI}> <#{propertyUri}> #{rdfValue}"
            else
                rdfValue = @_valueToRdf(value, {'type': fieldType})
                triples.push "<#{modelURI}> <#{propertyUri}> #{rdfValue}"
        return triples


    _valueToRdf: (value, options) =>
        {type, lang} = options
        if @[type]?
            if value.id
                return "<#{value.id}>"
            return "<#{value}>"
        else if type is 'string'
            quotedValue = value.replace(/"/g, '\\"')
            if lang
                return "\"#{quotedValue}\"@#{lang}"
            return "\"#{quotedValue}\""
        else if type is 'url'
            return "\"#{value}\"^^xsd:anyURI"
        return "#{value}^^xsd:#{type}"


module.exports = Database

