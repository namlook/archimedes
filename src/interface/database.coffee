
{defaultTypes, Type} = require './types'
{extendOnClass} = require('extendonclass')


class Database
    # allow to extend the model in javascript
    @extend: extendOnClass

    constructor: (options) ->
        options = options || {}

        # the types used by the schema to describe, validate and compute values
        @_types = defaultTypes

    # ## registerCustomTypes
    #
    # allow the developper to add custom types. The type should take the form or
    # a schema's field. Example:
    #
    # db.registerCustomType({
    #   slug: {
    #       type: 'string',
    #       compute: function(model, value, lang){
    #           return lang+'-'+value.toLowerCase().split(' ').join('-')-
    #       }),
    #       validate: function(value) ->
    #           return value.indexOf(' ') === -1
    #    }
    # });
    #
    # Note that one can overwrite the default values (eg: string, boolean) so be
    # carreful !
    registerCustomTypes: (types) ->
        for typeName, type of types
            @_types[typeName] = new Type(@, type)

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
            model.db = @
            @[modelName] = model

    # ## beforeRegister
    beforeRegister: (modelName, model) ->
        unless model::meta?
            model::meta = {}

        model::meta.name = modelName

        unless model::schema?
            throw "#{modelName} has not schema"

        # if the model doesn't specify default language, we set it
        unless model::meta.defaultLang
            model::meta.defaultLang = @defaultLang


    # ## validateModel
    # Check the model structure for any errors
    validateModel: (modelName, model) =>
        # throw "not implemented"


    # ## length
    # return the number of data into the whole db
    length: (callback) ->
        throw 'not implemented'


    # ## syncModel
    # synchronize the model instance with the database
    syncModel: (model, callback) =>
        if model.id?
            id = model.id
        else
            id = @__buildId()
        return callback null, {id: id, dbTouched: true};


    # ## clear
    # remove all data from the database
    clear: (callback) =>
        throw 'not implemented'


    # ## __buildId
    #
    # Generate a unique ID for the model
    __buildId: () ->
        now = new Date()
        rand = Math.floor(Math.random() * 10)
        return rand + parseInt(now.getTime()).toString(36)

module.exports = Database