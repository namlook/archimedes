
class Database

    constructor: (options) ->
        # example 'en'
        @defaultLang = options.defaultLang

    # Register the models
    # The registration make some fill the models with default values and sanitize
    # and check their schema. Finally, attach each models to the database
    # instance so we can access them easily
    registerModels: (models) =>
        for modelName, model of models
            @beforeRegister(modelName, model)
            @_inheritSchema(model)
            @validateModel(modelName, model)
            @[modelName] = model


    beforeRegister: (modelName, model) ->
        unless model::meta?
            model::meta = {}

        unless model::schema?
            throw "#{modelName} has not schema"

        # if the model doesn't specify default language, we set it
        unless model::meta.defaultLang
            model::meta.defaultLang = @defaultLang


    # Check the model structure for any errors
    validateModel: (modelName, model) =>
        # should be overwritten

    # Update the schema of model which inherits of its parent's
    _inheritSchema: (model) ->
        for field, value of model.__super__?.schema
            model::schema[field] = value

module.exports = Database