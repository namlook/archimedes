

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

let rdfInternals = {};

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



module.exports = function(db, modelName, fields) {

    let internals = {};

    /**
     * returns the list of properties fieldName whose property
     * is an array
     * TODO: duplicate with sparql-query-builder, add it to the modelSchema
     */
    internals.arrayProperties = (function() {
        let modelClass = db[modelName];
        let modelSchema = modelClass.schema;
        let arrayProperties = [];
        for (let fieldName of Object.keys(fields)) {
            let propertyName = fields[fieldName];
            let property = modelSchema.getProperty(propertyName);
            if(property.isArray()) {
                arrayProperties.push(propertyName);
            }
        }
        return arrayProperties;
    })();

    internals.convertLiteralValue = function(fieldName, value, rdfType) {
        let valueType = 'string';
        if (rdfType) {
            valueType = rdfInternals.RDF_DATATYPES[rdfType];
        }

        switch (valueType) {
            case 'string':
                // TODO parseJSON
                let propertyName = fields[fieldName];
                if (internals.arrayProperties.indexOf(propertyName) > -1) {
                    value = JSON.parse(value).map((val) => decodeURI(val));
                    let property = db[modelName].schema.getProperty(propertyName);
                    if (property.isRelation()) {
                        value = value.map((uri) => ({
                            _id: rdfInternals.rdfURI2id(db, property.type, uri),
                            _type: property.type
                        }));
                    }
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

        let propertyName = fields[fieldName];
        let property = db[modelName].schema.getProperty(propertyName);

        return {
            _id: rdfInternals.rdfURI2id(db, property.type, value),
            _type: property.type
        };
    };

    return {
        convert(item) {
            let doc = {};
            doc._id = rdfInternals.rdfURI2id(db, modelName, item._id.value);
            delete item._id;
            doc._type = modelName;

            for (let fieldName of Object.keys(item)) {
                let rdfInfo = item[fieldName];
                if (rdfInfo.type === 'literal') {
                    doc[fieldName] = internals.convertLiteralValue(
                        fieldName, rdfInfo.value, rdfInfo.datatype
                    );
                } else {
                    doc[fieldName] = internals.convertIRIValue(fieldName, rdfInfo.value);
                }
            }
            return doc;
        }
    };
};
