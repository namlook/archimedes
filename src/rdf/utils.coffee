
_ = require 'underscore'
{defaultTypes} = require '../interface/types'


operators = {
    '$gt': '>'
    '$gte': '>='
    '$lt': '<'
    '$lte': '<='
}


exports.mongo2sparql = (mongoQuery) ->
    if _.isEmpty(mongoQuery)
        return '?s ?p ?o .'

    sparqlQuery = []
    valuesIndex = 0
    for prop, value of mongoQuery
        if '@' in prop
            throw 'i18n query is not implemented yet'

        if _.isRegExp(value)
            throw 'regex not implemented'

        else if _.isObject(value)
            for $op, val of value
                op = operators[$op]
                unless op?
                    throw "unknown operator #{$op}"
                val = valueToRdf(val)
                sparqlQuery.push "?s <#{prop}> ?value#{valuesIndex}"
                sparqlQuery.push "FILTER (?value#{valuesIndex} #{op} #{val})"
                valuesIndex += 1
        else
            value = valueToRdf(value)
            sparqlQuery.push "?s <#{prop}> #{value}"

    return sparqlQuery.join(' .\n')


exports.value2rdf = valueToRdf = (value) ->
        if value._id?
            value = "<#{value._id}>"
        if _.isBoolean(value)
            value = "\"#{value}\"^^xsd:boolean"
        else if _.isNumber(value)
            if defaultTypes.integer.validate(value)
                type = 'integer'
            else if defaultTypes.float.validate(value)
                type = 'float'
            else
                throw "unknown number's type: #{value}"
            value = "\"#{value}\"^^xsd:#{type}"
        else
            quotedValue = value.replace(/"/g, '\\"')
            value = "\"#{quotedValue}\""
        return value



