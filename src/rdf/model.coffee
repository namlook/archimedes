
# # RDF Model

_ = require 'underscore'
ModelInterface = require '../interface/model'

class ValueError extends Error
class ModelError extends Error

class Model extends ModelInterface

    constructor: (properties) ->
        unless (@meta.uri \
             or @meta.propertiesNamespace \
             or @meta.instancesNamespace)
            throw new ModelError("#{@constructor.name}'s namespaces are missing")
        super

module.exports = Model

