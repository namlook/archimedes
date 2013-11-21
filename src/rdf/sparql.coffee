
class Sparql

    constructor: (@endpoint) ->
        # ...

    # execute a sparql query against the database
    #
    # options:
    #    * format: 'json' or 'turtle' (default 'json') the wanted results format
    query: (sparqlQuery, options, callback)=>
        # ...

module.exports = Sparql