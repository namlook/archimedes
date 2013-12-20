# # RDF Database

_ = require 'underscore'
DatabaseInterface = require '../interface/database'
triplestores = require 'triplestores'


class Database extends DatabaseInterface

    # options:
    #
    #   * store: the triple store name (default: stardog)
    #   * endpoint: the sparql endpoint
    #   * credentials.login: the user login to use
    #   * credentials.password: the password
    constructor: (options) ->
        super

        # the sparql endpoint URL
        @endpoint = options.endpoint
        unless @graphURI
            throw "endpoint is required"

        # the URI where the data will be stored
        @graphURI = options.graphURI
        unless @graphURI
            throw "graphURI is required"

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


module.exports = Database

