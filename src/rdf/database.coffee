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
        super

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



    # Alias to registerModels
    registerClasses: (classes) =>
        @registerModels(classes)

    # Check the model schema for any errors
    validateModel: (modelName, model) =>
        requiredNS = ['uri','graphURI','instancesNamespace','propertiesNamespace']
        for ns in requiredNS
            unless model::meta[ns]
                throw "#{modelName}.meta.#{ns} not found"
        # ...

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


    sync: (model, callback) =>

        unless model.id?
            instancesNamespace = model.meta.instancesNamespace
            model.id = "#{instancesNamespace}/#{@__buildId()}"

        changes = model.changes()

        if changes
            addedTriples = @_fieldsToTriples(model, changes.added)
            removedTriples = @_fieldsToTriples(model, changes.removed)

        if model.isNew()
            addedTriples.push "<#{model.id}> a  <#{model.meta.uri}>"

        sparqlQuery = ''
        if removedTriples.length
            sparqlQuery += "DELETE DATA { #{removedTriples.join(' .\n')} } "

        if addedTriples
            sparqlQuery += "INSERT DATA { #{addedTriples.join(' .\n')} }"

        @store.update sparqlQuery, (err, ok) =>
            if err
                return callback err
            unless ok
                return callback "error while syncing the data"

        return callback null, model.id #new @[model.meta.name](model._properties)


    toRdf: (model) =>
        return @_fieldsToTriples(model, model._properties)


    _fieldsToTriples: (model, fields) =>
        schema = model.schema
        triples = []
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
                            triples.push "<#{model.id}> <#{propertyUri}> #{rdfValue}"
                    else
                        rdfValue = @_valueToRdf(val, {
                            'type': fieldType
                            'lang': lang
                        })
                        triples.push "<#{model.id}> <#{propertyUri}> #{rdfValue}"
            else if schema[fieldName].multi
                for val in value
                    rdfValue = @_valueToRdf(val, {'type': fieldType})
                    triples.push "<#{model.id}> <#{propertyUri}> #{rdfValue}"
            else
                rdfValue = @_valueToRdf(value, {'type': fieldType})
                triples.push "<#{model.id}> <#{propertyUri}> #{rdfValue}"
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

