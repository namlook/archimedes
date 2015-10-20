
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
        this.__buildProperties();
        // this.fixtures = new ModelFixture(this);
    }


    __buildProperties() {
        for(let mixinName of this.modelClass.mixinsChain) {
            let mixinStructure = this.db._modelStructures[mixinName];

            let mixinProperties = mixinStructure.properties || {};
            for (let propName of Object.keys(mixinProperties)) {
                let property = new ModelSchemaProperty(
                    propName, mixinProperties[propName], this
                );
                this._properties[propName] = property;
            }

            let mixinRelationships = mixinStructure.inverseRelationships || {};
            for (let propName of Object.keys(mixinRelationships)) {
                let property = new ModelSchemaProperty(
                    propName, mixinRelationships[propName], this, true
                );
                this._inverseRelationships[propName] = property;
            }
        }
    }


    getProperty(propertyName) {
        let property;

        /** if the property name is a relation **/
        if (_.contains(propertyName, '.')) {

            let relationName = propertyName.split('.')[0];
            let relation = this.getProperty(relationName);
            let relationPropertyName = propertyName.split('.').slice(1).join('.');

            // if (_.isArray(relation) && relation.length) {
            //     relation = relation[0];
            // } else {
            //     return undefined;
            // }


            // if (relation.isInverseRelationship()) {
                // relation = relation.getPropertyFromInverseRelationship();
            // }
                // let reversedProperties = relation.getPropertiesFromInverseRelationship();
                // reversedProperties = _.flatten(reversedProperties.map((prop) => {
                //     return prop.modelSchema.getProperty(relationPropertyName);
                // }));

                // reversedProperties = _.compact(_.flatten(reversedProperties));

                // return _.uniq(reversedProperties, function(item) {
                //     return `${item.modelSchema.name}.${item.name}`;
                // });

            // } else {
            if (relation) {
                let relationSchema = this.db[relation.type].schema;
                property = relationSchema.getProperty(relationPropertyName);
            }


            // }

        } else {
            property = this._properties[propertyName];

            if (!property) {
                property = this._inverseRelationships[propertyName];
            }

            /*
             * if there is no property, maybe the property asked
             * is defined on another mixin. Let's find a list of potential
             * list of model Name where the property might by defined.
             */
            if (!property) {
                property = this.db.findProperties(propertyName, this.modelClass.mixinsChain);
            }
        }

        return property;
    }

    get properties() {
        return _.values(this._properties);
    }

    get inverseRelationships() {
        return _.values(this._inverseRelationships);
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

        joi.validate(pojo, this._validator, options, function(error, value) {
            if (error) {
                return callback(error.details);
            }
            return callback(null, value);
        });
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