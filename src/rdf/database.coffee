
Sparql = require './sparql'
Database = require '../interface/database'


class RdfDatabase extends Database

    constructor: (options) ->

        # example 'http://onto.elkorado.com/classes'
        @defaultClassesNamespace = options.defaultClassesNamespace

        # example 'http://onto.elkorado.com/properties'
        @defaultPropertiesNamespace = options.defaultPropertiesNamespace

        # example 'http://data.elkorado.com/user/namlook'
        @defaultInstancesNamespace = options.defaultInstancesNamespace

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
            @validate(modelName, model)
            @[modelName] = model


    # Alias to registerModels
    registerClasses: (classes) =>
        @registerModels(classes)

    # Check the model structure for any errors
    validate: (modelName, model) =>
        # ...


    # Update the structure of model which inherits of its parent's
    _inheritStructure: (model) ->
        for field, value of model.__super__?.structure
            model::structure[field] = value


    # Fill the model's info which haven't been specified by default ones
    _fillDefaultValues: (modelName, model) =>

        # if the model doesn't specify uri, we build it
        if not model::meta.uri
            model::meta.uri =  "#{@defaultClassesNamespace}/#{modelName}"

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
        if not model::meta.defaultLang
            model::meta.defaultLang = @defaultLang


module.exports = RdfDatabase

