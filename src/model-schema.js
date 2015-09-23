
/** TODO put this in archimedes **/

import _ from 'lodash';
import joi from 'joi';

import ModelSchemaProperty from './model-schema-property';
// import ModelFixture from './model-fixture';


export default class ModelSchema {
    constructor(modelClass) {
        this.modelClass = modelClass;
        this.name = modelClass.name;
        this.db = modelClass.db;
        this._properties = {};
        this._inverseRelationships = {};
        _.forOwn(this.modelClass.properties, (_propConfig, _propName) => {
            this._properties[_propName] = new ModelSchemaProperty(_propName, _propConfig, this);
        });
        _.forOwn(this.modelClass.inverseRelationships, (_propConfig, _propName) => {
            this._inverseRelationships[_propName] = new ModelSchemaProperty(_propName, _propConfig, this, true);
        });
        // this.fixtures = new ModelFixture(this);
    }

    getProperty(propertyName) {
        let property;

        /** if the property name is a relation **/
        if (_.contains(propertyName, '.')) {

            let relation = this.getProperty(propertyName.split('.')[0]);
            let relationPropertyName = propertyName.split('.').slice(1).join('.');

            if (relation.isReversed()) {
                let reversedProperties = relation.fromReversedProperties();
                reversedProperties = _.flatten(reversedProperties.map((prop) => {
                    return prop.modelSchema.getProperty(relationPropertyName);
                }));

                reversedProperties = _.compact(_.flatten(reversedProperties));

                return _.uniq(reversedProperties, function(item) {
                    return `${item.modelSchema.name}.${item.name}`;
                });

            } else {

                let relationSchema = this.db[relation.type].schema;
                property = relationSchema.getProperty(relationPropertyName);

            }

        } else {
            property = this._properties[propertyName];

            if (!property) {
                property = this._inverseRelationships[propertyName];
            }

            /**
             * if there is no property, maybe the property asked
             * is defined on another mixin. Let's create a list of potential
             * list of model Name where the property might by defined.
             */
            if (!property) {
                let properties = this.db.findProperties(propertyName, this.name);
                if (properties.length) {
                    return properties;
                }
            }
        }

        return property;
    }


    get properties() {
        var properties = [];
        Object.keys(this.modelClass.properties).forEach((propertyName) => {
            properties.push(this.getProperty(propertyName));
        });
        return properties;
    }

    get inverseRelationships() {
        var inverseRelationships = [];
        Object.keys(this.modelClass.inverseRelationships).forEach((propertyName) => {
            inverseRelationships.push(this.getProperty(propertyName));
        });
        return inverseRelationships;
    }

    hasProperty(propertyName) {
        return !!this.getProperty(propertyName);
    }

    /**
     * Returns all properties (inverse or not) that propagate deletion
     *
     * @returns a list of ModelSchemaProperty
     */
    get propagateDeletionProperties() {
        let allProperties = this.properties.concat(this.inverseRelationships);

        let results = allProperties.map((property) => {
            if (property.propagateDeletion()) {
                return property;
            }
        });

        return _.compact(results);
    }

    validate(pojo, options, callback) {
        if (typeof options === 'function' && !callback) {
            callback = options;
            options = {};
        }

        if (!options) {
            options = {};
        }

        if (options.abortEarly == null) {
            options.abortEarly = false;
        }

        if (options.convert == null) {
            options.convert = true;
        }

        if (!callback) {
            let {error, value} = joi.validate(pojo, this._validator, options);

            // if (error) {
                // error = `${error.name}: ${error.details[0].message}`;
            // }
            if (error) {
                error = error.details;
            }

            return {error, value};
        }

        joi.validate(pojo, this._validator, options, callback);
    }

    get _validator() {
        var validator = {};
        _.forOwn(this._properties, (property, propertyName) => {
            validator[propertyName] = property._validator;
        });

        // BIG HACK !!!
        validator._id = joi.string();
        validator._type = joi.string();
        // validator._ref = joi.string();
        // validator._uri = joi.string();
        // validator._class = joi.string();

        return validator;
    }
}