

class Model
	
	# All informations about the model goes here
	meta: null

	# The structure of the model
	schema: null

	constructor: () ->
        # where the values are stored
        @_properties = {}
        # where the related instances (fetched via uris) are stored
        @_instances = {}

module.exports = Model