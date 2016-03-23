
import _ from 'lodash';
import N3 from 'n3';
import moment from 'moment';
import highland from 'highland';


export default function(db) {
    const rdfExport = {};

    rdfExport.RELATION_SEPARATOR = '____';

    rdfExport.RDF_DATATYPES = {
        'http://www.w3.org/2001/XMLSchema#integer': 'number',
        'http://www.w3.org/2001/XMLSchema#decimal': 'number',
        'http://www.w3.org/2001/XMLSchema#float': 'number',
        'http://www.w3.org/2001/XMLSchema#double': 'number',
        'http://www.w3.org/2001/XMLSchema#boolean': 'boolean',
        'http://www.w3.org/2001/XMLSchema#dateTime': 'date'
    };


    rdfExport.operatorMapping = {
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

    rdfExport.inverseOperatorMapping = {
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

    rdfExport.filterExistanceOperatorMapping = {
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

    rdfExport.validAggregators = [
        'count',
        'avg',
        'sum',
        'min',
        'max',
        //'object',
        //'array'
    ];

    rdfExport.buildClassRdfUri = function(modelName) {
        return db[modelName].meta.classRdfUri;
    };

    rdfExport.buildInstanceRdfUri = function(modelName, id) {
        const modelClass = db[modelName];
        return `${modelClass.meta.instanceRdfPrefix}/${id}`;
    };

    rdfExport.rdfURI2id = function(modelName, uri) {
        let modelClass = db[modelName];
        let id = uri.replace(modelClass.meta.instanceRdfPrefix, '');
        return _.trim(id, '/');
    };


    rdfExport.buildRdfValue = function(modelName, propertyName, value) {

        const modelClass = db[modelName];

        // if (propertyName === '_type') {
            // return rdfExport.buildClassRdfUri(modelName);
        // }

        let rdfValue;

        if (propertyName === '_type') {
            rdfValue = rdfExport.buildClassRdfUri(modelName);

        } else if (propertyName === '_id') {
            rdfValue = rdfExport.buildInstanceRdfUri(modelName, value);

        } else if (_.endsWith(propertyName, '._id')) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
            let property = modelClass.schema.getProperty(propertyName);
            let relationModelName = property.modelSchema.name;
            rdfValue = rdfExport.buildInstanceRdfUri(relationModelName, value);

        } else if (_.endsWith(propertyName, '._type')) {
            propertyName = propertyName.split('.').slice(0, -1).join('.');
            let property = modelClass.schema.getProperty(propertyName);
            let relationModelName = property.type;
            rdfValue = rdfExport.buildClassRdfUri(relationModelName);

        } else if (modelClass.schema.getProperty(propertyName).isRelation()) {
            let property = modelClass.schema.getProperty(propertyName);
            const _id = _.isPlainObject(value) ? value._id : value;
            const _type = _.isPlainObject(value) ? value._type : property.type;
            rdfValue = rdfExport.buildInstanceRdfUri(_type, _id);

        } else {
            let propertyType = modelClass.schema.getProperty(propertyName).type;
            if (_(['date', 'datetime']).includes(propertyType)) {
                value = moment(value).toISOString();
                let valueType = 'http://www.w3.org/2001/XMLSchema#dateTime';
                rdfValue = N3.Util.createLiteral(value, valueType);
            } else {
                rdfValue = N3.Util.createLiteral(value);
            }

        }

        return rdfValue;
    };

    rdfExport.buildRdfPredicate = function(modelName, propertyName) {
        if (propertyName === '_type') {
            return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }
        const property = db[modelName].schema.getProperty(propertyName);
        return property.meta.rdfUri;
    };



    rdfExport.pojo2N3triples = function(pojo){
        let graphUri = db.config.graphUri;
        let modelName = pojo._type;

        if (!modelName) {
            throw new Error(`property _type not found for pojo: ${JSON.stringify(pojo)}`);
        }

        let modelClass = db[modelName];
        if (!modelClass) {
            throw new Error(`unknown _type "${modelName}" for pojo: ${JSON.stringify(pojo)}`);
        }

        let subject = rdfExport.buildInstanceRdfUri(modelName, pojo._id);

        return _(modelClass.schema._properties)
            .toPairs()
            .map(([propertyName, propertyInfos]) => {
                let values = _.get(pojo, propertyName);
                values = _.isArray(values) ? values : [values];
                return values.map((value) => ({propertyName, value}));
            })
            .flatten()
            .filter((o) => !_.isUndefined(o.value))
            .map((o) => ({
                subject,
                predicate: rdfExport.buildRdfPredicate(modelName, o.propertyName),
                object: rdfExport.buildRdfValue(modelName, o.propertyName, o.value)
            }))
            .concat([{
                subject: subject,
                predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                object: modelClass.meta.classRdfUri
            }])
            .map((o) => {
                if (graphUri) {
                    o.graph = graphUri;
                }
                return o;
            })
            .value();
    };

    // rdfExport.pojos2ntriples = function(arrayOrStreamOfPojos){
    //     const streamWriter = new N3.StreamWriter({ format: 'N-Triples' });
    //     return highland(arrayOrStreamOfPojos)
    //         .map(rdfExport.pojo2N3triples)
    //         .flatten()
    //         .pipe(streamWriter);
    // };

    return rdfExport;
};
