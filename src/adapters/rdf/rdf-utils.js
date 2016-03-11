
import _ from 'lodash';
import {Util as N3Util} from 'n3';
import moment from 'moment';


export default function(db) {
    const rdfInternals = {};

    rdfInternals.RELATION_SEPARATOR = '____';

    rdfInternals.RDF_DATATYPES = {
        'http://www.w3.org/2001/XMLSchema#integer': 'number',
        'http://www.w3.org/2001/XMLSchema#decimal': 'number',
        'http://www.w3.org/2001/XMLSchema#float': 'number',
        'http://www.w3.org/2001/XMLSchema#double': 'number',
        'http://www.w3.org/2001/XMLSchema#boolean': 'boolean',
        'http://www.w3.org/2001/XMLSchema#dateTime': 'date'
    };


    rdfInternals.operatorMapping = {
        $gt: '>',
        $lt: '<',
        $gte: '>=',
        $lte: '<=',
        $eq: '=',
        $ne: '!=',
        $in: 'in',
        $nin: 'notin',
        $regex: 'regex',
        $iregex: 'regex',
        $exists: 'exists',
        $nexists: 'notexists',
        $strlen: 'strlen'
    };

    rdfInternals.inverseOperatorMapping = {
        $gt: '$lte',
        $lt: '$gte',
        $gte: '$lt',
        $lte: '$gt',
        $eq: '$ne',
        $ne: '$eq',
        $in: '$nin',
        $nin: '$in',
        $exists: 'nexists',
        $nexists: '$exists'
    };

    rdfInternals.filterExistanceOperatorMapping = {
        $gt: 'exists',
        $lt: 'exists',
        $gte: 'exists',
        $lte: 'exists',
        $eq: 'exists',
        $in: 'exists',
        $regex: 'exists',
        $iregex: 'exists',
        $exists: 'exists',
        $strlen: 'exists',
        $ne: 'notexists',
        $nin: 'notexists',
        $nexists: 'notexists'
    };

    rdfInternals.validAggregators = [
        'count',
        'avg',
        'sum',
        'min',
        'max',
        //'object',
        //'array'
    ];

    rdfInternals.buildClassRdfUri = function(modelName) {
        return db[modelName].meta.classRdfUri;
    };

    rdfInternals.buildInstanceRdfUri = function(modelName, id) {
        const modelClass = db[modelName];
        return `${modelClass.meta.instanceRdfPrefix}/${id}`;
    };

    rdfInternals.rdfURI2id = function(modelName, uri) {
        let modelClass = db[modelName];
        let id = uri.replace(modelClass.meta.instanceRdfPrefix, '');
        return _.trim(id, '/');
    };


    rdfInternals.buildRdfValue = function(modelName, propertyName, value) {

        const modelClass = db[modelName];

        // if (propertyName === '_type') {
            // return rdfInternals.buildClassRdfUri(modelName);
        // }

        let rdfValue;
        let isRelation = _.has(value, '_id') && _.has(value, '_type');

        if (propertyName === '_type') {

            rdfValue = rdfInternals.buildClassRdfUri(modelName);

        } else if (propertyName === '_id') {

            rdfValue = rdfInternals.buildInstanceRdfUri(modelName, value);

        } else if (_.endsWith(propertyName, '._id')) {

            propertyName = propertyName.split('.').slice(0, -1).join('.');
            let property = modelClass.schema.getProperty(propertyName);
            let relationModelName = property.modelSchema.name;
            rdfValue = rdfInternals.buildInstanceRdfUri(relationModelName, value);

        } else if (isRelation) {

            rdfValue = rdfInternals.instanceRdfUri(value._type, value._id);

        } else {

            let propertyType = modelClass.schema.getProperty(propertyName).type;
            if (_(['date', 'datetime']).includes(propertyType)) {
                value = moment(value).toISOString();
                let valueType = 'http://www.w3.org/2001/XMLSchema#dateTime';
                rdfValue = N3Util.createLiteral(value, valueType);
            } else {
                rdfValue = N3Util.createLiteral(value);
            }

        }

        return rdfValue;
    };

    return rdfInternals;
};
