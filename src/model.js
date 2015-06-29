
import _ from 'lodash';
import joi from 'joi';
import modelInstance from './model-instance';
import {ValidationError} from './errors';


var modelSchemaValidator = joi.object().keys({
    mixins: joi.array(joi.string()),
    properties: joi.object(),
    methods: joi.object(),
    statics: joi.object()
});


var modelFactory = function(db, name, modelSchema) {

    var {error, value: schema} = joi.validate(modelSchema, modelSchemaValidator);

    if (error) {
        throw new ValidationError(`${name} ${error}`);
    }

    schema.mixins = schema.mixins || [];

    let mixins = schema.mixins.map(mixinName => {
        if (!db.modelSchemas[mixinName]) {
            throw new ValidationError(`${name}: unknown mixin "${mixinName}"`);
        }
        return modelFactory(db, mixinName, db.modelSchemas[mixinName]);
    });

    mixins.push(_.omit(schema, 'mixins'));

    var properties = mixins.map(mixin => {
        // if (parent.__archimedesModel) {
            // return parent.properties;
        // } else {
            return mixin.properties;
        // }
    });
    properties = _.assign({}, ..._.compact(properties));

    var methods = mixins.map(mixin => {
        return mixin.methods;
    });
    methods = _.assign({}, ..._.compact(methods));

    var staticMethods = mixins.map(mixin => {
        return mixin.statics;
    });
    staticMethods = _.assign({}, ..._.compact(staticMethods));

    var inner = {
        name: name,
        db: db,
        _archimedesModel: true,
        // mixins: (function() {
        //     return mixins;
        // })(),
        properties: (function() {
            return properties;
        })(),
        methods: (function() {
            return methods;
        })(),
        statics: (function() {
            return staticMethods;
        })(),
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
    return _.assign(inner, staticMethods);
};

export default modelFactory;

