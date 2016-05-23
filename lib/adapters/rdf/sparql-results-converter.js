'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _rdfUtils = require('./rdf-utils');

var _rdfUtils2 = _interopRequireDefault(_rdfUtils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function main(db, modelName, _query) {
    /** don't work directly on the query **/
    var query = _lodash2.default.cloneDeep(_query);

    var rdfUtils = (0, _rdfUtils2.default)(db);
    var internals = {};

    var fieldProperties = _lodash2.default.toPairs(query.field).map(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var fieldName = _ref2[0];
        var _fieldInfos = _ref2[1];

        var isArray = _lodash2.default.isArray(_fieldInfos);
        var fieldInfos = isArray && _fieldInfos[0] || _fieldInfos;

        if (_lodash2.default.isString(fieldInfos)) {
            fieldInfos = { $property: fieldInfos };
        }

        var propertyName = fieldInfos.$property;

        var optional = _lodash2.default.includes(propertyName, '?');
        if (optional) {
            propertyName = propertyName.split('?').join('');
        }

        if (_lodash2.default.endsWith(propertyName, '._id')) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }

        return {
            fieldName: fieldName,
            propertyName: propertyName,
            array: isArray,
            fields: fieldInfos.$fields,
            propertyRaw: fieldInfos.$property.split('?').join('')
        };
    });

    var aggregationProperties = _lodash2.default.toPairs(query.aggregate).map(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 2);

        var fieldName = _ref4[0];
        var _aggregationInfos = _ref4[1];

        var aggregationInfos = _aggregationInfos;
        if (!aggregationInfos.$aggregator) {
            var _$toPairs$ = _slicedToArray(_lodash2.default.toPairs(aggregationInfos)[0], 2);

            var _aggregator = _$toPairs$[0];
            var _propertyName = _$toPairs$[1];

            var _aggregator2 = _aggregator.slice(1);
            aggregationInfos = {
                $aggregator: _aggregator2,
                $property: _propertyName
            };
        } else if (!aggregationInfos.$property) {
            var _aggregator3 = aggregationInfos.$aggregator;
            if (_aggregator3 === 'count') {
                aggregationInfos.$property = true;
            } else if (_aggregator3 === 'array' && aggregationInfos.$fields) {
                var _propertyName2 = _lodash2.default.values(aggregationInfos.$fields)[0].split('.')[0];
                aggregationInfos.$property = _propertyName2;
            }
        }

        if (aggregationInfos.$property === true) {
            aggregationInfos.$property = '_id';
        }

        var propertyName = aggregationInfos.$property;
        var aggregator = aggregationInfos.$aggregator.toLowerCase();

        var optional = _lodash2.default.includes(propertyName, '?');
        if (optional) {
            propertyName = propertyName.split('?').join('');
        }

        if (_lodash2.default.endsWith(propertyName, '._id')) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }

        return {
            fieldName: fieldName,
            propertyName: propertyName,
            aggregator: aggregator,
            array: aggregator === 'array',
            fields: aggregationInfos.$fields,
            propertyRaw: aggregationInfos.$property.split('?').join('')
        };
    });

    internals.PROPERTIES = fieldProperties.concat(aggregationProperties);

    internals.PROPERTIES_BY_FIELDNAME = _lodash2.default.keyBy(internals.PROPERTIES, 'fieldName');

    internals.SORTED_FIELDS = _lodash2.default.keyBy(_lodash2.default.get(query, 'sort', []).map(function (_fieldName) {
        var descOrder = _lodash2.default.startsWith(_fieldName, '-');
        var fieldName = descOrder ? _fieldName.slice(1) : _fieldName;
        var order = descOrder ? 'desc' : 'asc';
        return { fieldName: fieldName, order: order };
    }), 'fieldName');

    // console.log('PROPERTIES>', internals.PROPERTIES);
    // console.log('PROPERTIES_BY_FIELDNAME>', internals.PROPERTIES_BY_FIELDNAME);

    internals._decodeURIValue = function (_fieldName, iriValue, parent) {
        if (_lodash2.default.isPlainObject(iriValue)) {
            var decodedPairs = _lodash2.default.toPairs(iriValue).map(function (pair) {
                return [pair[0], internals._decodeURIValue(pair[0], pair[1], _fieldName)];
            });
            return _lodash2.default.fromPairs(decodedPairs);
        }

        var decodedValue = decodeURIComponent(iriValue);

        var propertyRaw = void 0;
        var propertyName = void 0;
        if (parent) {
            var propInfos = internals.PROPERTIES_BY_FIELDNAME[parent];
            if (propInfos.fields) {
                propertyRaw = propInfos.fields[_fieldName];

                /** process embeded field's values in object **/
                if (_lodash2.default.endsWith(propertyRaw, '._id')) {
                    propertyName = propertyRaw.split('._id')[0];
                } else if (_lodash2.default.endsWith(propertyRaw, '._type')) {
                    return db.rdfClasses2ModelNameMapping[decodedValue];
                } else {
                    propertyName = propertyRaw;
                }
            } else {
                propertyRaw = propInfos[_fieldName];
                propertyName = propertyRaw;
            }
        } else {
            var _propInfos = internals.PROPERTIES_BY_FIELDNAME[_fieldName];
            propertyRaw = _propInfos.propertyRaw;
            propertyName = _propInfos.propertyName;
        }

        if (_lodash2.default.endsWith(propertyRaw, '._id')) {
            propertyName = propertyName.split('?').join('');
            var property = db[modelName].schema.getProperty(propertyName);
            return rdfUtils.rdfURI2id(property.type, decodedValue);
        }

        return decodedValue;
    };

    internals.rdfValuesConvertor = function (fieldName) {
        return {
            number: parseFloat,
            date: function date(value) {
                return new Date(value);
            },
            boolean: function boolean(value) {
                return (0, _lodash2.default)(['true', '1', 1, 'yes']).includes(value);
            },
            string: function string(_value) {
                var propertyInfos = internals.PROPERTIES_BY_FIELDNAME[fieldName];
                var propertyName = propertyInfos.propertyName;
                var value = _value;
                if (propertyInfos.array) {
                    (function () {
                        value = JSON.parse(value).map(function (val) {
                            return internals._decodeURIValue(fieldName, val);
                        });
                        value = _lodash2.default.compact(value);

                        var property = db[modelName].schema.getProperty(propertyName);

                        /** if the field is a relation, convert the rdf iri into the _id **/
                        value = property.isRelation() ? value.map(function (val) {
                            return _lodash2.default.isString(val) ? rdfUtils.rdfURI2id(property.type, val) : val;
                        }) : value;

                        /** always sort the array **/
                        value = _lodash2.default.sortBy(value);
                        if (property.isRelation() && value.length && value[0]._id) {
                            value = _lodash2.default.sortBy(value, '_id');
                        }

                        var sortOrder = _lodash2.default.get(internals.SORTED_FIELDS, fieldName + '.order');
                        if (sortOrder === 'desc') {
                            value = _lodash2.default.reverse(value);
                        }
                    })();
                }

                return value;
            },
            iri: function iri(value) {
                var propertyInfos = internals.PROPERTIES_BY_FIELDNAME[fieldName];
                var propertyName = propertyInfos.propertyName;

                if (_lodash2.default.endsWith(propertyName, '._type')) {
                    return db.rdfClasses2ModelNameMapping[value];
                }

                var property = db[modelName].schema.getProperty(propertyName);
                return rdfUtils.rdfURI2id(property.type, value);
            }
        };
    };

    internals.buildValueFromRdf = function (fieldName, rdfInfo) {
        var convertor = internals.rdfValuesConvertor(fieldName);
        var datatype = rdfInfo.type === 'literal' ? rdfInfo.datatype : 'iri';

        var valueType = void 0;
        if (!datatype) {
            valueType = 'string';
        } else if (datatype === 'iri') {
            valueType = 'iri';
        } else {
            valueType = rdfUtils.RDF_DATATYPES[datatype];
        }

        return convertor[valueType](rdfInfo.value);
    };

    return {
        convert: function convert(item) {
            var findFieldNameFromProperty = function findFieldNameFromProperty(propertyName) {
                var propInfo = _lodash2.default.find(internals.PROPERTIES, function (o) {
                    return o.propertyName === propertyName && !o.aggregator;
                });
                return propInfo ? propInfo.fieldName : null;
            };

            var _idFieldName = findFieldNameFromProperty('_id');
            var _typeFieldName = findFieldNameFromProperty('_type');

            var doc = (0, _lodash2.default)(item).toPairs().map(function (_ref5) {
                var _ref6 = _slicedToArray(_ref5, 2);

                var fieldName = _ref6[0];
                var rdfInfo = _ref6[1];

                if (fieldName === _idFieldName) {
                    var uri = rdfInfo.value;
                    return [_idFieldName, rdfUtils.rdfURI2id(modelName, uri)];
                }

                if (fieldName === _typeFieldName) {
                    var typeUri = item[_typeFieldName].value;
                    var typeValue = db.rdfClasses2ModelNameMapping[typeUri];
                    return [_typeFieldName, typeValue];
                }

                var newFieldName = fieldName.split(rdfUtils.RELATION_SEPARATOR).join('.');
                var value = internals.buildValueFromRdf(newFieldName, rdfInfo);

                if (value === '') {
                    return undefined;
                }

                return [newFieldName, value];
            }).compact().fromPairs().value();

            var unflatten = function unflatten(o) {
                return _lodash2.default.zipObjectDeep(_lodash2.default.keys(o), _lodash2.default.values(o));
            };

            doc = unflatten(doc);
            return _lodash2.default.omitBy(doc, function (o) {
                return _lodash2.default.isArray(o) && _lodash2.default.isEmpty(o);
            });
        }
    };
};