

class Model
	
	# All informations about the model goes here
	meta: {}

	# The structure of the model
	structure: {}

	constructor: () ->
        # where the values are stored
        @_properties = {}
        # where the related instances (fetched via uris) are stored
        @_instances = {}

module.exports = Model