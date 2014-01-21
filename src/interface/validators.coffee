
check = require('validator')
_ = require 'underscore'


module.exports = {
	'string': _.isString
	'integer': check.isInt
	'float': check.isFloat
	'boolean': _.isBoolean

	# complexe
	'date': check.isDate
	'email': check.isEmail
	'url': check.isURL

	# other
	'creditcard': check.isCreditCard
	'ip': (value) -> 
		check.isIP(value, 4) or check.isIP(value, 6)
	'ipv4': (value) -> check.isIP(value, 4)
	'ipv6': (value) -> check.isIP(value, 6)
	'hexadecimal': check.isHexadecimal
	'hexcolor': check.isHexColor
	'uuid': (value) ->
		uuid = check.isUUID
		uuid(value, 3) or uuid(value, 4) or uuid(value, 5)
}