'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = main;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _n = require('n3');

var _n2 = _interopRequireDefault(_n);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function main(db) {
    var rdfExport = {};

    rdfExport.RELATION_SEPARATOR = '____';

    rdfExport.RDF_DATATYPES = {
        'http://www.w3.org/2001/XMLSchema#integer': 'number',
        'http://www.w3.org/2001/XMLSchema#decimal': 'number',
        'http://www.w3.org/2001/XMLSchema#float': 'number',
        'http://www.w3.org/2001/XMLSchema#double': 'number',
        'http://www.w3.org/2001/XMLSchema#boolean': 'boolean',
        'http://www.w3.org/2001/XMLSchema#dateTime': 'date'
    };

    rdfExport.PROPERTY_TYPE_TO_RDF_DATATYPES = {
        number: 'http://www.w3.org/2001/XMLSchema#double',
        boolean: 'http://www.w3.org/2001/XMLSchema#boolean',
        date: 'http://www.w3.org/2001/XMLSchema#dateTime',
        datetime: 'http://www.w3.org/2001/XMLSchema#dateTime'
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
        $all: '$nall',
        $nall: '$all',
        $and: '$nand',
        $nand: '$and',
        $or: '$nor',
        $nor: '$or',
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
        $nexists: 'notexists'
    };

    rdfExport.validAggregators = ['count', 'avg', 'sum', 'min', 'max'];

    rdfExport.buildClassRdfUri = function (modelName) {
        return db[modelName].meta.classRdfUri;
    };

    rdfExport.buildInstanceRdfUri = function (modelName, id) {
        var modelClass = db[modelName];
        return modelClass.meta.instanceRdfPrefix + '/' + id;
    };

    rdfExport.rdfURI2id = function (modelName, uri) {
        var modelClass = db[modelName];
        var id = uri.replace(modelClass.meta.instanceRdfPrefix, '');
        return _lodash2.default.trim(id, '/');
    };

    rdfExport.buildRdfValue = function (modelName, propertyName, value) {
        var modelClass = db[modelName];

        // if (propertyName === '_type') {
        // return rdfExport.buildClassRdfUri(modelName);
        // }

        var rdfValue = void 0;

        if (propertyName === '_type') {
            rdfValue = rdfExport.buildClassRdfUri(modelName);
        } else if (propertyName === '_id') {
            rdfValue = rdfExport.buildInstanceRdfUri(modelName, value);
        } else if (_lodash2.default.endsWith(propertyName, '._id')) {
            var newPropertyName = propertyName.split('.').slice(0, -1).join('.');
            var property = modelClass.schema.getProperty(newPropertyName);
            var relationModelName = property.modelSchema.name;
            rdfValue = rdfExport.buildInstanceRdfUri(relationModelName, value);
        } else if (_lodash2.default.endsWith(propertyName, '._type')) {
            var _newPropertyName = propertyName.split('.').slice(0, -1).join('.');
            var _property = modelClass.schema.getProperty(_newPropertyName);
            var _relationModelName = _property.type;
            rdfValue = rdfExport.buildClassRdfUri(_relationModelName);
        } else if (modelClass.schema.getProperty(propertyName).isRelation()) {
            var _property2 = modelClass.schema.getProperty(propertyName);
            var _id = _lodash2.default.isPlainObject(value) ? value._id : value;
            var _type = _lodash2.default.isPlainObject(value) ? value._type : _property2.type;
            rdfValue = rdfExport.buildInstanceRdfUri(_type, _id);
        } else {
            var propertyType = modelClass.schema.getProperty(propertyName).type;
            var valueType = rdfExport.PROPERTY_TYPE_TO_RDF_DATATYPES[propertyType];
            if (valueType) {
                if ((0, _lodash2.default)(['date', 'datetime']).includes(propertyType)) {
                    var newValue = (0, _moment2.default)(value).toISOString();
                    rdfValue = _n2.default.Util.createLiteral(newValue, valueType);
                } else {
                    rdfValue = _n2.default.Util.createLiteral(value, valueType);
                }
            } else {
                rdfValue = _n2.default.Util.createLiteral(value);
            }
        }

        return rdfValue;
    };

    rdfExport.buildRdfPredicate = function (modelName, propertyName) {
        if (propertyName === '_type') {
            return 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }
        var property = db[modelName].schema.getProperty(propertyName);
        return property.meta.rdfUri;
    };

    rdfExport.pojo2N3triples = function (pojo) {
        var graphUri = db.config.graphUri;
        var modelName = pojo._type;

        if (!modelName) {
            throw new Error('property _type not found for pojo: ' + JSON.stringify(pojo));
        }

        var modelClass = db[modelName];
        if (!modelClass) {
            throw new Error('unknown _type "' + modelName + '" for pojo: ' + JSON.stringify(pojo));
        }

        var subject = rdfExport.buildInstanceRdfUri(modelName, pojo._id);

        return (0, _lodash2.default)(modelClass.schema._properties).toPairs().map(function (pair) {
            var propertyName = pair[0];
            var values = _lodash2.default.get(pojo, propertyName);
            values = _lodash2.default.isArray(values) ? values : [values];
            return values.map(function (value) {
                return { propertyName: propertyName, value: value };
            });
        }).flatten().filter(function (o) {
            return !_lodash2.default.isUndefined(o.value);
        }).map(function (o) {
            return {
                subject: subject,
                predicate: rdfExport.buildRdfPredicate(modelName, o.propertyName),
                object: rdfExport.buildRdfValue(modelName, o.propertyName, o.value)
            };
        }).concat([{
            subject: subject,
            predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
            object: modelClass.meta.classRdfUri
        }]).map(function (o) {
            return Object.assign({}, o, { graph: graphUri });
        }).value();
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