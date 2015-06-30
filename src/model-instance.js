
import _ from 'lodash';

export default function(db, modelClass, pojo) {

    pojo = pojo || {};

    return {
        _archimedesModelInstance: true,
        Model: modelClass,
        _type: modelClass.name,
        db: db,
        attrs: pojo,


        save: function() {
            this._id = 3;
            db.sync(this._type, this);
        },


        delete: function() {
            db.delete(this._type, this);
        },


        // get: // use _.partial and _get ?
        /**
         * Returns the property value
         *
         * @param {string} name - the property name
         * @returns the property value
         */
        get: function(name) {
            return _.get(this.attrs, name);
        },


        // set: // use _.partial and _.set ?
        /**
         * Sets the property value
         *
         * @param {string} name - the property name
         * @param {AnyLike} value - the property value
         * @returns this
         */
        set: function(name, value) {
            _.set(this.attrs, name, value);
            return this;
        },


        /**
         * Delete a property value
         *
         * @param {string} name - the property name
         * @returns this
         */
        unset: function(name) {
            delete this.attrs[name];
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
        push: function(name, values) {
            if (values == null || values === '') {
                return this;
            }

            let propValues = this.attrs[name] || [];

            if (!_.isArray(values)) {
                values = [values];
            }

            this.attrs[name] = _.uniq(_.flatten(propValues.concat(values)));
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
        pull: function(name, values) {
            let propValues = this.attrs[name] || [];
            if (!_.isArray(values)) {
                values = [values];
            }
            this.attrs[name] = _.without(propValues, ...values);

            if (this.attrs[name].length === 0) {
                this.unset(name);
            }

            return this;
        },


        /**
         * Validates the model's attributes against the model schmea
         *
         * @returns {error: object, value: object} - if no errors are found
         *   error is null. value is the attribute values (casted if needed)
         */
        validate: function() {
            return this.Model.schema.validate(this.attrs);
        }
    };
}