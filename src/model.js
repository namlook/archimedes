
import _ from 'lodash';
import joi from 'joi';
import modelInstance from './model-instance';
import {ValidationError} from './errors';
import ModelSchema from './model-schema';


var propertyConfigValidator = {
    type: joi.string().required().only([
        'string', 'number', 'boolean', 'date', 'array'
    ]),
    validate: joi.array().items(joi.alternatives().try(
        joi.string(),
        joi.object()
    ))
};

var modelClassSchemaValidator = joi.object().keys({
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
        throw new ValidationError(`${name} ${errorDetail.message}${path}`);
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

    /** if the property config is a string, convert it into a valid config **/
    _.forOwn(properties, (propConfig, propName) => {
        if (typeof propConfig === 'string') {
            propConfig = {type: propConfig};
        }
        if (propConfig.type === 'array') {
            if (!propConfig.items) {
                throw new ValidationError(`${name} if property's type is "array" then "items" should be specified (properties.${propName})`);
            }

            if (typeof propConfig.items === 'string') {
                propConfig.items = {type: propConfig.items};
            }
        }
        properties[propName] = propConfig;
    });


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
        _archimedesModel: true,
        // mixins: (function() {
        //     return mixins;
        // })(),
        properties: new function() {
            return properties;
        },
        methods: new function() {
            return methods;
        },
        statics: new function() {
            return staticMethods;
        },
        create: function(pojo) {
            return _.assign({}, modelInstance(db, this, pojo), methods);
        },
        find: function() {
            console.log('find');
        }
    };


    // let extendsFrom = mixins.map(parentName => {
    //     console.log('iiii', parentName);
    //     return db.schemas[parentName];
    // });
    // console.log('-----', name, extendsFrom);

    var modelSchema = new ModelSchema(inner);

    return _.assign({schema: modelSchema}, inner, staticMethods);
};

export default modelFactory;

