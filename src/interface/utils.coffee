
_ = require 'underscore'

exports.isPojo = (obj) ->
    _.isObject(obj) and not _.isArray(obj) and not _.isFunction(obj)

exports.deepClone = deepClone = (obj, inherit) ->
    if (not _.isObject(obj)) or (_.isObject(obj) and (_.isArray(value) or _.isFunction(value)))
        return obj

    clonedObj = {}
    for key, value of inherit
        clonedObj[key] = deepClone(value)

    for key, value of obj
        if _.isObject(value) and not _.isArray(value) and not _.isFunction(value)
            clonedObj[key] = deepClone(value, clonedObj[key])
        else
            clonedObj[key] = value
    return clonedObj