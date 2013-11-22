
Sparql = require './sparql'
Database = require '../interface/database'


class RdfDatabase extends Database

    constructor: (options) ->

        # example 'http://onto.example.org'
        @namespace = options.namespace

        # example 'http://onto.example.org/classes'
        @defaultClassesNamespace = options.defaultClassesNamespace

        # example 'http://onto.example.org/properties'
        @defaultPropertiesNamespace = options.defaultPropertiesNamespace

        # example 'http://data.example.org/user/namlook'
        @defaultInstancesNamespace = options.defaultInstancesNamespace


        unless @defaultClassesNamespace
            @defaultClassesNamespace = "#{@namespace}/classes"

        unless @defaultPropertiesNamespace
            @defaultPropertiesNamespace = "#{@namespace}/properties"

        unless @defaultInstancesNamespace
            @defaultInstancesNamespace = "#{@namespace}/instances"

        # example 'en'
        @defaultLang = options.defaultLang

        # sparql endpoint
        @endpoint = options.endpoint

        # @name = options.name
        @graphURI = options.graphURI

        @sparql = new Sparql


    # Register the models
    # The registration make some fill the models with default values and sanitize
    # and check their structures. Finally, attach each models to the database
    # instance so we can access them easily
    registerModels: (models) =>
        for modelName, model of models
            @_fillDefaultValues(modelName, model)
            @_inheritStructure(model)
            @validateModel(modelName, model)
            @[modelName] = model


    # Alias to registerModels
    registerClasses: (classes) =>
        @registerModels(classes)

    # Check the model structure for any errors
    validateModel: (modelName, model) =>
        requiredNS = ['typeURI','graphURI','instancesNamespace','propertiesNamespace']
        for ns in requiredNS
            unless model::meta[ns]
                throw "#{modelName}.meta.#{ns} not found"
        # ...


    # Update the structure of model which inherits of its parent's
    _inheritStructure: (model) ->
        for field, value of model.__super__?.structure
            model::structure[field] = value


    # Fill the model's info which haven't been specified by default ones
    _fillDefaultValues: (modelName, model) =>
        unless model::meta
            throw "#{modelName} has not meta"
        # if the model doesn't specify uri, we build it
        if not model::meta.typeURI
            model::meta.typeURI =  "#{@defaultClassesNamespace}/#{modelName}"

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

module.exports = RdfDatabase

