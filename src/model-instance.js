
import _ from 'lodash';
import {ValidationError} from './errors';

export default function(db, modelClass, attrs) {

    attrs = attrs || {};
    attrs._type = modelClass.name;

    var internals = {
        pendingOperations: [],
        attrs: attrs
    };

    return {
        _archimedesModelInstance: true,
        Model: modelClass,
        _type: modelClass.name,
        db: db,

        save() {
            return new Promise((resolve, reject) => {
                if (!this._id) {
                    db.sync(this._type, this.attrs()).then((pojo) => {
                        let modelInstance = this.Model.wrap(pojo);
                        this._id = pojo._id;
                        this.set('_id', pojo._id);
                        this.clearPending();
                        return resolve(modelInstance);
                    }).catch(reject);
                } else {
                    db.update(
                        this._type,
                        this._id,
                        internals.pendingOperations
                    ).then((pojo) => {
                        let modelInstance = this.Model.wrap(pojo);
                        this.clearPending();
                        return resolve(modelInstance);
                    }).catch(reject);
                }
            });
        },


        delete() {
            return new Error('not implemented');
        },


        // get: // use _.partial and _get ?
        /**
         * Returns the property value
         *
         * @param {string} name - the property name
         * @returns the property value
         */
        get(name) {
            return _.get(internals.attrs, name);
        },


        // set: // use _.partial and _.set ?
        /**
         * Sets the property value
         *
         * @param {string} name - the property name
         * @param {AnyLike} value - the property value
         * @returns this
         */
        set(name, value) {
            internals.pendingOperations.push({operator: 'set', property: name, value: value});
            _.set(internals.attrs, name, value);
            return this;
        },


        /**
         * Delete a property value
         *
         * @param {string} name - the property name
         * @returns this
         */
        unset(name) {
            internals.pendingOperations.push({operator: 'unset', property: name});
            delete internals.attrs[name];
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

            let propValues = internals.attrs[name] || [];

            if (!_.isArray(values)) {
                values = [values];
            }

            values = _.flatten(values);

            internals.pendingOperations.push({operator: 'push', property: name, value: values});


            internals.attrs[name] = _.uniq(propValues.concat(values));
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

            internals.pendingOperations.push({operator: 'pull', property: name, value: values});

            internals.attrs[name] = _.without(propValues, ...values);

            if (internals.attrs[name].length === 0) {
                this.unset(name);
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
            return new Promise((resolve, reject) => {
                let {error, value} = this.Model.schema.validate(internals.attrs);
                if (error) {
                    return reject(new ValidationError(error, error));
                }
                return resolve(value);
            });
        },


        attrs() {
            return internals.attrs;
        },

        pending() {
            return internals.pendingOperations;
        },

        clearPending() {
            internals.pendingOperations = [];
        }
    };
}