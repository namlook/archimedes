
_ = require 'underscore'
_.str = require 'underscore.string'
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
    mongoQuery = mongoQuery or {}
    queryOptions = queryOptions or {}
    options = options or {}
    sparqlQuery = []
    sparqlOrder = []
    sparqlLimit = ''

    if _.isEmpty(mongoQuery) and not queryOptions.sortBy?
        sparqlQuery.push '?s ?p ?o .'
    else
        validx = 0
        _convert(sparqlQuery, mongoQuery, validx)

    if (1 for s in sparqlQuery when _.str.startsWith(s, 'MINUS')).length is sparqlQuery.length
        sparqlQuery.push '?s ?p ?o .'

    if options.queryOnly
        return sparqlQuery.join('\n')

    # built sortBy
    if queryOptions.sortBy?
        sortBy = queryOptions.sortBy
        if _.isString sortBy
            sortBy = [sortBy]

        if sortBy.length
            sparqlOrder.push 'order by'
            for prop in sortBy
                lang = ''
                order = 'asc'
                if prop[0] is '-'
                    order = 'desc'
                    prop = prop[1..]
                if prop.indexOf('@') > -1
                    [prop, lang] = prop.split('@')
                if not mongoQuery[prop]? or not (1 for v in mongoQuery['$and']? or [] when v[prop]?).length
                    prop = _buildProperty(prop)
                    propuri = "#{_.str.classify prop}#{lang}"
                    sparqlQuery.push "?s #{prop} ?#{propuri} ."
                    if lang
                        sparqlQuery.push "filter (lang(?#{propuri}) = '#{lang}')"
                sparqlOrder.push "#{order}(?#{_.str.classify prop}#{lang})"


    # build limit
    if queryOptions.limit?
        sparqlLimit = "limit #{queryOptions.limit}"

    return """{#{sparqlQuery.join('\n')}}
        #{sparqlOrder.join(' ')}
        #{sparqlLimit}
    """


_convert = (sparqlQuery, query, validx) ->
    for prop, value of query
        if prop is '$and'
            for val in value
                _convert(sparqlQuery, val, validx)
                validx+= 1
        else
            sparqlQuery.push _getStatement(prop, value, validx)
            validx += 1


_buildProperty = (prop) ->
    if prop.indexOf('->') > -1
        prop = ("<#{_prop}>" for _prop in prop.split('->')).join('/')
    else if prop is '_type'
        prop = 'a'
    else
        prop = "<#{prop}>"
    return prop

_getStatement = (prop, value, validx) ->
    sparqlQuery = []
    lang = ''
    isNot = false
    addVariableStatement = true

    if prop.indexOf('@') > -1
        [prop, lang] = prop.split('@')

    variable = "?#{_.str.classify prop}#{lang}#{validx}"
    prop = _buildProperty(prop)

    if _.isRegExp(value)
        throw 'regex not implemented'

    if _.isObject(value) and not _.isDate(value) and not value._uri?
        for $op, val of value

            if $op in ['$gt', '$lt', '$gte', '$lte']
                if prop is 'a'
                    val = {_id: val}
                _val = value2rdf(val, lang)
                op = operators[$op]
                sparqlQuery.push "filter (#{variable} #{op} #{_val})"

            else if $op in ['$in', '$nin']
                if $op is '$nin'
                    isNot = true
                unless _.isArray val
                    val = [val]
                val = (prop is 'a' and {_id: v} or v for v in val)
                vals = (value2rdf(v, lang) for v in val)
                filter = ("#{variable} = #{v}" for v in vals)
                sparqlQuery.push "filter (#{filter.join(' || ')})"

            else if $op in ['$all', '$nall']
                if $op is '$nall'
                    isNot = true
                unless _.isArray val
                    val = [val]
                _variable = variable
                varidx = 0
                for _val in val
                    unless _variable is variable
                        sparqlQuery.push "?s #{prop} #{_variable}"
                    if prop is 'a'
                        _val = {_id: _val}
                    _val = value2rdf(_val, lang)
                    sparqlQuery.push "filter (#{_variable} = #{_val})"
                    varidx += 1
                    _variable = "#{variable}#{varidx}"

            else if $op is '$exists'
                notExists = ''
                addVariableStatement = false
                unless val
                    notExists = 'not'
                sparqlQuery.push "?s ?p ?o"
                sparqlQuery.push "filter (#{notExists} exists {?s #{prop} #{variable}})"

            else if $op is '$ne'
                isNot = true
                if prop is 'a'
                    val = {_id: val}
                _val = value2rdf(val, lang)
                sparqlQuery.push "filter (#{variable} = #{_val})"

            else
                throw "unknown operator #{$op}"
    else
        if prop is 'a'
            value = {_id: value}
        value = value2rdf(value, lang)
        sparqlQuery.push "filter (#{variable} = #{value})"

    if addVariableStatement
        sparqlQuery.push "?s #{prop} #{variable}"


    sparqlQuery = sparqlQuery.join(' .\n')
    minus = ''
    if isNot
        minus = "MINUS "
    sparqlQuery = "#{minus}{#{sparqlQuery}}"
    return sparqlQuery


