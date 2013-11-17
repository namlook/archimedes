
class Database

    constructor: (options) ->
        @endpoint = options.endpoint
        # @name = options.name 
        @graphURI = options.graphURI


    registerClasses: (classes) =>
        for classname, model of classes
            @validate(model)
            @[classname] = model

    registerProperties: (properties) =>
        # ...

    validate: (model) =>
        # ...

    

    sparql: (query) =>
        # ...
    

module.exports = Database