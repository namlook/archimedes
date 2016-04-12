
import _ from 'lodash';

import rdfUtilities from './rdf-utils';

module.exports = function main(db, modelName, _query) {
    /** don't work directly on the query **/
    const query = _.cloneDeep(_query);

    const rdfUtils = rdfUtilities(db);
    const internals = {};

    const fieldProperties = _.toPairs(query.field)
        .map(([fieldName, _fieldInfos]) => {
            const isArray = _.isArray(_fieldInfos);
            let fieldInfos = isArray && _fieldInfos[0] || _fieldInfos;

            if (_.isString(fieldInfos)) {
                fieldInfos = { $property: fieldInfos };
            }

            let propertyName = fieldInfos.$property;

            const optional = _.includes(propertyName, '?');
            if (optional) {
                propertyName = propertyName.split('?').join('');
            }

            if (_.endsWith(propertyName, '._id')) {
                propertyName = propertyName.split('.').slice(0, -1).join('.');
            }

            return {
                fieldName,
                propertyName,
                array: isArray,
                fields: fieldInfos.$fields,
                propertyRaw: fieldInfos.$property.split('?').join(''),
            };
        });

    const aggregationProperties = _.toPairs(query.aggregate)
        .map(([fieldName, _aggregationInfos]) => {
            let aggregationInfos = _aggregationInfos;
            if (!aggregationInfos.$aggregator) {
                const [_aggregator, propertyName] = _.toPairs(aggregationInfos)[0];
                const aggregator = _aggregator.slice(1);
                aggregationInfos = {
                    $aggregator: aggregator,
                    $property: propertyName,
                };
            } else if (!aggregationInfos.$property) {
                const aggregator = aggregationInfos.$aggregator;
                if (aggregator === 'count') {
                    aggregationInfos.$property = true;
                } else if (aggregator === 'array' && aggregationInfos.$fields) {
                    const propertyName = _.values(aggregationInfos.$fields)[0].split('.')[0];
                    aggregationInfos.$property = propertyName;
                }
            }


            if (aggregationInfos.$property === true) {
                aggregationInfos.$property = '_id';
            }

            let propertyName = aggregationInfos.$property;
            const aggregator = aggregationInfos.$aggregator.toLowerCase();

            const optional = _.includes(propertyName, '?');
            if (optional) {
                propertyName = propertyName.split('?').join('');
            }

            if (_.endsWith(propertyName, '._id')) {
                propertyName = propertyName.split('.').slice(0, -1).join('.');
            }

            return {
                fieldName,
                propertyName,
                aggregator,
                array: aggregator === 'array',
                fields: aggregationInfos.$fields,
                propertyRaw: aggregationInfos.$property.split('?').join(''),
            };
        });

    internals.PROPERTIES = fieldProperties.concat(aggregationProperties);

    internals.PROPERTIES_BY_FIELDNAME = _.keyBy(internals.PROPERTIES, 'fieldName');

    internals.SORTED_FIELDS = _.keyBy(
        _.get(query, 'sort', []).map((_fieldName) => {
            const descOrder = _.startsWith(_fieldName, '-');
            const fieldName = descOrder ? _fieldName.slice(1) : _fieldName;
            const order = descOrder ? 'desc' : 'asc';
            return { fieldName, order };
        }),
        'fieldName'
    );

    // console.log('PROPERTIES>', internals.PROPERTIES);
    // console.log('PROPERTIES_BY_FIELDNAME>', internals.PROPERTIES_BY_FIELDNAME);

    internals._decodeURIValue = (_fieldName, iriValue, parent) => {
        if (_.isPlainObject(iriValue)) {
            const decodedPairs = _.toPairs(iriValue).map((pair) =>
                [pair[0], internals._decodeURIValue(pair[0], pair[1], _fieldName)]
            );
            return _.fromPairs(decodedPairs);
        }

        const decodedValue = decodeURIComponent(iriValue);

        let propertyRaw;
        let propertyName;
        if (parent) {
            const propInfos = internals.PROPERTIES_BY_FIELDNAME[parent];
            if (propInfos.fields) {
                propertyRaw = propInfos.fields[_fieldName];

                /** process embeded field's values in object **/
                if (_.endsWith(propertyRaw, '._id')) {
                    propertyName = propertyRaw.split('._id')[0];
                } else if (_.endsWith(propertyRaw, '._type')) {
                    return db.rdfClasses2ModelNameMapping[decodedValue];
                } else {
                    propertyName = propertyRaw;
                }
            } else {
                propertyRaw = propInfos[_fieldName];
                propertyName = propertyRaw;
            }
        } else {
            const propInfos = internals.PROPERTIES_BY_FIELDNAME[_fieldName];
            propertyRaw = propInfos.propertyRaw;
            propertyName = propInfos.propertyName;
        }

        if (_.endsWith(propertyRaw, '._id')) {
            propertyName = propertyName.split('?').join('');
            const property = db[modelName].schema.getProperty(propertyName);
            return rdfUtils.rdfURI2id(property.type, decodedValue);
        }

        return decodedValue;
    };

    internals.rdfValuesConvertor = (fieldName) => (
        {
            number: parseFloat,
            date: (value) => new Date(value),
            boolean: (value) => _(['true', '1', 1, 'yes']).includes(value),
            string: (_value) => {
                const propertyInfos = internals.PROPERTIES_BY_FIELDNAME[fieldName];
                const propertyName = propertyInfos.propertyName;
                let value = _value;
                if (propertyInfos.array) {
                    value = JSON.parse(value).map(
                        (val) => internals._decodeURIValue(fieldName, val)
                    );
                    value = _.compact(value);

                    /** always sort the array **/
                    const property = db[modelName].schema.getProperty(propertyName);

                    value = _.sortBy(value);
                    if (property.isRelation() && value.length && value[0]._id) {
                        value = _.sortBy(value, '_id');
                    }

                    const sortOrder = _.get(internals.SORTED_FIELDS, `${fieldName}.order`);
                    if (sortOrder === 'desc') {
                        value = _.reverse(value);
                    }
                }

                return value;
            },
            iri: (value) => {
                const propertyInfos = internals.PROPERTIES_BY_FIELDNAME[fieldName];
                const propertyName = propertyInfos.propertyName;

                if (_.endsWith(propertyName, '._type')) {
                    return db.rdfClasses2ModelNameMapping[value];
                }

                const property = db[modelName].schema.getProperty(propertyName);
                return rdfUtils.rdfURI2id(property.type, value);
            },
        }
    );

    internals.buildValueFromRdf = (fieldName, rdfInfo) => {
        const convertor = internals.rdfValuesConvertor(fieldName);
        const datatype = rdfInfo.type === 'literal' ? rdfInfo.datatype : 'iri';

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
            const findFieldNameFromProperty = (propertyName) => {
                const propInfo = _.find(internals.PROPERTIES, (o) =>
                    o.propertyName === propertyName && !o.aggregator
                );
                return propInfo ? propInfo.fieldName : null;
            };

            const _idFieldName = findFieldNameFromProperty('_id');
            const _typeFieldName = findFieldNameFromProperty('_type');

            let doc = _(item)
                .toPairs()
                .map(([fieldName, rdfInfo]) => {
                    if (fieldName === _idFieldName) {
                        const uri = rdfInfo.value;
                        return [
                            _idFieldName,
                            rdfUtils.rdfURI2id(modelName, uri),
                        ];
                    }

                    if (fieldName === _typeFieldName) {
                        const typeUri = item[_typeFieldName].value;
                        const typeValue = db.rdfClasses2ModelNameMapping[typeUri];
                        return [_typeFieldName, typeValue];
                    }

                    const newFieldName = fieldName.split(rdfUtils.RELATION_SEPARATOR).join('.');
                    const value = internals.buildValueFromRdf(newFieldName, rdfInfo);

                    if (value === '') {
                        return undefined;
                    }

                    return [newFieldName, value];
                })
                .compact()
                .fromPairs()
                .value();

            const unflatten = (o) => _.zipObjectDeep(_.keys(o), _.values(o));

            doc = unflatten(doc);
            return _.omitBy(doc, (o) => _.isArray(o) && _.isEmpty(o));
        },
    };
};
