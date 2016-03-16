
import _ from 'lodash';

import rdfUtilities from './rdf-utils';

module.exports = function(db, modelName, query) {

    /** don't work directly on the query **/
    query = _.cloneDeep(query);

    const rdfUtils = rdfUtilities(db);
    const internals = {};

    const fieldProperties = _.toPairs(query.field)
        .map(([fieldName, fieldInfos]) => {
            let isArray = _.isArray(fieldInfos);
            fieldInfos = isArray && fieldInfos[0] || fieldInfos;

            if (_.isString(fieldInfos)) {
                fieldInfos = {$property: fieldInfos};
            }

            let propertyName = fieldInfos.$property;

            let optional = _.includes(propertyName, '?');
            if (optional) {
                propertyName = propertyName.split('?').join('');
            }

            if(_.endsWith(propertyName, '._id')) {
                propertyName = propertyName.split('.').slice(0, -1).join('.');
            }

            return {
                fieldName,
                propertyName,
                array: isArray,
                fields: fieldInfos.$fields,
                propertyRaw: fieldInfos.$property.split('?').join('')
            };
        });

    const aggregationProperties =  _.toPairs(query.aggregate)
        .map(([fieldName, aggregationInfos]) => {
            if (!aggregationInfos.$aggregator) {
                let [aggregator, propertyName] = _.toPairs(aggregationInfos)[0];
                aggregator = aggregator.slice(1);
                aggregationInfos = {
                    $aggregator: aggregator,
                    $property: propertyName
                };
            } else if (!aggregationInfos.$property) {
                let aggregator = aggregationInfos.$aggregator;
                if (aggregator === 'count') {
                    aggregationInfos.$property = true;
                } else if (aggregator === 'array' && aggregationInfos.$fields) {
                    let propertyName = _.values(aggregationInfos.$fields)[0].split('.')[0];
                    aggregationInfos.$property = propertyName;
                }
            }


            if (aggregationInfos.$property === true) {
                aggregationInfos.$property = '_id';
            }

            let propertyName = aggregationInfos.$property;
            let aggregator = aggregationInfos.$aggregator.toLowerCase();

            let optional = _.includes(propertyName, '?');
            if (optional) {
                propertyName = propertyName.split('?').join('');
            }

            if(_.endsWith(propertyName, '._id')) {
                propertyName = propertyName.split('.').slice(0, -1).join('.');
            }

            return {
                fieldName,
                propertyName,
                aggregator,
                array: aggregator === 'array',
                fields: aggregationInfos.$fields,
                propertyRaw: aggregationInfos.$property.split('?').join('')
            };
        });

    internals.PROPERTIES = fieldProperties.concat(aggregationProperties);

    internals.PROPERTIES_BY_FIELDNAME = _.keyBy(internals.PROPERTIES, 'fieldName');

    internals.SORTED_FIELDS = _.keyBy(
        _.get(query, 'sort', []).map((fieldName) => {
            let descOrder = _.startsWith(fieldName, '-');
            fieldName = descOrder ? fieldName.slice(1) : fieldName;
            let order = descOrder ? 'desc' : 'asc';
            return { fieldName, order };
        }),
        'fieldName'
    );

    // console.log('PROPERTIES>', internals.PROPERTIES);
    // console.log('PROPERTIES_BY_FIELDNAME>', internals.PROPERTIES_BY_FIELDNAME);

    internals._decodeURIValue = function(_fieldName, iriValue, parent) {
        if (_.isPlainObject(iriValue)) {

            let decodedPairs = _.toPairs(iriValue).map((pair) => {
                return [
                    pair[0],
                    internals._decodeURIValue(pair[0], pair[1], _fieldName)
                ];
            });
            return _.fromPairs(decodedPairs);

        } else {
            let decodedValue = decodeURIComponent(iriValue);

            let propertyRaw, propertyName;
            if (parent) {
                let propInfos = internals.PROPERTIES_BY_FIELDNAME[parent];
                if (propInfos.fields) {
                    propertyRaw = propInfos.fields[_fieldName];

                    /** process embeded field's values in object **/
                    if (_.endsWith(propertyRaw, '._id')) {
                        propertyName = propertyRaw.split('._id')[0];
                    } else if (_.endsWith(propertyRaw, '._type')) {
                        return db.rdfClasses2ModelNameMapping[decodedValue]
                    } else {
                        propertyName = propertyRaw;
                    }

                } else {
                    propertyRaw = propInfos[_fieldName];
                    propertyName = propertyRaw;
                }
            } else {
                let propInfos = internals.PROPERTIES_BY_FIELDNAME[_fieldName];
                propertyRaw = propInfos.propertyRaw;
                propertyName = propInfos.propertyName;
            }

            if (_.endsWith(propertyRaw, '._id')) {
                propertyName = propertyName.split('?').join('');
                const property = db[modelName].schema.getProperty(propertyName);
                return rdfUtils.rdfURI2id(property.type, decodedValue);
            }

            return decodedValue;
        }
    };

    internals.rdfValuesConvertor = function(fieldName){
        return {
            'number': parseFloat,
            'date': (value) => new Date(value),
            'boolean': (value) => _(['true', '1', 1, 'yes']).includes(value),
            'string': function(value) {
                let propertyInfos = internals.PROPERTIES_BY_FIELDNAME[fieldName];
                let propertyName = propertyInfos.propertyName;
                if (propertyInfos.array) {
                    value = JSON.parse(value).map(
                        (val) => internals._decodeURIValue(fieldName, val)
                    );
                    value = _.compact(value);

                    /*** always sort the array ***/
                    let property = db[modelName].schema.getProperty(propertyName);

                    value = _.sortBy(value)
                    if (property.isRelation() && _.isPlainObject(value) && value._id) {
                        value = _.sortBy(value, '_id');
                    }

                    let sortOrder = _.get(internals.SORTED_FIELDS, `${fieldName}.order`);
                    if (sortOrder === 'desc') {
                        value = _.reverse(value);
                    }
                }

                return value;
            },
            'iri': function(value) {
                const propertyInfos = internals.PROPERTIES_BY_FIELDNAME[fieldName];
                let propertyName = propertyInfos.propertyName;

                if (_.endsWith(propertyName, '._type')) {
                    return db.rdfClasses2ModelNameMapping[value]
                }

                const property = db[modelName].schema.getProperty(propertyName);
                return rdfUtils.rdfURI2id(property.type, value);
            }
        }
    };

    internals.buildValueFromRdf = function(fieldName, rdfInfo) {
        let convertor = internals.rdfValuesConvertor(fieldName);
        let datatype = rdfInfo.type === 'literal' ? rdfInfo.datatype : 'iri';

        let valueType;
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
        convert(item) {
            const findFieldNameFromProperty = function(propertyName) {
                let propInfo = _.find(internals.PROPERTIES, function(o) {
                    return o.propertyName === propertyName && !o.aggregator;
                });
                return propInfo ? propInfo.fieldName : null;
            };

            const _idFieldName = findFieldNameFromProperty('_id');
            const _typeFieldName = findFieldNameFromProperty('_type');

            let doc = _(item)
                .toPairs()
                .map(([fieldName, rdfInfo]) => {
                    if (fieldName === _idFieldName) {
                        let uri = rdfInfo.value;
                        return [
                            _idFieldName,
                            rdfUtils.rdfURI2id(modelName, uri)
                        ];
                    }

                    if (fieldName === _typeFieldName) {
                        let typeUri = item[_typeFieldName].value;
                        let typeValue = db.rdfClasses2ModelNameMapping[typeUri];
                        return [_typeFieldName, typeValue];
                    }

                    fieldName = fieldName.split(rdfUtils.RELATION_SEPARATOR).join('.');
                    let value = internals.buildValueFromRdf(fieldName, rdfInfo);

                    if (value === '') {
                        return;
                    }

                    return [fieldName, value];
                })
                .compact()
                .fromPairs()
                .value();

            const unflatten = (o) => _.zipObjectDeep(_.keys(o), _.values(o));

            doc = unflatten(doc);
            return _.omitBy(doc, (o) => _.isArray(o) && _.isEmpty(o));

        }
    };
};
