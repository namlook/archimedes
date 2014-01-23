
check = require('validator')
_ = require 'underscore'



exports.defaultTypes = {
	'string':
		validate: _.isString
	'integer':
		validate: check.isInt
	'float':
		validate: check.isFloat
	'boolean':
		validate: _.isBoolean

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

