
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

    # ## constructor
    # process some rdf related stuff
    constructor: (properties) ->
        unless (@meta.uri \
             or @meta.propertiesNamespace \
             or @meta.instancesNamespace)
            throw new ModelError("#{@constructor.name}'s namespaces are missing")

        # convert the pojo (with uris as key) into regular pojo
        for key, value of properties
            if _.str.startsWith(key, 'http://')
                propURI = key
                key = @db._propertiesIndexURI[key]
                delete properties[propURI]
                properties[key] = value

        super properties


    # convert query's key into uris
    @beforeQuery: (query, options, callback) ->
        unless _.isString(query)
            @_convertQueryUri(query)
        return callback null, query, options


    # convert the jsonObject'keys into uris
    toJSONObject: (options) ->
        jsonObj = super(options)
        result = {}
        for key, value of jsonObj
            result[@getURI(key)] = value
        return result

    # convert query's key into uri
    @_convertQueryUri: (query) ->
        for key, value of query
            if key is '$and'
                for val in value
                    for k, v of val
                        unless _.str.startsWith key, 'http://'
                            propURI = @::getURI(k)
                            val[propURI] = v
                            delete val[k]
            else unless _.str.startsWith key, 'http://'
                propURI = @::getURI(key)
                query[propURI] = value
                delete query[key]

    # return the related field URI
    getURI: (fieldName) ->
        if '@' in fieldName
            [name, lang] = fieldName.split('@')
        else
            name = fieldName
        return @schema[name].uri or "#{@meta.propertiesNamespace}/#{fieldName}"


module.exports = RdfModel