# ## value2rdf
# Convert a value into its rdf representation. If lang is passed, add the
# language to the string.
# If the value is an object with an `_id` attribute then treat the value as an
# URI.
#
# Examples:
#    3                               -> "3"^^xsd:integer
#    true                            -> "1"^^xsd:boolean
#    'title@en'                      -> "title"@en
#    {_id: 'http://example.org/foo'} -> <http://example.org/foo>
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


# ## field2uri
# convert a field into its related uri
exports.field2uri = field2uri = (fieldName, model) ->
    schema = model::schema
    meta = model::meta
    if fieldName.indexOf('@') > -1
        [name, lang] = fieldName.split('@')
    else
        name = fieldName
    if fieldName.indexOf('.') > -1
        fields = fieldName.split('.')
        fieldName = fields[0]
        unless schema[fieldName]?
            throw "Unknown field: #{meta.name}.#{fieldName} xx"
        newmodel = model.db[model::schema[fieldName].type]
        newfieldName = fields[1..].join('.')
        uri = schema[fieldName].uri or "#{meta.propertiesNamespace}/#{fieldName}"
        return "#{uri}->#{field2uri(newfieldName, newmodel)}"
    else
        unless schema[name]?
            throw "Unknown field: #{meta.name}.#{name}"
        return schema[name].uri or "#{meta.propertiesNamespace}/#{fieldName}"



exports.buildTimeSeriesQuery = (step) ->
    stepIndex = {
        'year': false
        'month': false
        'day': false
        'hours': false
        'minutes': false
        'seconds': false
    }

    for _step in step.split('$')
        for key, _value of stepIndex
            if _.str.startsWith(_step, key)
                stepIndex[key] = true
                nbSteps += 1

    steps = (s for s, v of stepIndex when v is true)
    nbSteps = steps.length

    modifiers = []
    if nbSteps is 0
        throw 'timeSeries requires a step'
    else if nbSteps is 1
        concat = "#{steps[0]}(?date)"
    else
        for _step in steps
            step = step.replace("$#{_step}", "\", ?#{_step}, \"")
            modifiers.push """
            bind(str(#{_step}(?date)) as ?_#{_step}) .
            bind(if(strlen(?_#{_step}) = 1, concat('0', ?_#{_step}), ?_#{_step}) as ?#{_step}) .
            """
        concat = "concat(\"#{step}\")"

    return {
        'modifiers': modifiers.join('\n')
        'groupBy': "(#{concat} as ?facet)"
    }

if require.main is module
    # uris = {
    #     foo: 'http://example.org/foo'
    #     bar: 'http://example.org/bar'
    #     toto: 'http://example.org/toto'
    # }
    # query = {}
    # query[uris.foo+"@en"] = "hello"
    # query["#{uris.bar}->#{uris.toto}->#{uris.foo}"] = new Date()
    # console.log ' '
    # console.log  exports.mongo2sparql query, {sortBy: ["-#{uris.bar}->#{uris.toto}->#{uris.foo}"]}
    # console.log ' '

    console.log  exports.buildTimeSeriesQuery('$year-$month/$seconds')

