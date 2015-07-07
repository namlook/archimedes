
/** TODO put this in archimedes **/

import _ from 'lodash';
import joi from 'joi';

import ModelSchemaProperty from './model-schema-property';
// import ModelFixture from './model-fixture';


export default class ModelSchema {
    constructor(modelClass) {
        this._modelClass = modelClass;
        this.name = modelClass.name;
        this.db = modelClass.db;
        this._properties = {};
        _.forOwn(this._modelClass.properties, (_propConfig, _propName) => {
            this._properties[_propName] = new ModelSchemaProperty(_propName, _propConfig, this);
        });
        // this.fixtures = new ModelFixture(this);
    }

    getProperty(propertyName) {
        if (_.contains(propertyName, '.')) {
            let relation = this._properties[propertyName.split('.')[0]];
            let relationSchema = this.db[relation.type].schema;
            let relationPropertyName = propertyName.split('.').slice(1).join('.');
            return relationSchema.getProperty(relationPropertyName);
        }

        return this._properties[propertyName];
    }

    get properties() {
        var properties = [];
        Object.keys(this._modelClass.properties).forEach((propertyName) => {
            properties.push(this.getProperty(propertyName));
        });
        return properties;
    }

    hasProperty(propertyName) {
        return !!this.getProperty(propertyName);
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