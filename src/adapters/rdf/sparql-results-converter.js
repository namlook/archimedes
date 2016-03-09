

// var item = {
//     _id: {
//         type: 'uri',
//         value: 'http://tests.archimedes.org/instances/blogpost6'
//     },
//     title: { type: 'literal', value: 'post 6' },
//     post: { type: 'literal', value: 'this is the body of the post 6' },
//     author: { type: 'uri', value: 'http://tests.archimedes.org/instances/user1' },
//     tags: { type: 'literal', value: '["tag7", "tag6"]' }
// }
//
// let item = {
//     _id: { type: 'uri', value: 'http://tests.archimedes.org/instances/blogpost6' },
//     title: { type: 'literal', value: 'post 6' },
//     score: {
//         datatype: 'http://www.w3.org/2001/XMLSchema#integer',
//         type: 'literal',
//         value: '0'
//     },
//     author: { type: 'uri', value: 'http://tests.archimedes.org/instances/user1' },
//     tags: { type: 'literal', value: '["tag7", "tag6"]' }
// }

import _ from 'lodash';

const rdfInternals = {};

rdfInternals.RELATION_SEPARATOR = '____';

rdfInternals.rdfURI2id = function(db, modelName, uri) {
    let modelClass = db[modelName];
    let id = uri.replace(modelClass.meta.instanceRdfPrefix, '');
    return _.trim(id, '/');
};

rdfInternals.RDF_DATATYPES = {
    'http://www.w3.org/2001/XMLSchema#integer': 'number',
    'http://www.w3.org/2001/XMLSchema#decimal': 'number',
    'http://www.w3.org/2001/XMLSchema#float': 'number',
    'http://www.w3.org/2001/XMLSchema#double': 'number',
    'http://www.w3.org/2001/XMLSchema#boolean': 'boolean',
    'http://www.w3.org/2001/XMLSchema#dateTime': 'date'
};


