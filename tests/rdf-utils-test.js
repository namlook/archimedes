
import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
var expect = Code.expect;

import {triplestore} from '../lib';
import modelSchemas from './schemas';
import {
    pojo2triples,
    query2whereClause,
    uri2id,
    uri2property,
    rdfDoc2pojo,
    operation2triple} from '../lib/adapters/rdf/utils';


describe('Rdf utils', function() {

    var db;
    before(function(done) {
        triplestore({
            graphUri: 'http://tests.archimedes.org',
            endpoint: 'http://localhost:8890/sparql' // not used here
        }).register(modelSchemas)
          .then((registeredDb) => {
            db = registeredDb;
            done();
        }).catch((error) => {
            console.log(error.stack);
        });
    });

    describe('pojo2triples', function(){
        it('should return triples from a pojo', (done) => {
            let pojo = {
                _id: 'foo',
                _type: 'BlogPost',
                title: 'the title',
                ratting: 5,
                isPublished: true
            };
            let triples = pojo2triples(db, 'BlogPost', pojo);
            expect(triples).to.deep.equal([
              { subject: 'http://tests.archimedes.org/instances/foo',
                predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                object: 'http://tests.archimedes.org/classes/BlogPost' },
              { subject: 'http://tests.archimedes.org/instances/foo',
                predicate: 'http://tests.archimedes.org/properties/title',
                object: '"the title"' },
              { subject: 'http://tests.archimedes.org/instances/foo',
                predicate: 'http://tests.archimedes.org/properties/ratting',
                object: '"5"^^http://www.w3.org/2001/XMLSchema#integer' },
              { subject: 'http://tests.archimedes.org/instances/foo',
                predicate: 'http://tests.archimedes.org/properties/isPublished',
                object: '"true"^^http://www.w3.org/2001/XMLSchema#boolean' }
            ]);

            done();
        });
    });

    describe('query2whereClause', function(){
        it('should return triples from a query', (done) => {
            let query = {
                _type: 'BlogPost',
                title: 'the title',
                ratting: 5,
                isPublished: true
            };
            let options = {sort: ['isPublished', '-ratting']};
            let triples = query2whereClause(db, 'BlogPost', query, options);
            expect(triples).to.deep.equal({
                orderBy: [{
                    descending: false,
                    expression: '?isPublished0'
                  },
                  {
                    descending: true,
                    expression: '?ratting0'
                  }
                ],
                whereClause: [
                {
                    type: 'bgp',
                    triples: [
                       { subject: '?s',
                         predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                         object: '?_type0' },
                       { subject: '?s',
                         predicate: 'http://tests.archimedes.org/properties/title',
                         object: '?title0' },
                       { subject: '?s',
                         predicate: 'http://tests.archimedes.org/properties/ratting',
                         object: '?ratting0' },
                       { subject: '?s',
                         predicate: 'http://tests.archimedes.org/properties/isPublished',
                         object: '?isPublished0' }
                    ]
                },
                {
                    type: 'filter',
                    expression: {
                        type: 'operation',
                        operator: '&&',
                        args: [
                          { type: 'operation',
                            operator: '=',
                            args: [ '?_type0', 'http://tests.archimedes.org/classes/BlogPost' ] },
                          { type: 'operation',
                            operator: '=',
                            args: [ '?title0', '"the title"' ] },
                          { type: 'operation',
                            operator: '=',
                            args: [ '?ratting0', '"5"^^http://www.w3.org/2001/XMLSchema#integer' ] },
                          { type: 'operation',
                            operator: '=',
                            args:
                             [ '?isPublished0',
                               '"true"^^http://www.w3.org/2001/XMLSchema#boolean' ]
                           }
                        ]
                    }
                }]
            });
            done();
        });
    });


    describe('uri2id', function(){
        it('should convert an uri into an instance id', (done) => {
            let uri = 'http://tests.archimedes.org/instances/foo';
            let id = uri2id(db.BlogPost, uri);
            expect(id).to.equal('foo');
            done();
        });
    });

    describe('uri2property', function(){
        it('should convert an uri into an property name', (done) => {
            let uri = 'http://tests.archimedes.org/properties/ratting';
            let propertyName = uri2property(db.BlogPost, uri);
            expect(propertyName).to.equal('ratting');
            done();
        });
    });


    describe('operation2triples', function(){
        it('should convert an operation into a bunch of triples', (done) => {
            let uri = 'http://tests.archimedes.org/instance/123';
            let operation = {
                operator: 'pull',
                property: 'ratting',
                value: 1
            };

            let triple = operation2triple(db, 'BlogPost', uri, operation);
            expect(triple.subject).to.equal(uri);
            expect(triple.predicate).to.equal('http://tests.archimedes.org/properties/ratting');
            expect(triple.object).to.equal('"1"^^http://www.w3.org/2001/XMLSchema#integer');
            done();
        });
    });


    describe('rdfDoc2pojo', function(){
        it('should convert a rdf document into property pojo', (done) => {
            let rdfDoc = {
                _id: 'http://tests.archimedes.org/instances/1ntibnqg067',
                'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': ['http://tests.archimedes.org/classes/BlogPost'],
                'http://tests.archimedes.org/properties/title': ['the post'],
                'http://tests.archimedes.org/properties/ratting': [5],
                'http://tests.archimedes.org/properties/author': ['http://tests.archimedes.org/instances/namlook']
            };

            let pojo = rdfDoc2pojo(db, 'BlogPost', rdfDoc);
            expect(pojo).to.deep.equal({
                _id: '1ntibnqg067',
                _type: 'BlogPost',
                title: 'the post',
                ratting: 5,
                author: { _id: 'namlook', _type: 'User' }
            });
            done();
        });
    });
});