
# # RDF Model

_ = require 'underscore'
_.str = require 'underscore.string'
ModelInterface = require '../interface/model'
{field2uri} = require './utils'

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


    @beforeQuery: (query, options, callback) ->
        # convert query's key into uris
        if not _.isString(query) and not _.isArray(query)
            try
                @_convertQueryUri(query)
            catch e
                return callback e

        # convert sortBy keys into uri
        if options.sortBy? and not _.isArray options.sortBy
            _sortBy = [options.sortBy]
        else
            _sortBy = options.sortBy or []

        sortBy = []
        for key in _sortBy
            unless _.str.startsWith(key, 'http://')
                lang = ''
                order = ''
                if key[0] is '-'
                    key = key[1..]
                    order = '-'
                else
                    key = key[..]
                if key.indexOf('@') > -1
                    [key, lang] = key.split('@')
                    lang = "@#{lang}"
                propURI = field2uri(key, @)
                sortBy.push "#{order}#{propURI}#{lang}"

        options.sortBy = sortBy
        return callback null, query, options


    # ## facets
    # `facets(field, [query], [options], callback)`
    #
    # Performe a group count on a specified field. A query can be added to filter
    # the data to aggregate
    #
    # It takes the following options
    #   * limit: (default 30) the maximum of results to return
    #
    @facets: (field, query, options, callback) ->
        if typeof(options) is 'function' and not callback
            callback = options
            options = {}
        else if typeof(query) is 'function'
            callback = query
            query = {}
            options = {}

        unless field
            return callback 'field is required'
        unless callback
            return callback 'callback is required'

        unless options.limit?
            options.limit = 30
        unless options.order?
            options.order = 'desc'

        unless _.str.startsWith field, 'http://'
            try
                field = field2uri(field, @)
            catch e
                return callback e

        try
            @_convertQueryUri(query)
        catch e
            return callback e

        @db.facets field, query, options, callback

    # ## timeSeries
    # Aggregate the data by a specified step.
    #
    # Steps are : $year, $month, $day, $hours, $minutes and $seconds
    #   steps can be combined like "$month-$day" or "$year/$month" etc..
    @timeSeries: (dateField, step, query, options, callback) ->
        unless dateField
            throw 'field is required'
        unless step
            throw 'step is required'

        if not callback and typeof(query) is 'function'
            callback = query
            query = {}
            options = {}
        else if not callback and typeof(options) is 'function'
            callback = options
            options = {}

        unless callback
            throw 'callback is required'

        unless options.limit?
            options.limit = 30
        unless options.order?
            options.order = 'asc'

        unless _.str.startsWith dateField, 'http://'
            try
                field = field2uri(dateField, @)
            catch e
                return callback e

        unless @::schema[dateField]?.type in ['datetime', 'date']
            return callback \
                "#{@::meta.name}.#{dateField} is not a date. timeSeries() "+\
                "requires a date field"

        try
            @_convertQueryUri(query)
        catch e
            return callback e

        return @db.timeSeries field, step, query, options, callback



    # ## toSerializableObject
    #
    # convert the model into an object which will be passed to the database
    toSerializableObject: (options) ->
        jsonObj = super(options)
        result = {}
        for key, value of jsonObj
            if key in ['_id', '_type']
                result[key] = value
            else
                propURI = field2uri(key, @db[@meta.name])
                if @db[@schema[key].type]?
                    unless _.isArray(value)
                        value = [value]
                    values = []
                    for val in value
                        unless _.str.startsWith(val, 'http://')
                            nspace = @db[@schema[key].type]::meta.instancesNamespace
                            val = "#{nspace}/#{val}"
                        values.push val
                    if @schema[key].multi
                        result[propURI] = {_uri: values}
                    else
                        result[propURI] = {_uri: values[0]}
                else
                    result[propURI] = value
        return result


    # ## serialize
    # Convert the model into ntriples. This is usefull for dumping models in raw
    # data in order to load them into the database
    serialize: (options) ->
        return @db.serialize(@toSerializableObject())


    # convert query's key into uri
    @_convertQueryUri: (query) ->
        for key, value of query
            if key is '_type'
                continue
            if key is '$and'
                for val in value
                    @_convertQueryUri val
            else unless _.str.startsWith key, 'http://'
                propURI = field2uri(key, @)
                query[propURI] = value
                delete query[key]


module.exports = RdfModel

