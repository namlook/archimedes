
import _ from 'lodash';
import joi from 'joi';
import {ValidationError} from './errors';

var allowedOperators = [
    '$eq',
    '$lt',
    '$lte',
    '$gt',
    '$gte',
    '$regex',
    '$iregex',
    '$year',
    '$month',
    '$day',
    '$ne',
    '$in',
    '$nin',
    '$all',
    '$nall',
    '$exists'
];

// var arrayOperators = ['$all', '$nall', '$in', '$nin'];

var operatorValidator = joi.object().keys({
    $eq: joi.any(),
    $gt: joi.alternatives().try(joi.number(), joi.date()),
    $lt: joi.alternatives().try(joi.number(), joi.date()),
    $gte: joi.alternatives().try(joi.number(), joi.date()),
    $lte: joi.alternatives().try(joi.number(), joi.date()),
    $regex: joi.string(),
    $iregex: joi.string(),
    $ne: joi.any(),
    $in: joi.array(joi.any()).min(1),
    $nin: joi.array(joi.any()).min(1),
    $all: joi.array(joi.any()).min(1),
    $nall: joi.array(joi.any()).min(1),
    $exists: joi.boolean(),

    // to remove later ?
    $year: joi.number(),
    $month: joi.number(),
    $day: joi.number()
}).unknown(true);



class QueryValidator {
    constructor(modelSchema) {
        this._modelSchema = modelSchema;
        this._db = modelSchema.db;
        this.errors = [];
    }

    /**
     * Returns true if the property is present in other models (via mixin)
     *
     * exemple for the reversed property 'contents.isPublish' of Author:
     *   'contents' target the model Content but 'isPublished' is defined
     *   in BlogPost model. But Content is a mixin of BlogPost then return true
     *
     * @params {string} propertyName
     * returns a boolean
     */
    // __isInheritedPropertyName(propertyName) {
    //     console.log('=====', this._modelSchema.name, '(', propertyName, ')=====');
    //     let models = _.values(this._db.registeredModels);
    //     let inheritedProperties = models.map((model) => {
    //         if (_.includes(model.mixinsChain, this._modelSchema.name)) {
    //             return this._db[model.name].schema.getProperty(propertyName);
    //         }
    //     });
    //     console.log('$$$', _.flatten(_.compact(inheritedProperties)).map((o)=> o && o.modelSchema.name));
    //     return !!_.compact(inheritedProperties).length;
    // }

    _validateValue(value, propertyName, operator) {
        if (operator) {
            if (!_.includes(allowedOperators, operator)) {
                this.errors.push({
                    message: `unknown operator "${operator}"`,
                    path: propertyName
                });
            }
        }

        if (propertyName[0] === '_') {
            return value;
        }


        var property = this._modelSchema.getProperty(propertyName);

        if (!property) {
            this.errors.push({
                message: `unknown property "${propertyName}" on model "${this._modelSchema.name}"`,
                path: propertyName
            });
            return null;
        } else if (_.isArray(property)) {
            return value;
        }

        var castedValue;
        if (_.isArray(value)) {
            castedValue = [];
            var validation;
            value.forEach((val) => {
                validation = property.validate(val);
                if (validation.error) {
                    validation.error.details.forEach((detail) => {
                        this.errors.push(detail);
                    });
                } else {
                    castedValue.push(validation.value);
                }
            });
        } else if (operator === '$exists') {
            castedValue = value;
        } else {
            validation = property.validate(value);
            if (validation.error) {
                validation.error.details.forEach((detail) => {
                    this.errors.push(detail);
                });
            } else {
                castedValue = validation.value;
            }
        }
        return castedValue;
    }

    validate(query) {
        var filter = {};

        _.forOwn(query, (value, propertyName) => {

            /**
             * allow to omit '_id' where querying a relation.
             *
             * In the following example, the two queries are the same:
             *
             *      db.User.find({'author._id': 'joe'});
             *      db.User.find({'author': 'joe'});
             */
            if (!_.endsWith(propertyName, '_id')) {
                let property = this._modelSchema.getProperty(propertyName);
                if (property && property.isRelation() && !_.isObject(value)) {
                    propertyName = `${propertyName}._id`;
                }
            }

            if (_.includes(propertyName, '.')) {
                let relationName = propertyName.split('.')[0];
                let propRelation = this._modelSchema.getProperty(relationName);
                if (!propRelation) {
                    this.errors.push({
                        path: `${relationName}`,
                        message: `unknown property "${relationName}" on model "${this._modelSchema.name}"`
                    });
                    return;
                // } else if (_.isArray(propRelation)) {
                //     filter[propertyName] = value;
                //     return;
                }

                if (!propRelation.isRelation()) {
                    throw new ValidationError('malformed query', `cannot reach ${propertyName} on ${this._modelSchema.name}: ${propRelation.name} is not a relation`);
                }

                let relationValidator = new QueryValidator(this._db[propRelation.type].schema);
                let relationPropertyName = propertyName.split('.').slice(1).join('.');
                let relfilter = relationValidator.validate({[relationPropertyName]: value});
                _.forOwn(relfilter, (relValue, relName) => {
                    filter[`${relationName}.${relName}`] = relValue;
                });
                this.errors = this.errors.concat(relationValidator.errors);

            } else if (_.isObject(value) && !_.isDate(value)) {
                let validation = joi.validate(value, operatorValidator);
                if (validation.error) {
                    this.errors.push(validation.error);
                }
                _.forOwn(validation.value, (val, operator) => {
                    _.set(filter, `${propertyName}.${operator}`, this._validateValue(val, propertyName, operator));
                });

            } else {
                _.set(filter, propertyName, this._validateValue(value, propertyName));
            }
        });

        return filter;
    }
}

export default function(modelSchema, query) {
    let validator = new QueryValidator(modelSchema);
    let value = validator.validate(query);
    let error = validator.errors;
    if (error.length) {
        return {error: error};
    }
    return {value};
}
