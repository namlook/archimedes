

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


module.exports = function(db, modelName, sanitizedQueryFields) {

    const internals = {};

    /**
     * returns the list of properties fieldName whose property
     * is an array
     */
     internals.arrayProperties = (function() {
        let properties = [];
        for (let fieldName of Object.keys(sanitizedQueryFields)) {
            let propertyInfos = sanitizedQueryFields[fieldName];
            if (propertyInfos.$array) {
                properties.push(propertyInfos.$property);
            }
        }
        return properties;
     })();


    internals.convertLiteralValue = function(fieldName, value, rdfType) {
        let valueType = 'string';
        if (rdfType) {
            valueType = rdfInternals.RDF_DATATYPES[rdfType];
        }

        const _decodeURIValue = function(iriValue) {
            if (_.isPlainObject(iriValue)) {
                let decodedPairs = _.toPairs(iriValue).map((pair) => {
                    return [pair[0], decodeURIValue(pair[1])];
                });
                return _.fromPairs(decodedPairs);
            } else {
                return decodeURIComponent(iriValue);
            }
        }

        switch (valueType) {
            case 'string':
                let propertyInfos = sanitizedQueryFields[fieldName];
                let propertyName = propertyInfos.$property;
                if (propertyInfos.$array) {
                    value = JSON.parse(value).map((val) => _decodeURIValue(val));
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

        const propertyInfos = sanitizedQueryFields[fieldName];
        let propertyName = propertyInfos.$property;

        if (_.endsWith(propertyName, '._id')) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
        }

        const property = db[modelName].schema.getProperty(propertyName);
        return {
            _id: rdfInternals.rdfURI2id(db, property.type, value),
            _type: property.type
        };
    };

    return {
        convert(item) {
            const doc = {};

            let _idProperty = _(sanitizedQueryFields)
                                .toPairs()
                                .find((o) => o[1].$property === '_id');
            if (_idProperty) {
                let _idVariableName = _idProperty[0];
                let uri = item[_idVariableName].value;
                doc[_idVariableName] = rdfInternals.rdfURI2id(db, modelName, uri);
                delete item[_idVariableName];
            }

            let _typeProperty = _(sanitizedQueryFields)
                                    .toPairs()
                                    .find((o) => o[1].$property === '_type');
            if (_typeProperty) {
                let _typeVariableName = _typeProperty[0];
                doc[_typeVariableName] = modelName; //db.rdfClasses2ModelNameMapping[item._type.value];
                delete item[_typeVariableName];
            }

            for (let fieldName of Object.keys(item)) {
                let rdfInfo = item[fieldName];
                fieldName = fieldName.split(rdfInternals.RELATION_SEPARATOR).join('.');
                let value;
                console.log('%%%%', fieldName, rdfInfo);
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