module.exports = function(db, modelName, query) {

    const internals = {};

    internals.PROPERTIES = _.toPairs(query.field)
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
                propertyRaw: fieldInfos.$property
            };
        }).concat(
            _.toPairs(query.aggregate).map(([fieldName, aggregationInfos]) => {
                console.log('*****', fieldName, aggregationInfos);
                if (!aggregationInfos.$aggregator) {
                    let [aggregator, propertyName] = _.toPairs(aggregationInfos)[0];
                    aggregator = aggregator.slice(1);
                    aggregationInfos = {
                        $aggregator: aggregator,
                        $property: propertyName
                    };
                } else if (!aggregationInfos.$property) {
                    aggregationInfos.$property = true;
                }

                if (aggregationInfos.$property === true) {
                    aggregationInfos.$property = '_id';
                }

                let propertyName = aggregationInfos.$property;
                let aggregator = aggregationInfos.$aggregator.toLowerCase();

                if(_.endsWith(propertyName, '._id')) {
                    propertyName = propertyName.split('.').slice(0, -1).join('.');
                }

                return {
                    fieldName,
                    propertyName,
                    array: aggregator === 'array',
                    propertyRaw: aggregationInfos.$property
                };
            })
        );

    internals.PROPERTIES_BY_FIELDNAME = _.keyBy(internals.PROPERTIES, 'fieldName');

    internals.SORTED_FIELDS = _.keyBy(
        _.get(query, 'sort', []).map((fieldName) => {
            let descOrder = _.startsWith(fieldName, '-');
            fieldName = descOrder ? fieldName.slice(1) : fieldName;
            let order = descOrder ? 'desc' : 'asc';
            console.log('_____', fieldName, descOrder, order);
            return { fieldName, order };
        }),
        'fieldName'
    );

    console.log('PROPERTIES>', internals.PROPERTIES);
    console.log('PROPERTIES_BY_FIELDNAME>', internals.PROPERTIES_BY_FIELDNAME);

    // internals.propertyName2FieldNameMapping = (function() {
    //     let _propertyName2FieldName = {};
    //     for (let fieldName of Object.keys(sanitizedQueryFields)) {
    //         let propertyInfos = sanitizedQueryFields[fieldName];
    //         if (propertyInfos.$fields) {
    //             for (let innerFieldName of Object.keys(propertyInfos.$fields)) {
    //                 let propertyName = propertyInfos.$fields[innerFieldName];
    //                 _propertyName2FieldName[innerFieldName] = propertyName;
    //             }
    //         } else {
    //             _propertyName2FieldName[fieldName] = propertyInfos.$property;
    //         }
    //     }
    //     return _propertyName2FieldName;
    // })();

    // console.dir(internals.propertyName2FieldNameMapping, {depth: 10});

    /**
     * returns the list of properties fieldName whose property
     * is an array
     */
    //  internals.arrayProperties = (function() {
    //     let properties = [];
    //     for (let fieldName of Object.keys(sanitizedQueryFields)) {
    //         let propertyInfos = sanitizedQueryFields[fieldName];
    //         if (propertyInfos.$array) {
    //             properties.push(propertyInfos.$property);
    //         }
    //     }
    //     return properties;
    //  })();


    internals.convertLiteralValue = function(fieldName, value, rdfType) {
        let valueType = 'string';
        if (rdfType) {
            valueType = rdfInternals.RDF_DATATYPES[rdfType];
        }

        const _decodeURIValue = function(_fieldName, iriValue) {
            if (_.isPlainObject(iriValue)) {
                let decodedPairs = _.toPairs(iriValue).map((pair) => {
                    return [pair[0], _decodeURIValue(pair[0], pair[1])];
                });
                return _.fromPairs(decodedPairs);
            } else {
                let decodedValue = decodeURIComponent(iriValue);
                let propInfos = internals.PROPERTIES_BY_FIELDNAME[_fieldName];
                console.log('++++', _fieldName, propInfos);
                if (_.endsWith(propInfos.propertyRaw, '._id')) {
                    const property = db[modelName].schema.getProperty(propInfos.propertyName);
                    return rdfInternals.rdfURI2id(db, property.type, decodedValue);
                } else {
                    return decodedValue;
                }
            }
        }

        switch (valueType) {
            case 'string':
                let propertyInfos = internals.PROPERTIES_BY_FIELDNAME[fieldName];
                let propertyName = propertyInfos.propertyName;

                if (propertyInfos.array) {
                    value = JSON.parse(value).map(
                        (val) => _decodeURIValue(fieldName, val));
                    value = _.compact(value);
                    let sortOrder = _.get(internals.SORTED_FIELDS, `${fieldName}.order`);
                    if (sortOrder) {
                        value = _.sortBy(value);
                        console.log('+****°', value);
                        if (sortOrder === 'desc') {
                            value = _.reverse(value);
                        }
                    }
                    console.log('!!!', value, sortOrder);
                    // let property = db[modelName].schema.getProperty(propertyName);
                    // if (property.isRelation()) {
                    //     if (!propertyInfos.$fields) {
                    //         value = value.map((uri) => rdfInternals.rdfURI2id(db, property.type, uri));
                    //     }
                    //     // value = value.map((uri) => ({
                    //     //     _id: rdfInternals.rdfURI2id(db, property.type, uri),
                    //     //     _type: property.type
                    //     // }));
                    // }
                }
                break;

            case 'number':
                value = parseFloat(value);
                break;

            case 'boolean':
                if (['true', '1', 1, 'yes'].indexOf(value) > -1) {
                    value = true;
                } else {
                    value = false;
                }
                break;

            case 'date':
                value = new Date(value);
                break;

            default:
                console.error('UNKNOWN DATATYPE !!!', valueType);
        }

        return value;
    };

    internals.convertIRIValue = function(fieldName, value) {
        const propertyInfos = internals.PROPERTIES_BY_FIELDNAME[fieldName];
        let propertyName = propertyInfos.propertyName;

        if (_.endsWith(propertyName, '._type')) {
            return db.rdfClasses2ModelNameMapping[value]
        }

        const property = db[modelName].schema.getProperty(propertyName);
        return rdfInternals.rdfURI2id(db, property.type, value);
    };

    return {
        convert(item) {
            const doc = {};

            let _idProperty = internals.PROPERTIES.find((o) => o.propertyName === '_id');
            if (_idProperty) {
                let _idVariableName = _idProperty.fieldName;
                let uri = item[_idVariableName].value;
                doc[_idVariableName] = rdfInternals.rdfURI2id(db, modelName, uri);
                delete item[_idVariableName];
            }

            let _typeProperty = internals.PROPERTIES.find((o) => o.propertyName === '_type');
            if (_typeProperty) {
                let _typeVariableName = _typeProperty.fieldName;
                doc[_typeVariableName] = modelName; //db.rdfClasses2ModelNameMapping[item._type.value];
                delete item[_typeVariableName];
            }

            for (let fieldName of Object.keys(item)) {
                let rdfInfo = item[fieldName];
                fieldName = fieldName.split(rdfInternals.RELATION_SEPARATOR).join('.');
                let value;
                if (rdfInfo.type === 'literal') {
                    value = internals.convertLiteralValue(
                        fieldName, rdfInfo.value, rdfInfo.datatype
                    );
                } else {
                    value = internals.convertIRIValue(fieldName, rdfInfo.value);
                }
                _.set(doc, fieldName, value);
            }

            return doc;
        }
    };
};
