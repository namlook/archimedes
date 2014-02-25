
_ = require 'underscore'
{defaultTypes} = require '../interface/types'


operators = {
    '$gt': '>'
    '$gte': '>='
    '$lt': '<'
    '$lte': '<='
}

# ## mongo2sparql
# convert a mongo-like query into a sparql query
#
# example:
#  convert
#   {foo: 3, bar: {$gt: 2}}
#
#   into
#
#    {
#       ?s <http://example.org/foo> ?bar .
#       ?s <http://example.org/foo> ?foo .
#       filter(?foo=3 && ?bar > 2)
#    }
exports.mongo2sparql = (mongoQuery, queryOptions, options) ->
    queryOptions = queryOptions or {}
    options = options or {}

    _convert = (query, sparqlQuery, queryOptions, propIndex) ->
        for prop, value of query
            lang = null

            if prop is '$and'
                for val in value
                    _convert(val, sparqlQuery, queryOptions, propIndex)
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
                        propIndex[prop] = valuesIndex
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
                        propIndex[prop] = valuesIndex
                        valuesIndex += 1

            else
                value = value2rdf(value, lang)
                sparqlQuery.push "?s <#{prop}> #{value}"

    sparqlQuery = []
    sparqlOrder = []
    sparqlLimit = ""
    valuesIndex = 0
    propIndex = {}


    if _.isEmpty(mongoQuery) and not queryOptions.sortBy?
        sparqlQuery.push '?s ?p ?o .'
    else
        _convert(mongoQuery, sparqlQuery, queryOptions, propIndex)

    if options.queryOnly
        return sparqlQuery.join(' .\n')

    # build sorting
    if queryOptions.sortBy?
        sortBy = queryOptions.sortBy
        if _.isString sortBy
            sortBy = [sortBy]

        # we have to keep an index on prop and its related value index
        for prop in sortBy
            order = 'asc'
            lang = ''
            if prop[0] is '-'
                prop = prop[1..]
                order = 'desc'
            unless propIndex[prop]?
                propIndex[prop] = valuesIndex
                if prop.indexOf('@') > -1
                    [prop, lang] = prop.split('@')
                sparqlQuery.push "?s <#{prop}> ?value#{valuesIndex}#{lang}"
                if lang
                    sparqlQuery.push "filter (lang(?value#{valuesIndex}#{lang}) = \"#{lang}\")"
                valuesIndex += 1

        # generate sparqlOrder
        if not _.isEmpty(propIndex) and not _.isEmpty(sortBy)
            sparqlOrder.push 'order by'
            for prop in sortBy
                order = 'asc'
                lang = ''
                if prop[0] is '-'
                    order = 'desc'
                    prop = prop[1..]
                index = propIndex[prop]
                if prop.indexOf('@') > -1
                    [prop, lang] = prop.split('@')
                sparqlOrder.push "#{order}(?value#{index}#{lang})"

    # build limit
    if queryOptions.limit?
        sparqlLimit = "limit #{queryOptions.limit}"

    return """{#{sparqlQuery.join(' .\n')}}
        #{sparqlOrder.join(' ')}
        #{sparqlLimit}
    """



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



