
import _ from 'lodash';
import joi from 'joi';
import {ValidationError} from './errors';

var constraints2joi = function(modelName, propertyName, constraints, joiConstraint=null) {
    if (!joiConstraint) {
        joiConstraint = joi;
    }
    constraints.forEach(function(constraint) {
        if (_.isObject(constraint)) {
            var constraintKeys = Object.keys(constraint);

            if (constraintKeys.length > 1) {
                throw new ValidationError(`${modelName}.${propertyName}: the constraint ${constraint} must a have only one key`);
            }

            var constraintName = constraintKeys[0];

            if (!joiConstraint[constraintName]) {
                throw new ValidationError(`unknown constraint "${constraintName}" for property ${modelName}.${propertyName}`);
            }

            var constraintParams = constraint[constraintName];

            if (!_.isArray(constraintParams)) {
                constraintParams = [constraintParams];
            }

            joiConstraint = joiConstraint[constraintName](...constraintParams);
        } else {
            if (!joiConstraint[constraint]) {
                throw new ValidationError(`unknown constraint "${constraint}" for property ${modelName}.${propertyName}`);
            }
            joiConstraint = joiConstraint[constraint]();
        }
    });
    return joiConstraint;
};

// var constraintsMonkeyPatch = function(validationConfig) {
//     var modelType = validationConfig[0];

//     if (modelType === 'integer') {
//         validationConfig.unshift('number');
//     } else if (modelType === 'float') {
//         validationConfig.shift();
//         validationConfig.unshift('number');
//     } else if (modelType === 'datetime') {
//         validationConfig.shift();
//         validationConfig.unshift('date');
//     }
// };


export default class ModelSchemaProperty {
    constructor(name, config, modelSchema, isInverseRelationship) {
        if (isInverseRelationship) {
            config = {
                type: 'array',
                items: {
                    type: config.type
                },
                abstract: {
                    fromReverse: config
                }
            };
        }

        this.name = name;
        this.config = config;
        this.modelSchema = modelSchema;
    }

    get type() {
        if (this.isArray()) {
            return this.config.items.type;
        }
        return this.config.type;
    }

    get meta() {
        return this.config.meta || {};
    }

    isRelation() {
        return !!this.modelSchema.db[this.type];
    }

    isArray() {
        return this.config.type === 'array';
    }

    isAbstract() {
        return !!this.config.abstract;
    }

    isInverseRelationship() {
        return !!_.get(this.config, 'abstract.fromReverse');
    }

    propagateDeletion() {
        let config = this.config;
        if (this.isAbstract()) {
            config = this.config.abstract.fromReverse;
        }
        return _.get(config, 'propagateDeletion');
    }

    /**
    *   Return the inverse relationships specified in the property config
    *    Note that it will take the mixins in account.
    *
    *    Example with User and Comment which inherits with Content:
    *
    *    Content: {
    *        properties: {
    *            author: {
    *                type: 'User'
    *            }
    *        }
    *    }
    *
    *    Comment: {
    *        mixins: ['Content']
    *    }
    *
    *    User: {
    *        inverseRelationships: {
    *            contents: {
    *                type: 'Content',
    *                property: 'author'
    *            },
    *            comments: {
    *                type: 'Comment',
    *                property: 'author'
    *            }
    *        }
    *    }
    *
    *    let contentAuthor = db.Content.schema.getProperty('author');
    *    let commentAuthor = db.Comment.schema.getProperty('author');
    *
    *    contentAuthor.getInverseRelationshipsFromProperty() =>
    *        will returns an array with the User.contents property
    *
    *    commentAuthor.getInverseRelationshipsFromProperty() =>
    *        because Comment.author is inherited from Content.author, it will returns
    *        an array with the User.contents and User.comments properties
    *
    *
    * @return an array with all inverse relationships
    */
    getInverseRelationshipsFromProperty() {
        let db = this.modelSchema.db;
        let modelMixinsChain = this.modelSchema.modelClass.mixinsChain;

        if (this.isRelation() && !this.isInverseRelationship()) {
            let {inverseRelationships} = db[this.type].schema;

            let results = inverseRelationships.map((invRel) => {
                if (_.includes(modelMixinsChain, invRel.type)) {
                    return invRel;
                }
            });
            return _.compact(results);
        }
    }

    /** returns the property that match the inverse relationship
     *
     * @returns an array of properties
     */
    getPropertyFromInverseRelationship() {
        let db = this.modelSchema.db;
        let {property, type} = _.get(this.config, 'abstract.fromReverse', {});
        return db[type].schema._properties[property];
    }


    get validationConstraints() {
        let validations = this.config.validate || [];
        var baseConstraints = [];
        if (this.isArray() || !this.isRelation()) {
            baseConstraints.push(this.config.type);
        }
        return baseConstraints.concat(validations);
    }

    get itemValidationConstraints() {
        let items = this.config.items || {};
        let validations = items.validate || [];
        var baseConstraints = [];
        if (!this.isRelation() && items.type) {
            baseConstraints.push(items.type);
        }
        return baseConstraints.concat(validations);
    }

    get _validator() {
        var propertyName = this.name;
        let modelName = this.modelSchema.name;
        var constraints;

        var relationConstraints;
        if (this.isRelation()) {
            relationConstraints = joi.alternatives(
                joi.object().keys({
                    _id: joi.string().required().label(`${propertyName}._id`),
                    _type: joi.string().required().label(`${propertyName}._type`)
                }),
                joi.string()
            );
        }

        constraints = constraints2joi(modelName, propertyName, this.validationConstraints);

        if (this.isArray()) {

            var itemsConstraints;
            if (this.isRelation()) {
                itemsConstraints = relationConstraints;
            } else {
                itemsConstraints = constraints2joi(modelName, propertyName, this.itemValidationConstraints);
            }
            constraints = constraints.items(itemsConstraints);

        } else {

            if (this.isRelation()) {
                constraints = relationConstraints;
            }
        }

        return constraints.label(this.name);
    }

    validate(value) {
        return this._validator.validate(value);
    }

    validateItem(value) {
        if (!this.isArray()) {
            throw new Error(`validateItem: the property ${this.name} is not an array`);
        }
        value = [value];
        let {error, value: validatedValue} = this._validator.validate(value);
        value = validatedValue[0];
        return {error, value};
    }

    fixture() {
        var value;
        if (this.isRelation()) {
            return undefined;
        }
        if (this.isArray()) {
            value = [];
            for (let i = 0; i < _.random(1, 8); i++) {
                value.push(this._getFixtureValue());
            }
        } else {
            value = this._getFixtureValue();
        }
        return value;
    }

    _fixtureValue() {
        if (this.config.fixture) {
            return this.config.fixture();
        }

        // generate fixture from type
        var today = new Date();
        var lorem = _.words('Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.');
        var pickInLorem = _.random(0, 40);
        var type2faker = {
            string: lorem.slice(pickInLorem, pickInLorem + _.random(4, 10)).join(' '),
            number: _.random(0, 100, true),
            integer: _.random(0, 100), // TODO REMOVE
            float: _.random(0, 100, true), // TODO REMOVE
            boolean: Boolean(_.random()),
            date: new Date(today.getFullYear(), today.getMonth(), _.random(1, 29)),
            datetime: new Date(today.getFullYear(), today.getMonth(), _.random(1, 29), _.random(1, 23), _.random(1, 59), _.random(1, 59))
        };
        return type2faker[this.type];
    }
}
