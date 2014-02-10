
_ = require 'underscore'
{defaultTypes} = require '../interface/types'


operators = {
    '$gt': '>'
    '$gte': '>='
    '$lt': '<'
    '$lte': '<='
    '$ne': '!='
}


exports.mongo2sparql = (mongoQuery) ->
    if _.isEmpty(mongoQuery)
        return '?s ?p ?o .'

    sparqlQuery = []
    valuesIndex = 0
    for prop, value of mongoQuery
        lang = null
        if '@' in prop
            [prop, lang] = prop.split('@')

        if _.isRegExp(value)
            throw 'regex not implemented'

        else if _.isObject(value)
            if _.isDate(value)
                value = valueToRdf(value)
                sparqlQuery.push "?s <#{prop}> #{value}"
            else for $op, val of value
                op = operators[$op]
                unless op?
                    throw "unknown operator #{$op}"
                val = valueToRdf(val, lang)
                sparqlQuery.push "?s <#{prop}> ?value#{valuesIndex}"
                sparqlQuery.push "FILTER (?value#{valuesIndex} #{op} #{val})"
                valuesIndex += 1
        else
            value = valueToRdf(value, lang)
            sparqlQuery.push "?s <#{prop}> #{value}"

    return sparqlQuery.join(' .\n')


exports.value2rdf = valueToRdf = (value, lang) ->
    if lang and not _.isString(value)
        throw 'i18n fields accept only strings'
    if value._id?
        value = "<#{value._id}>"
    else if _.isBoolean(value)
        value = "\"#{value}\"^^xsd:boolean"
    else if _.isDate(value)
        utcdate = new Date(value.toUTCString()).toISOString()
        value = "\"#{utcdate}\"^^xsd:dateTime"
    else if _.isNumber(value) and not lang
        if defaultTypes.integer.validate(value)
            type = 'integer'
        else if defaultTypes.float.validate(value)
            type = 'float'
        else
            throw "unknown number's type: #{value}"
        value = "\"#{value}\"^^xsd:#{type}"
    else
        quotedValue = value.replace(/"/g, '\\"')
        lang = if lang then "@#{lang}" else ''
        value = "\"#{quotedValue}\"#{lang}"
    return value



