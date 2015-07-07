
import _ from 'lodash';
import joi from 'joi';
import modelInstance from './model-instance';
import {ValidationError} from './errors';
import ModelSchema from './model-schema';


var propertyConfigValidator = {
    type: joi.string().required(),
    validate: joi.array().items(joi.alternatives().try(
        joi.string(),
        joi.object()
    )),
    meta: joi.object()
};

var modelClassSchemaValidator = joi.object().keys({
    meta: joi.object(),
    mixins: joi.array().items(joi.string()),
    properties: joi.object().pattern(/.+/, joi.alternatives().try(
        joi.object().keys(propertyConfigValidator).keys({
            items: joi.alternatives().try(joi.string(), propertyConfigValidator)
        }),
        joi.string()
    )),
    methods: joi.object().pattern(/.+/, joi.func()),
    statics: joi.object().pattern(/.+/, joi.func())
});


var modelFactory = function(db, name, modelClassSchema) {

    /**
     * validate the model class schema
     */
    var {error, value: schema} = joi.validate(modelClassSchema, modelClassSchemaValidator);

    if (error) {
        let errorDetail = error.details[0];
        let path = ` (${errorDetail.path})`;
        if (!_.contains(path, '.')) {
            path = '';
        }
        throw new ValidationError(`${name} ${errorDetail.message}${path}`, error);
    }


    /**
     * process the mixins
     */
    schema.mixins = schema.mixins || [];

    let mixins = schema.mixins.map(mixinName => {
        if (!db.modelSchemas[mixinName]) {
            throw new ValidationError(`${name}: unknown mixin "${mixinName}"`);
        }
        return modelFactory(db, mixinName, db.modelSchemas[mixinName]);
    });

    mixins.push(_.omit(schema, 'mixins'));


    /**
     * process the properties and aggregate them from mixins
     */
    var properties = mixins.map(mixin => {
        return mixin.properties;
    });
    properties = _.assign({}, ..._.compact(properties));

    // /** if the property config is a string, convert it into a valid config **/
    // _.forOwn(properties, (propConfig, propName) => {
    //     if (typeof propConfig === 'string') {
    //         propConfig = {type: propConfig};
    //     }
    //     if (propConfig.type === 'array') {
    //         if (!propConfig.items) {
    //             throw new ValidationError(`${name} if property's type is "array" then "items" should be specified (properties.${propName})`);
    //         }

    //         if (typeof propConfig.items === 'string') {
    //             propConfig.items = {type: propConfig.items};
    //         }
    //     }
    //     properties[propName] = propConfig;
    // });


    /**
     * process the methods and aggregate them from mixins
     */
    var methods = mixins.map(mixin => {
        return mixin.methods;
    });
    methods = _.assign({}, ..._.compact(methods));


    /**
     * process the static methods and aggregate them from mixins
     */
    var staticMethods = mixins.map(mixin => {
        return mixin.statics;
    });
    staticMethods = _.assign({}, ..._.compact(staticMethods));


    /**
     * construct the Model
     */
    var inner = {
        name: name,
        db: db,
        meta: new function() {
            return modelClassSchema.meta;
        },
        _archimedesModel: true,
        properties: new function() {
            return properties;
        },
        methods: new function() {
            return methods;
        },
        statics: new function() {
            return staticMethods;
        },

        create(pojo) {
            return _.assign({}, modelInstance(db, this, pojo), methods);
        },


        /**
         * Wrap a pojo into a model instance. The difference beetween wrap
         * and create is wrap assign the _id to the model instance, simulating
         * a saved document
         *
         * @params {object} - initial values
         * @returns the model instance
         */
        wrap(pojo) {
            let instance = this.create(pojo);
            instance._id = pojo._id;
            return instance;
        },

        /**
         * Returns a promise which resolve a list of model instance
         * that match the query
         *
         * @params {?object} query - the query
         * @returns a promise
         */
        find(query) {
            return db.find(name, query).then((results) => {
                let data = results.map(o => this.wrap(o));
                return data;
            });
        },


        /**
         * Returns a promise which resolve a model instance that match the query
         *
         * @params {?object} query - the query
         * @returns a promise
         */
        first(query) {
            return this.find(query).then((results) => {
                var result;
                if (results.length) {
                    result = results[0];
                }
                return result;
            });
        },


        fetch(id) {
            return db.fetch(name, id);
        },

        count(query) {
            return db.count(name, query);
        }
    };

    var modelSchema = new ModelSchema(inner);

    return _.assign({schema: modelSchema}, inner, staticMethods);
};

export default modelFactory;

