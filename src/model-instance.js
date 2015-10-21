
import _ from 'lodash';
import csv from 'csv';

import Promise from 'bluebird';

export default function(db, modelClass, attrs) {

    attrs = attrs || {};
    attrs._type = modelClass.name;

    var internals = {
        pendingOperations: [],
        attrs: attrs
    };

    let instance = {
        _archimedesModelInstance: true,
        Model: modelClass,
        _type: modelClass.name,
        db: db,


        /**
         * Store the instance into the database.
         * If the instance is already saved (ie has an id), then
         * an update is performed, otherwise a sync is fired.
         *
         * @returns a promise which resolve into the saved document
         */
        save() {
            return new Promise((resolve, reject) => {
                if (!this._id) {
                    db.sync(this._type, this.attrs()).then((pojo) => {
                        let modelInstance = this.Model.wrap(pojo);
                        this._id = pojo._id;
                        _.set(internals.attrs, '_id', pojo._id);
                        this.clearPending();
                        return resolve(modelInstance);
                    }).catch(reject);
                } else {
                    db.update(
                        this._type,
                        this._id,
                        internals.pendingOperations
                    ).then(() => {
                        this.clearPending();
                        return resolve(this);
                    }).catch(reject);
                }
            });
        },


        delete() {
            return new Promise((resolve, reject) => {
                if (!this._id) {
                    return reject(new Error("Can't delete a not saved model instance"));
                }
                return resolve(db.delete(this._type, this._id));
            });
        },


        /**
         * Returns the property value
         *
         * @param {string} name - the property name
         * @returns the property value
         */
        get(name) {
            return _.get(internals.attrs, name);
        },


        /**
         * Sets the property value
         *
         * @param {string} name - the property name
         * @param {AnyLike} value - the property value
         * @returns this
         */
        set(name, value) {
            let oldValue = this.get(name);

            let property = this.Model.schema.getProperty(name);

            // if an unknown property name is passed, let's add it anyway.
            // the database.validate() method will take care of the rest
            if (!property) {
                internals.pendingOperations.push({operator: 'set', property: name, value: value});
                _.set(internals.attrs, name, value);
                return this;
            }

            // if the property is an array, make a full replacement
            // by using the push/pull operators
            if (property.isArray()) {

                if (oldValue != null) {
                    this.pull(name, oldValue);
                }
                this.push(name, value);

            } else {
                let {value: validatedValue} = property.validate(value);

                if (_.isEqual(oldValue, validatedValue)) {
                    return this;
                }

                if (oldValue != null) {
                    internals.pendingOperations.push({operator: 'unset', property: name, value: oldValue});
                }
                internals.pendingOperations.push({operator: 'set', property: name, value: value});
                _.set(internals.attrs, name, value);

            }

            return this;
        },


        /**
         * Delete a property value
         *
         * @param {string} name - the property name
         * @returns this
         */
        unset(name) {
            let value = this.get(name);

            // if the property is an array, unset via the pull operator
            let property = this.Model.schema.getProperty(name);
            if (property.isArray()) {
                this.pull(name, value);
            } else {
                internals.pendingOperations.push({operator: 'unset', property: name, value: value});
                delete internals.attrs[name];
            }

            return this;
        },


        /**
         * Add a value to a property array.
         * If the property value is undefined, then it creates an array.
         * If the value is null, undefined or an empty string, do nothing.
         *
         * @param {string} name - the property name
         * @param {AnyLike|array} values - a value or an array of values
         * @returns this
         */
        push(name, values) {
            if (values == null || values === '') {
                return this;
            }

            if (!_.isArray(values)) {
                values = [values];
            }

            values = _.flatten(values);

            let property = this.Model.schema.getProperty(name);
            values = property.validate(values).value;


            let oldValues = internals.attrs[name] || [];
            let acceptedValues = [];

            let isNewValue = function(value) {
                return !_.findLast(oldValues, (item) => {
                    return _.isEqual(item, value);
                });
            };

            for (let i = 0; i < values.length; i++) {

                /**
                 * Only append value that don't already exists
                 */
                if (isNewValue(values[i])) {
                    internals.pendingOperations.push({operator: 'push', property: name, value: values[i]});
                    acceptedValues.push(values[i]);
                }
            }

            let uniqValues = _.uniq(oldValues.concat(acceptedValues), (item) => {
                return JSON.stringify(item);
            });

            internals.attrs[name] = _.sortBy(uniqValues);

            return this;
        },


        /**
         * Remove a value to a property array.
         * If after removing the value, the array is empty, then unset the
         * property value
         *
         * @param {string} name - the property name
         * @param {AnyLike|array} values - a value or an array of values
         * @returns this
         */
        pull(name, values) {
            let propValues = internals.attrs[name] || [];
            if (!_.isArray(values)) {
                values = [values];
            }

            for (let i = 0; i < values.length; i++) {
                internals.pendingOperations.push({operator: 'pull', property: name, value: values[i]});
            }

            internals.attrs[name] = _.sortBy(_.without(propValues, ...values));

            if (internals.attrs[name].length === 0) {
                // don't use unset() here, just remove the attribute from the object
                delete internals.attrs[name];
            }


            return this;
        },


        /**
         * Validates the model's attributes against the model schema
         *
         * @returns a promise which resolve to a pojo with the correct
         *     (casted if needed) values.
         */
        validate() {
            return db.validate(this._type, internals.attrs);
        },


        attrs() {
            return internals.attrs;
        },

        toJSON() {
            return JSON.stringify(this.attrs());
        },

        toCsv(options) {
            return new Promise((resolve, reject) => {
                options = options || {};
                let delimiter = options.delimiter || ',';
                let fields = options.fields;

                let properties;
                if (fields) {
                    properties = [];
                    for (let i = 0; i < fields.length; i++) {
                        let propertyName = fields[i];
                        let property = this.Model.schema.getProperty(propertyName);
                        if (!property) {
                            reject(new Error(`fields: unknown property "${propertyName}"`));
                        }
                        properties.push(property);
                    }
                } else {
                    properties = this.Model.schema.properties;
                }

                properties = _.sortBy(properties, 'name');

                let values = properties.map((property) => {
                    let value = this.get(property.name);

                    if (!_.isArray(value)) {
                        if (value != null) {
                            value = [value];
                        } else {
                            value = [];
                        }
                    }

                    if (property.isRelation()) {
                        value = value.map((v) => v._id);
                    }

                    if (property.type === 'date') {
                        value = value.map((d) => d.toUTCString());
                    }

                    return value.join('|');
                });

                values.unshift(this.get('_type'));
                values.unshift(this.get('_id'));

                let csvOptions = {delimiter: delimiter, eof: false};

                csv.stringify([values], csvOptions, (err, output) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve(output);
                });

            });
        },

        /**
         * Returns the model instance as into valid json api format
         *
         * @returns {object}
         */
        toJsonApi(baseUri, include) {

            let attributes = {};
            let relationships = {};

            if (_.isArray(include)) {
                include = {properties: true, included: include};
            }

            let {properties: includedProperties, included} = include || {};

            if (includedProperties === 1) {
                includedProperties = true;
            }

            if (includedProperties && !_.isArray(includedProperties) && !_.isBoolean(includedProperties)) {
                includedProperties = [includedProperties];
            }

            if (included && !_.isArray(included)) {
                throw new Error('toJsonApi(): included should be an array');
            }

            this.Model.schema.properties.forEach((property) => {
                let value = this.get(property.name);

                let shouldBeIncluded = (
                    _.isBoolean(includedProperties) &&
                    includedProperties) || _.includes(includedProperties, property.name
                );

                if (property.isRelation()) {
                    if (property.isArray()) {
                        if (value && !_.isEmpty(value)) {
                            value = value.map((o) => {
                                let rel = {id: o._id, type: o._type};
                                if (shouldBeIncluded) {
                                    included.push(rel);
                                }
                                return rel;
                            });
                        } else {
                            value = null;
                        }
                    } else if (value) {
                        value = {id: value._id, type: value._type};
                        if (shouldBeIncluded) {
                            included.push(value);
                        }
                    }

                    if (value != null) {
                        let relationshipsData = {
                            data: value
                        };

                        if (baseUri) {
                            relationshipsData.links = {
                                self: `${baseUri}/relationships/${property.name}`,
                                related: `${baseUri}/${property.name}`
                            };
                        }

                        relationships[property.name] = relationshipsData;
                    }
                } else {
                    if (value != null) {
                        attributes[property.name] = value;
                    }
                }

            });

            let jsonApiData = {
                data: {
                    type: modelClass.name
                }
            };

            if (this.get('_id')) {
                jsonApiData.data.id = this.get('_id');
            }

            if (!_.isEmpty(attributes)) {
                jsonApiData.data.attributes = attributes;
            }

            if (!_.isEmpty(relationships)) {
                jsonApiData.data.relationships = relationships;
            }

            if (baseUri) {
                jsonApiData.data.links = {
                    self: baseUri
                };
            }

            if (included && included.length) {
                let uniqIncluded = _.uniq(included, (o) => `${o.type}/${o.id}`);
                included.length = 0; // clear the array without loosing the reference
                uniqIncluded.forEach((item) => {
                    included.push(item);
                });
            }

            return jsonApiData;
        },

        /**
         * Returns all pending operations. An operations is represented as:
         *
         *  {
         *      operator: <string>, // set/unset/pull/push
         *      property: <string>, // the propertyName
         *      value: <any>, // the value of the operation
         *  }
         *
         * @returns an array of all pending operations
         */
        pending() {
            return internals.pendingOperations;
        },

        /**
         * Clears all pending operations
         *
         * @returns this
         */
        clearPending() {
            internals.pendingOperations = [];
            return this;
        }
    };

    /**
     * Attach the inverse relationships function
     */
    _.forOwn(modelClass.inverseRelationships, (propConfig, propName) => {
        instance[propName] = function(query, options) {

            query = query || {};
            options = options || {};

            return new Promise((resolve, reject) => {
                if (!this._id) {
                    return reject(new Error('cannot fetch relations from an unsaved instance'));
                }

                query[`${propConfig.property}._id`] = this._id;

                return resolve(db[propConfig.type].find(query, options));
            });
        };
    });

    return instance;
}