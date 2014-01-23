
check = require('validator')
_ = require 'underscore'


module.exports = {
	'string':
		validate: _.isString
		# compute: (value) -> check.toString(value)
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
		validate: check.isEmail
	'url':
		validate: check.isURL

	# other
	'creditcard':
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