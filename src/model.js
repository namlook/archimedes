
import _ from 'lodash';
import joi from 'joi';
import modelInstance from './model-instance';
import {StructureError} from './errors';
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
            items: joi.alternatives().try(joi.string(), propertyConfigValidator),
            reverse: joi.alternatives().try(joi.string(), joi.object().keys({
                type: joi.string(),
                name: joi.string()
            })),
            abstract: joi.alternatives().try(
                joi.boolean().default(false),
                joi.object().keys({
                    fromReverse: joi.object().keys({
                        type: joi.string(),
                        property: joi.string(),
                        targets: joi.array().items(joi.string())
                    })
                })
            )
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
        throw new StructureError(`${name} ${errorDetail.message}${path}`, error);
    }


    /**
     * process the mixins
     */
    schema.mixins = schema.mixins || [];

    let mixins = schema.mixins.map(mixinName => {
        if (!db.modelSchemas[mixinName]) {
            throw new StructureError(`${name}: unknown mixin "${mixinName}"`);
        }
        return modelFactory(db, mixinName, db.modelSchemas[mixinName]);
    });

    mixins.push(_.omit(schema, 'mixins'));



    /**
     * process mixins chain
     */
    var mixinsChain = _.flatten(mixins.map(mixin => {
        return mixin.mixinsChain;
    }));
    mixinsChain.push(name);



    /**
     * process the properties and aggregate them from mixins
     */
    var properties = mixins.map(mixin => {
        return mixin.properties;
    });
    properties = _.assign({}, ..._.compact(properties));


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
        mixins: mixins,
        mixinsChain: new function() {
            return _.uniq(_.compact(mixinsChain));
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

        // returns the list of model name which are mixed with this
        mixedWith() {
            let results = [];
            _.forOwn(this.db.registeredModels, (model, modelName) => {
                if (_.contains(model.mixinsChain, modelName)) {
                    results.push(modelName);
                }
            });
            return results;
        },

        /**
         * Returns a promise which resolve a list of model instance
         * that match the query
         *
         * @params {?object} query - the query
         * @returns a promise
         */
        find(query, options) {
            return db.find(name, query, options).then((results) => {
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
        },

        groupBy(aggregation, query, options) {
            return db.groupBy(name, aggregation, query, options);
        },

        batchSync(data) {
            return db.batchSync(name, data);
        }
    };

    var modelSchema = new ModelSchema(inner);

    return _.assign({schema: modelSchema}, inner, staticMethods);
};

export default modelFactory;

