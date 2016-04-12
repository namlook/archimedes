
import _ from 'lodash';
import N3 from 'n3';
import moment from 'moment';


export default function main(db) {
    const rdfExport = {};

    rdfExport.RELATION_SEPARATOR = '____';

    rdfExport.RDF_DATATYPES = {
        'http://www.w3.org/2001/XMLSchema#integer': 'number',
        'http://www.w3.org/2001/XMLSchema#decimal': 'number',
        'http://www.w3.org/2001/XMLSchema#float': 'number',
        'http://www.w3.org/2001/XMLSchema#double': 'number',
        'http://www.w3.org/2001/XMLSchema#boolean': 'boolean',
        'http://www.w3.org/2001/XMLSchema#dateTime': 'date',
    };

    rdfExport.PROPERTY_TYPE_TO_RDF_DATATYPES = {
        number: 'http://www.w3.org/2001/XMLSchema#double',
        boolean: 'http://www.w3.org/2001/XMLSchema#boolean',
        date: 'http://www.w3.org/2001/XMLSchema#dateTime',
        datetime: 'http://www.w3.org/2001/XMLSchema#dateTime',
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
        $strlen: 'strlen',
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
        $all: '$nall',
        $nall: '$all',
        $and: '$nand',
        $nand: '$and',
        $or: '$nor',
        $nor: '$or',
        $exists: 'nexists',
        $nexists: '$exists',
    };

    rdfExport.filterExistanceOperatorMapping = {
        $gt: 'exists',
        $lt: 'exists',
        $gte: 'exists',
        $lte: 'exists',
        $eq: 'exists',
        $in: 'exists',
        $all: 'exists',
        $and: 'exists',
        $or: 'exists',
        $regex: 'exists',
        $iregex: 'exists',
        $exists: 'exists',
        $strlen: 'exists',

        $ne: 'notexists',
        $nin: 'notexists',
        $nall: 'notexists',
        $nand: 'notexists',
        $nor: 'notexists',
        $nexists: 'notexists',
    };

    rdfExport.validAggregators = [
        'count',
        'avg',
        'sum',
        'min',
        'max',
    ];

    rdfExport.buildClassRdfUri = (modelName) => db[modelName].meta.classRdfUri;

    rdfExport.buildInstanceRdfUri = (modelName, id) => {
        const modelClass = db[modelName];
        return `${modelClass.meta.instanceRdfPrefix}/${id}`;
    };

    rdfExport.rdfURI2id = (modelName, uri) => {
        const modelClass = db[modelName];
        const id = uri.replace(modelClass.meta.instanceRdfPrefix, '');
        return _.trim(id, '/');
    };


    rdfExport.buildRdfValue = (modelName, propertyName, value) => {
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
            const newPropertyName = propertyName.split('.').slice(0, -1).join('.');
            const property = modelClass.schema.getProperty(newPropertyName);
            const relationModelName = property.modelSchema.name;
            rdfValue = rdfExport.buildInstanceRdfUri(relationModelName, value);
        } else if (_.endsWith(propertyName, '._type')) {
            const newPropertyName = propertyName.split('.').slice(0, -1).join('.');
            const property = modelClass.schema.getProperty(newPropertyName);
            const relationModelName = property.type;
            rdfValue = rdfExport.buildClassRdfUri(relationModelName);
        } else if (modelClass.schema.getProperty(propertyName).isRelation()) {
            const property = modelClass.schema.getProperty(propertyName);
            const _id = _.isPlainObject(value) ? value._id : value;
            const _type = _.isPlainObject(value) ? value._type : property.type;
            rdfValue = rdfExport.buildInstanceRdfUri(_type, _id);
        } else {
            const propertyType = modelClass.schema.getProperty(propertyName).type;
            const valueType = rdfExport.PROPERTY_TYPE_TO_RDF_DATATYPES[propertyType];
            if (valueType) {
                if (_(['date', 'datetime']).includes(propertyType)) {
                    const newValue = moment(value).toISOString();
                    rdfValue = N3.Util.createLiteral(newValue, valueType);
                } else {
                    rdfValue = N3.Util.createLiteral(value, valueType);
                }
            } else {
                rdfValue = N3.Util.createLiteral(value);
            }
        }

        return rdfValue;
    };

    rdfExport.buildRdfPredicate = (modelName, propertyName) => {
        if (propertyName === '_type') {
            return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }
        const property = db[modelName].schema.getProperty(propertyName);
        return property.meta.rdfUri;
    };


    rdfExport.pojo2N3triples = (pojo) => {
        const graphUri = db.config.graphUri;
        const modelName = pojo._type;

        if (!modelName) {
            throw new Error(`property _type not found for pojo: ${JSON.stringify(pojo)}`);
        }

        const modelClass = db[modelName];
        if (!modelClass) {
            throw new Error(`unknown _type "${modelName}" for pojo: ${JSON.stringify(pojo)}`);
        }

        const subject = rdfExport.buildInstanceRdfUri(modelName, pojo._id);

        return _(modelClass.schema._properties)
            .toPairs()
            .map((pair) => {
                const propertyName = pair[0];
                let values = _.get(pojo, propertyName);
                values = _.isArray(values) ? values : [values];
                return values.map((value) => ({ propertyName, value }));
            })
            .flatten()
            .filter((o) => !_.isUndefined(o.value))
            .map((o) => ({
                subject,
                predicate: rdfExport.buildRdfPredicate(modelName, o.propertyName),
                object: rdfExport.buildRdfValue(modelName, o.propertyName, o.value),
            }))
            .concat([{
                subject,
                predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                object: modelClass.meta.classRdfUri,
            }])
            .map((o) => Object.assign({}, o, { graph: graphUri }))
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
}
