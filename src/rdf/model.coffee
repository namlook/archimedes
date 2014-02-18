
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
            if value in [null, undefined]
                continue
            if _.str.startsWith(key, 'http://')
                propURI = key
                key = @db._propertiesIndexURI[key]
                delete properties[propURI]
                properties[key] = value
            if value._uri?
                properties[key] = value._uri
            else if _.isArray value
                properties[key] = (val._uri? and val._uri or val for val in value)
        super properties


    # convert query's key into uris
    @beforeQuery: (query, options, callback) ->
        if not _.isString(query) and not _.isArray(query)
            @_convertQueryUri(query)
        return callback null, query, options


    # convert the model into an object which will be passed to the database
    toSerializableObject: (options) ->
        jsonObj = super(options)
        result = {}
        for key, value of jsonObj
            if key in ['_id', '_type']
                result[key] = value
            else
                if @db[@schema[key].type]?
                    unless _.str.startsWith(value, 'http://')
                        nspace = @db[@schema[key].type]::meta.instancesNamespace
                        value = "#{nspace}/#{value}"
                    result[@getURI(key)] = {_uri: value}
                else
                    result[@getURI(key)] = value
        return result


    # ## serialize
    # Convert the model into ntriples. This is usefull for dumping models in raw
    # data in order to load them into the database
    serialize: (options) ->
        return @db.serialize(@toSerializableObject())


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

