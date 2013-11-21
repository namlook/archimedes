
class Database
	
	constructor: (options) ->
		# ...

    # Register the models
    # The registration make some fill the models with default values and sanitize
    # their structures. Finally, attach each models to the database instance so
    # we can access them easily
	registerModel: (models) =>
		for modelName, model of models
			@validate(modelName, model)
			@[modelName] = model


    # Check the model structure for any errors
	validate: (modelName, model)=>
		# ...

module.exports = Database