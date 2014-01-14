
class Database

    constructor: (options) ->
        # example 'en'
        options = options || {}
        @defaultLang = options.defaultLang

    # Register the models
    # The registration make some fill the models with default values and sanitize
    # and check their schema. Finally, attach each models to the database
    # instance so we can access them easily
    registerModels: (models) =>
        for modelName, model of models
            @beforeRegister(modelName, model)

            # Update the schema of model which inherits of its parent's
            for field, value of model.__super__?.schema
                model::schema[field] = value

            @validateModel(modelName, model)
            model::db = @
            @[modelName] = model

    beforeRegister: (modelName, model) ->
        unless model::meta?
            model::meta = {}

        model::meta.name = modelName

        unless model::schema?
            throw "#{modelName} has not schema"

        # if the model doesn't specify default language, we set it
        unless model::meta.defaultLang
            model::meta.defaultLang = @defaultLang


    # Check the model structure for any errors
    validateModel: (modelName, model) =>
        # throw "not implemented"

    sync: (model, callback) =>
        if model.id?
            id = model.id
        else
            id = @__buildId()
        return callback null, id;


    # ## __buildId
    #
    # Generate a unique ID for the model
    __buildId: () ->
        now = new Date()
        rand = Math.floor(Math.random() * 10)
        return rand + parseInt(now.getTime()).toString(36)

module.exports = Database