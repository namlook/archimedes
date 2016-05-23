'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = function (db, graphUri) {

    var rdfUtils = (0, _rdfUtils2.default)(db);
    var internals = {};

    internals._insertSparsonClauses = function (pojo) {
        var modelName = pojo._type;
        var subject = rdfUtils.buildInstanceRdfUri(modelName, pojo._id);
        var rdfType = rdfUtils.buildClassRdfUri(modelName);

        return (0, _lodash2.default)(pojo).toPairs().filter(function (pair) {
            return !_lodash2.default.includes(['_id', '_type'], pair[0]);
        }).map(function (_ref) {
            var _ref2 = _slicedToArray(_ref, 2);

            var propertyName = _ref2[0];
            var values = _ref2[1];


            var predicate = rdfUtils.buildRdfPredicate(modelName, propertyName);

            if (!_lodash2.default.isArray(values)) {
                values = [values];
            }

            return values.map(function (value) {
                var rdfValue = rdfUtils.buildRdfValue(modelName, propertyName, value);
                return {
                    subject: subject,
                    predicate: predicate,
                    object: rdfValue
                };
            });
        }).flatten().value().concat([{
            subject: subject,
            predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
            object: rdfType
        }]);
    };

    internals._deleteWhereSparsonClauses = function (pojo) {
        var modelName = pojo._type;
        var subject = rdfUtils.buildInstanceRdfUri(modelName, pojo._id);
        return [{
            subject: subject,
            predicate: '?p',
            object: '?o'
        }];
    };

    internals.buildSaveSparson = function (pojo) {
        var insertClause = internals._insertSparsonClauses(pojo);
        var deleteWhereClause = internals._deleteWhereSparsonClauses(pojo);
        return {
            type: 'update',
            updates: [{
                updateType: 'deletewhere',
                'delete': [{
                    type: 'graph',
                    triples: deleteWhereClause,
                    name: graphUri
                }]
            }, {
                updateType: 'insert',
                insert: [{
                    type: 'graph',
                    triples: insertClause,
                    name: graphUri
                }]
            }]
        };
    };

    internals.buildUpdateSparson = function (pojo) {
        var insertClause = internals._insertSparsonClauses(pojo);
        var deleteWhereClause = internals._deleteWhereSparsonClauses(pojo);
        return {
            type: 'update',
            updates: [{
                updateType: 'insertdelete',
                'delete': [{
                    type: 'graph',
                    triples: deleteWhereClause,
                    name: graphUri
                }],
                insert: [{
                    type: 'graph',
                    triples: insertClause,
                    name: graphUri
                }],
                from: {
                    'default': [graphUri]
                },
                where: [{
                    type: 'bgp',
                    triples: deleteWhereClause
                }]
            }]
        };
    };

    internals.buildDeleteSparson = function (pojo) {
        var deleteWhereClause = internals._deleteWhereSparsonClauses(pojo);
        return {
            type: 'update',
            updates: [{
                updateType: 'insertdelete',
                'delete': [{
                    type: 'graph',
                    triples: deleteWhereClause,
                    name: graphUri
                }],
                insert: [],
                from: {
                    'default': [graphUri]
                },
                where: [{
                    type: 'bgp',
                    triples: deleteWhereClause
                }]
            }]
        };
    };

    return {

        saveQuery: function saveQuery(pojo) {
            pojo = _lodash2.default.omitBy(pojo, _lodash2.default.isUndefined);
            var sparson = internals.buildSaveSparson(pojo);
            var sparql = new _sparqljs.Generator().stringify(sparson);
            return sparql;
        },

        updateQuery: function updateQuery(modelName, query) {},

        /** the pojo should at least contains the `_id` and `_type` properties */
        deleteQuery: function deleteQuery(pojo) {
            if (!pojo._id || !pojo._type) {
                throw new Error('_id and _type are required');
            }
            var sparson = internals.buildDeleteSparson(pojo);
            return new _sparqljs.Generator().stringify(sparson);
        }
    };
};

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _rdfUtils = require('./rdf-utils');

var _rdfUtils2 = _interopRequireDefault(_rdfUtils);

var _sparqljs = require('sparqljs');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

;