
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

    _convert = (query, sparqlQuery) ->
        for prop, value of query
            lang = null

            if prop is '$and'
                for val in value
                    _convert(val, sparqlQuery)
                continue
            else if prop is '_type'
                sparqlQuery.push "?s a <#{value}>"
                continue

            if '@' in prop
                [prop, lang] = prop.split('@')

            if _.isRegExp(value)
                throw 'regex not implemented'

            else if _.isObject(value)

                if _.isDate(value)
                    value = value2rdf(value, lang)
                    sparqlQuery.push "?s <#{prop}> #{value}"

                else for $op, val of value

                    if $op is '$in'
                        unless _.isArray val
                            val = [val]
                        vals = (value2rdf(v, lang) for v in val)
                        filter = ("?value#{valuesIndex} = #{v}" for v in vals)
                        filter = filter.join(' || ')
                        sparqlQuery.push "FILTER (#{filter})"
                        sparqlQuery.push "?s <#{prop}> ?value#{valuesIndex}"
                        valuesIndex += 1

                    else if $op is '$all'
                        unless _.isArray val
                            val = [val]
                        for v in val
                            v = value2rdf(v, lang)
                            sparqlQuery.push "?s <#{prop}> #{v}"

                    else if $op in ['$nin', '$ne']
                        sparqlQuery.push "?s ?p ?o"
                        unless _.isArray val
                            val = [val]
                        for v in val
                            v = value2rdf(v, lang)
                            sparqlQuery.push "MINUS {?s <#{prop}> #{v}}"

                    else # $gt, $gte, $lt, $lte
                        op = operators[$op]
                        unless op?
                            throw "unknown operator #{$op}"
                        val = value2rdf(val, lang)
                        sparqlQuery.push "FILTER (?value#{valuesIndex} #{op} #{val})"
                        sparqlQuery.push "?s <#{prop}> ?value#{valuesIndex}"
                        valuesIndex += 1

            else
                value = value2rdf(value, lang)
                sparqlQuery.push "?s <#{prop}> #{value}"

    _convert(mongoQuery, sparqlQuery)

    return sparqlQuery.join(' .\n')


exports.value2rdf = value2rdf = (value, lang) ->
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
        value = "\"\"\"#{quotedValue}\"\"\"#{lang}"
    return value



