# # LocalStorage adapter

_ = require 'underscore'

NeDatabase = require '../nedb/database'

class Database extends NeDatabase

    # options:
    #
    constructor: (options) ->
        super options
        @name = options.name
        unless @name
            throw 'name is required'

        data = localStorage.getItem(options.name)
        if data
            items = JSON.parse(data)

        @store.insert items, (err, obj) ->
            console.log 'localStorage loaded'


    _syncLocalStorage: (callback) ->
        @store.find {}, (err, docs) =>
            localStorage.setItem(@name, JSON.stringify(docs))
            return callback null

    # ## _update
    # update a pojo into the database
    _update: (pojo, options, callback) ->
        super pojo, options, (err, obj) =>
            if err
                return callback err
            @_syncLocalStorage (err) ->
                if err
                    return callback err
                return callback null, obj

    # ## _insert
    # insert a pojo into the database
    _insert: (pojo, options, callback) ->
        super pojo, options, (err, obj) =>
            if err
                return callback err
            @_syncLocalStorage (err) ->
                if err
                    return callback err
                return callback null, obj

    # ## _delete
    # delete a pojo into the database
    delete: (id, callback) ->
        super id, (err) =>
            if err
                return callback err
            @_syncLocalStorage (err) ->
                if err
                    return callback err
                return callback null

    # ## _clear
    # clear the database
    clear: (callback) ->
        super (err) =>
            if err
                return callback err
            @_syncLocalStorage (err) ->
                if err
                    return callback err
                return callback null

module.exports = Database