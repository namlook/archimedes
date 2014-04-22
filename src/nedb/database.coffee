# # NeDB adapter

_ = require 'underscore'

DatabaseInterface = require '../interface/database'
Datastore = require 'nedb'

class Database extends DatabaseInterface

    dbtype: 'nedb'


    # options:
    #
    constructor: (options) ->
        super options
        @store = new Datastore()


    # ## clear
    # empty the database
    #
    # example:
    #       @clear (err, ok) ->
    clear: (callback) ->
        @store.remove {}, {multi: true}, (err, numRemoved) ->
            if err
                return callback err
            return callback null, numRemoved


    # ## count
    # return the number of item that match the query
    count: (query, options, callback) ->
        if typeof options is 'function' and not callback
            callback = options
            options = {}
        if typeof query is 'function'
            callback = query
            options = {}
            query = {}

        @store.count query, (err, count) ->
            if err
                return callback err
            return callback null, count


    # ## _update
    # update a pojo into the database
    _update: (pojo, options, callback) ->
        @store.update {_id: pojo._id}, pojo, (err, obj) =>
            if err
                return callback err
            return callback null, obj


    # ## _insert
    # insert a pojo into the database
    _insert: (pojo, options, callback) ->
        @store.insert pojo, (err, obj) =>
            if err
                return callback err
            return callback null, obj


    # ## delete
    # Delete the item in database that match the id
    #
    # example:
    #       @remove id, (err) ->
    delete: (id, callback) =>
        unless id
            return callback "id must no be null"
        @store.remove { _id: id }, {}, (err, numRemoved) ->
            if err
                return callback err
            return callback null, numRemoved


    # ## _find
    # perform a find query against a regular query
    # The query is a mongo-like query which take the following form:
    #
    #     {fieldName: value, 'i18nfield@en': 'english content'}
    #
    # we can reach relations with the doted notation
    #
    #     {'blogPost.comment.author.name': 'Nico'}
    #
    # example:
    #   @_find query, options, (err, docs) ->
    _find: (query, options, callback) ->
        if _.isArray(query)
            ids = []
            for item in query
                if item._id?
                    ids.push item._id
                else if _.isString(item)
                    ids.push item
            query = {_id: {'$in': ids}}
        else if query._id? and _.isArray(query._id)
            query._id = {'$in': query._id}

        query = @_convertQuery(query)

        call = @store.find query

        if options.limit?
            call.limit options.limit

        if options.sortBy?
            if _.isString options.sortBy
                options.sortBy = [options.sortBy]
            sortBy = {}
            for field in options.sortBy
                order = 1
                if field[0] is '-'
                    order = -1
                    field = field[1..]
                if field.indexOf('@') > -1
                    field = field.replace('@', '.')
                sortBy[field] = order
            call.sort sortBy

        call.exec (err, data) =>
            if err
                return callback err
            return callback null, data


    # ## _findByIds
    # fetch documents by their ids
    #
    # example:
    #   @_findByIds ids, options, (err, docs) ->
    _findByIds: (ids, options, callback) ->
        query = {$or: ({_id: id} for id in ids)}
        @_find query, options, callback

    # ## _findById
    # fetch a document by its id
    #
    # example:
    #   @_findById id, options, (err, docs) ->
    _findById: (id, options, callback) ->
        @_find {_id: id}, options, callback


    _convertQuery: (query) ->
        newquery = {}
        whereFn = []

        # handle special opertors
        for key, value of query
            if value['$ne']?
                newquery['$not'] = {} unless newquery['$not']
                newquery['$not'][key] = value['$ne']
            else if value['$all']?
                newquery['$and'] = [] unless newquery['$all']
                for val in value['$all']
                    _q = {}
                    _q[key] = val
                    newquery['$and'].push _q
            else if value['$nall']?
                newquery['$not'] = {} unless newquery['$not']
                newquery['$not']['$and'] = []
                for val in value['$nall']
                    _q = {}
                    _q[key] = val
                    newquery['$not']['$and'].push _q
            else if value['$nin']?
                whereFn.push {
                    fieldName: key
                    query: value
                    fn: (obj, fname, query) ->
                        # handle i18n query (ie {'field@en': {$nin: ['foo']}})
                        if '@' in fname
                            [name, lang] = fname.split('@')
                            value = obj[name][lang]
                        else
                            value = obj[fname]
                        unless _.isArray value
                            value = [value]
                        _.intersection(value, query['$nin']).length is 0
                    }
            else
                if '@' in key # handle i18n query
                    key = key.replace('@', '.')
                newquery[key] = value


        if whereFn.length
            newquery['$where'] = () ->
                _.every(w.fn(@, w.fieldName, w.query) for w in whereFn)
        return newquery

module.exports = Database

