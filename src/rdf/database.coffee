# # RDF Database

Sparql = require './sparql'
DatabaseInterface = require '../interface/database'


class Database extends DatabaseInterface

    constructor: (options) ->

        # the URI where the data will be stored
        @graphURI = options.graphURI
        unless @graphURI
            throw "graphURI is required"

        # the sparql endpoint URL
        @endpoint = options.endpoint
        unless @graphURI
            throw "endpoint is required"

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

        # example 'en'
        @defaultLang = options.defaultLang



        @sparql = new Sparql


    # Register the models
    # The registration make some fill the models with default values and sanitize
    # and check their schema. Finally, attach each models to the database
    # instance so we can access them easily
    registerModels: (models) =>
        for modelName, model of models
            @_fillDefaultValues(modelName, model)
            @_inheritSchema(model)
            @validateModel(modelName, model)
            @[modelName] = model


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


    # Update the schema of model which inherits of its parent's
    _inheritSchema: (model) ->
        for field, value of model.__super__?.schema
            model::schema[field] = value


    # Fill the model's info which haven't been specified by default ones
    _fillDefaultValues: (modelName, model) =>

        unless model::meta
            throw "#{modelName} has not meta"
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

        # if the model doesn't specify default language, we set it
        unless model::meta.defaultLang
            model::meta.defaultLang = @defaultLang

        # if the model has a `properties` attribute, we aliases it with schema
        if model::properties
            model::schema = model::properties

module.exports = Database

