
import _ from 'lodash';
import rdfUtilities from './rdf-utils';
import {Generator as SparqlGenerator} from 'sparqljs';

export default function(db, graphUri) {

    const rdfUtils = rdfUtilities(db);
    const internals = {};

    internals._insertSparsonClauses = function(pojo) {
        let modelName = pojo._type;
        const subject = rdfUtils.buildInstanceRdfUri(modelName, pojo._id);
        const rdfType = rdfUtils.buildClassRdfUri(modelName);

        return _(pojo)
            .toPairs()
            .filter((pair) => !_.includes(['_id', '_type'], pair[0]))
            .map(([propertyName, values]) => {

                const predicate = rdfUtils.buildRdfPredicate(modelName, propertyName);

                if (!_.isArray(values)) {
                    values = [values];
                }

                return values.map((value) => {
                    let rdfValue = rdfUtils.buildRdfValue(modelName, propertyName, value);
                    return {
                        subject: subject,
                        predicate: predicate,
                        object: rdfValue
                    };
                });
            })
            .flatten()
            .value()
            .concat([{
                subject: subject,
                predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                object: rdfType
            }]);
    };

    internals._deleteWhereSparsonClauses = function(pojo) {
        let modelName = pojo._type;
        let subject = rdfUtils.buildInstanceRdfUri(modelName, pojo._id);
        return [{
            subject: subject,
            predicate: '?p',
            object: '?o'
        }];
    };


    internals.buildSaveSparson = function(pojo) {
        let insertClause = internals._insertSparsonClauses(pojo);
        let deleteWhereClause = internals._deleteWhereSparsonClauses(pojo);
        return {
            type: 'update',
            updates: [
                {
                    updateType: 'deletewhere',
                    'delete': [{
                        type: 'graph',
                        triples: deleteWhereClause,
                        name: graphUri
                    }]
                },
                {
                    updateType: 'insert',
                    insert: [{
                          type: 'graph',
                          triples: insertClause,
                          name: graphUri
                    }]
                }
            ]
        };
    };

    internals.buildUpdateSparson = function(pojo) {
        let insertClause = internals._insertSparsonClauses(pojo);
        let deleteWhereClause = internals._deleteWhereSparsonClauses(pojo);
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


    internals.buildDeleteSparson = function(pojo) {
        let deleteWhereClause = internals._deleteWhereSparsonClauses(pojo);
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

        saveQuery: function(pojo) {
            pojo = _.omitBy(pojo, _.isUndefined);
            let sparson = internals.buildSaveSparson(pojo);
            let sparql = new SparqlGenerator().stringify(sparson);
            return sparql;
        },


        updateQuery: function(modelName, query) {

        },

        /** the pojo should at least contains the `_id` and `_type` properties */
        deleteQuery: function(pojo) {
            if (!pojo._id || !pojo._type) {
                throw new Error('_id and _type are required');
            }
            let sparson = internals.buildDeleteSparson(pojo);
            return new SparqlGenerator().stringify(sparson);
        }
    }
};
