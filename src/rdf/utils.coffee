
_ = require 'underscore'
_.str = require 'underscore.string'
{defaultTypes} = require '../interface/types'


sparqlFilterOperators = {
    '$gt': '>'
    '$gte': '>='
    '$lt': '<'
    '$lte': '<='
    '$eq': '='
    '$ne': '!='
    # '$in': 'IN' # DOESNT WORK IN VIRTUOSO WITH $exits
    # '$nin': 'NOT IN'
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
    sparqlOffset = ''
    searchAllProperties = false

    if _.isEmpty(mongoQuery) and not queryOptions.sortBy?
        searchAllProperties = true
        sparqlQuery.push '?s ?p ?o .'
    else
        validx = {index: 0}
        _convert(sparqlQuery, mongoQuery, validx)

    if (1 for s in sparqlQuery when _.str.startsWith(s, 'MINUS')).length is sparqlQuery.length
        sparqlQuery.push '?s ?p ?o .'
        searchAllProperties = true


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
                propuri = "#{_.str.classify _buildProperty(prop)}#{lang}1"
                if not mongoQuery[prop]? and not (1 for v in mongoQuery['$and']? or [] when v[prop]?).length
                    prop = _buildProperty(prop)
                    unless searchAllProperties
                        sparqlQuery.push "optional {"
                    sparqlQuery.push "?s #{prop} ?#{propuri} ."
                    if lang
                        sparqlQuery.push "filter (lang(?#{propuri}) = '#{lang}')"
                    unless searchAllProperties
                        sparqlQuery.push '}'
                sparqlOrder.push "#{order}(?#{propuri})"


    # build limit
    if queryOptions.limit?
        sparqlLimit = "limit #{queryOptions.limit}"

    #build offset
    if queryOptions.offset?
        sparqlOffset = "offset #{queryOptions.offset}"

    return """{
    #{sparqlQuery.join('\n')}
    }
    #{sparqlOrder.join(' ')}
    #{sparqlLimit}
    #{sparqlOffset}
    """


_convert = (sparqlQuery, query, validx) ->
    for prop, value of query
        if prop is '$and'
            for val in value
                _convert(sparqlQuery, val, validx)
                # validx+= 1
        else
            sparqlQuery.push _getStatement(prop, value, validx)
            # validx += 1


_buildProperty = (prop) ->
    if prop.indexOf('->') > -1
        _props = []
        for _prop in prop.split('->')
            if _prop.indexOf('^') > -1
                for _inverseProp in _prop.split('^')
                    if _inverseProp
                        _props.push("^<#{_inverseProp}>")
            else
                _props.push("<#{_prop}>")
        prop = _props.join('/')
    else if prop in ['_type', '_class']
        prop = 'a'
    else
        prop = "<#{prop}>"
    return prop

_buildVariable = (prop, lang, validx) ->
    variable = "?#{_.str.classify prop}#{lang}#{validx.index}"
    validx.index += 1
    return variable


_getStatement = (prop, value, validx) ->
    sparqlQuery = []
    lang = ''
    isNot = false
    inverse = false

    if prop.indexOf('@') > -1
        [prop, lang] = prop.split('@')

    if prop[0] is '^'
        prop = prop[1..]
        inverse = true

    if prop.indexOf('->_id::') > -1
        [path, instancesNamespace] = prop.split('->_id::')
        path = _buildProperty(path)
        if inverse
            path = "^#{path}"
        sparqlQuery.push("?s #{path} <#{instancesNamespace}/#{value}> .")
    else

        prop = _buildProperty(prop)

        if inverse
            prop = "^#{prop}"


        if _.isRegExp(value)
            throw 'regex not implemented'

        if _.isObject(value) and not _.isDate(value) and not value._ref?

            addVariableStatement = []
            for $op, val of value

                if filterFuncs[$op]?
                    variable = _buildVariable(prop, lang, validx)
                    sparqlQuery.push filterFuncs[$op](variable, val, lang)
                    addVariableStatement.push variable

                else if innerFilterFuncs[$op]?
                    sparqlQuery.push innerFilterFuncs[$op](prop, val, lang, validx)

                else
                    throw "unknown operator #{$op}"

            for _varstd in addVariableStatement
                sparqlQuery.push "?s #{prop} #{_varstd} ."
        else
            if prop is 'a'
                value = {_id: value}
            variable = _buildVariable(prop, lang, validx)
            sparqlQuery.push "?s #{prop} #{variable} ."
            sparqlQuery.push _commonFilter('$eq')(variable, value, lang)

    return sparqlQuery.join('\n')



_commonFilter = (operator) ->
    return (variable, value, lang) ->
        value = value2rdf(value, lang)
        op = sparqlFilterOperators[operator]
        "filter (#{variable} #{op} #{value})"

_simpleFilterFunc = (operator) ->
    return (variable, value, lang) ->
        _commonFilter(operator)(variable, value, lang)


_regexFilterFunc = (operator) -> # TODO $in with $regex
    return (variable, value, lang) ->
        iregex = ''
        if operator is '$iregex'
            iregex = ', "i"'
        if value.indexOf("'''") > -1
            _filter = """filter regex(#{variable}, \"\"\"#{value}\"\"\"#{iregex})"""
        else
            _filter = """filter regex(#{variable}, '''#{value}'''#{iregex})"""
        _filter


_dateFilterFunc = (operator) ->
    return (variable, value, lang) ->
        filters = []
        if _.isObject(value)
            for $op, val of value
                filters.push(filterFuncs[$op](operator+'('+variable+')', val, lang))
        else
            filters.push(filterFuncs['$eq'](operator+'('+variable+')', value, lang))
        return filters.join('\n')

filterFuncs = {
    '$eq': _simpleFilterFunc('$eq')
    '$lt': _simpleFilterFunc('$lt')
    '$lte': _simpleFilterFunc('$lte')
    '$gt': _simpleFilterFunc('$gt')
    '$gte': _simpleFilterFunc('$gte')
    '$regex': _regexFilterFunc('$regex')
    '$iregex': _regexFilterFunc('$iregex')
    '$year': _dateFilterFunc('year')
    '$month': _dateFilterFunc('month')
    '$day': _dateFilterFunc('day')
}

innerFilterFuncs = {
    '$ne': (prop, value, lang, validx) ->
        variable = _buildVariable(prop, lang, validx)
        _filter = _commonFilter('$eq')(variable, value, lang)
        return """MINUS {
            #{_filter}
            ?s #{prop} #{variable} .
        }"""


    '$in': (prop, value, lang, validx) ->
        statement = []
        filter = []
        op = sparqlFilterOperators['$eq']
        unless _.isArray(value)
            value = [value]
        for _val in value
            variable = _buildVariable(prop, lang, validx)
            statement.push "?s #{prop} #{variable} ."
            val = value2rdf(_val, lang)
            filter.push "#{variable} #{op} #{val}"
        return """
        filter (#{filter.join(' || ')})
        #{statement.join('\n')}
        """

    '$nin': (prop, value, lang, validx) ->
        unless _.isArray value
            value = [value]
        statement = this['$in'](prop, value, lang, validx)
        return "MINUS {#{statement}}"

    '$all': (prop, value, lang, validx) ->
        unless _.isArray value
            value = [value]
        statements = []
        for val in value
            variable = _buildVariable(prop, lang, validx)
            statements.push "?s #{prop} #{variable} ."
            statements.push _commonFilter('$eq')(variable, val, lang)
        return statements.join('\n')

    '$nall': (prop, value, lang, validx) ->
        statement = this['$all'](prop, value, lang, validx)
        return "MINUS {#{statement}}"

    '$exists': (prop, value, lang, validx) ->
        notExists = ''
        addVariableStatement = false
        unless value
            notExists = 'not'
        variable = _buildVariable(prop, lang, validx)
        statement = """
            filter (#{notExists} exists {?s #{prop} #{variable}})
        """
        return statement

}

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
    if _.isArray(value)
        value = (value2rdf(v, lang) for v in value).join(', ')
        value = "(#{value})"
    else if lang and not _.isString(value)
        throw 'i18n fields accept only strings'
    else if value._id?
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
            inverseRelation = model.db.inversedProperties[model::meta.name]?[fieldName]
            unless inverseRelation
                throw "Unknown field #{meta.name}.#{fieldName}"
            else
                newmodel = model.db[inverseRelation.type]
                newfieldName = fields[1..].join('.')
                uri = newmodel::schema[inverseRelation.fieldName].uri or "#{newmodel::meta.propertiesNamespace}/#{inverseRelation.fieldName}"
                return "^#{uri}->#{field2uri(newfieldName, newmodel)}"
        else
            newmodel = model.db[model::schema[fieldName].type]
            newfieldName = fields[1..].join('.')
            uri = schema[fieldName].uri or "#{meta.propertiesNamespace}/#{fieldName}"
            return "#{uri}->#{field2uri(newfieldName, newmodel)}"
    else
        if name is '_id'
            return "_id::#{meta.instancesNamespace}" # BIG UGLY HACK !!! it passes the instancesNamespace to _getStatement
        unless schema[name]?
            throw "Unknown field #{meta.name}.#{name}"
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
    uris = {
        foo: 'http://example.org/foo'
        bar: 'http://example.org/bar'
        toto: 'http://example.org/toto'
    }
    query = {}
    # query[uris.foo+"@en"] = "hello"
    # query["#{uris.bar}->#{uris.toto}->#{uris.foo}"] = new Date()
    query["#{uris.bar}<-#{uris.toto}<-#{uris.foo}->#{uris.bar}"] = new Date()
    # console.log ' '
    console.log  exports.mongo2sparql query
    # console.log ' '

    # console.log  exports.buildTimeSeriesQuery('$year-$month/$seconds')

