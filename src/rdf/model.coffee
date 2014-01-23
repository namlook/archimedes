
# # RDF Model

_ = require 'underscore'
_.str = require 'underscore.string'
ModelInterface = require '../interface/model'

class ValueError extends Error
class ModelError extends Error

class RdfModel extends ModelInterface

    schema:
        _id:
            protected: true
            type: 'string'
            compute: (value, attrs) ->
                unless _.str.startsWith value, 'http://'
                   return "#{attrs.model.meta.instancesNamespace}/#{value}"
                else
                    return value

        _type:
            protected: true
            type: 'string'
            default: (model) ->
                model.meta.uri

    constructor: (properties) ->
        unless (@meta.uri \
             or @meta.propertiesNamespace \
             or @meta.instancesNamespace)
            throw new ModelError("#{@constructor.name}'s namespaces are missing")

        super properties


    beforeSave: (next) ->
        unless @id?
            now = new Date()
            rand = Math.floor(Math.random() * 10)
            @set '_id', rand + parseInt(now.getTime()).toString(36)
        next()


module.exports = RdfModel

