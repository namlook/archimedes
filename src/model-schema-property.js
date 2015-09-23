
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
    constructor(name, config, modelSchema, isReversed) {
        if (isReversed) {
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

    isReversed() {
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
     * Return the reversed properties if 'reverse' is specified in
     * the property config. Returns null otherwise.
     *
     *  Example with Comment and User:
     *
     *  Comment: {
     *     properties: {
     *          author: {
     *              type: 'User',
     *        }
     *     }
     *  }
     *
     *   User: {
     *       inverseRelationships: {
     *           comments: {
     *               type: 'Comment',
     *               property: 'author'
     *           }
     *       }
     *   }
     *
     *
     *  `Comment.schema.getProperty('author').reversedProperty()`
     *
     *     will returns the `User.comments` property
     *
     *
     * @return a reversed (abstract) property if the property
     */
    reversedProperty() {
        let db = this.modelSchema.db;
        let targetModelName = this.modelSchema.name;
        if (this.isRelation()) {
            let inverseRelationships = db[this.type].schema.inverseRelationships;
            for (let i = 0; i < inverseRelationships.length; i++) {
                let invRel = inverseRelationships[i];
                let invRelProp = invRel.config.abstract.fromReverse.property;
                if (invRel.type === targetModelName && invRelProp === this.name) {
                    return db[this.type].schema.getProperty(invRel.name);
                }
            }
        }
    }


    /** returns all properties that match the reversed property
     *
     * @returns an array of properties
     */
    fromReversedProperties() {
        let db = this.modelSchema.db;
        let {property, type} = _.get(this.config, 'abstract.fromReverse', {});
        return db.findProperties(property, type);
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
            relationConstraints = joi.object().keys({
                _id: joi.string().required().label(`${propertyName}._id`),
                _type: joi.string().required().label(`${propertyName}._type`)
            });
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