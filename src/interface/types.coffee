
check = require('validator')
_ = require 'underscore'



defaultTypes = {
    'string':
        validate: _.isString
    'integer':
        validate: check.isInt
        compute: (value, attrs) ->
            parseInt(value, 10)
    'float':
        validate: check.isFloat
        compute: (value, attrs) ->
            precision = attrs.model.schema[attrs.fieldName].precision
            if precision is undefined
                precision = 3
            parseFloat(value.toPrecision(precision))
    'boolean':
        compute: (value, attrs) ->
            unless _.isBoolean(value) or value in [0, 1]
                throw "#{attrs.model.meta.name}.#{attrs.fieldName} must be a boolean not '#{typeof value}'"
            Boolean value
        validate: (value) -> _.isBoolean(value) or value in [0, 1]

    # complexe
    'date':
        validate: check.isDate
        compute: (value) -> check.toDate(value)
    'email':
        type: 'string'
        validate: check.isEmail
    'url':
        type: 'string'
        validate: check.isURL

    # other
    'creditcard':
        type: 'string'
        validate: check.isCreditCard
    'ip':
        validate: (value) -> check.isIP(value, 4) or check.isIP(value, 6)
    'ipv4':
        validate: (value) -> check.isIP(value, 4)
    'ipv6':
        validate: (value) -> check.isIP(value, 6)
    'hexadecimal':
        validate: check.isHexadecimal
    'hexcolor':
        validate: check.isHexColor
    'uuid':
        validate: (value) ->
            uuid = check.isUUID
            uuid(value, 3) or uuid(value, 4) or uuid(value, 5)
}

# aliases
defaultTypes['bool'] = defaultTypes['boolean']

exports.defaultTypes = defaultTypes

class exports.Type

    constructor: (@db, @type) ->

    compute: (value, attrs) ->
        if @type.type
            inheritedType = @db._types[@type.type]
            if inheritedType.compute?
                value = inheritedType.compute(value, attrs)
            if inheritedType.validate?
                unless inheritedType.validate(value, attrs)
                    modelName = attrs.model.meta.name
                    fieldName = attrs.fieldName
                    throw "ValidationError: #{modelName}.#{fieldName} must be a #{@type.type}"

        if @type.compute?
            value = @type.compute(value, attrs)
        return value

    validate: (value, attrs) ->
        ok = true
        if @type.type
            ok = @db._types[@type.type].validate(value, attrs)
        if ok and @type.validate?
            ok = @type.validate(value, attrs)
        return ok

