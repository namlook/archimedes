
import 'source-map-support/register';

import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var expect = Code.expect;

import testQueries from './aggregations';
import loadDb from './data';
import chalk from 'chalk';
import _ from 'lodash';
import {inspect} from 'util';

import highland from 'highland';


var processTest = function(db, testQuery) {

    return new Promise((resolve, reject) => {

        if (!testQuery) {
            return resolve();
        }

        let query = testQuery.options || {};

        query.field = testQuery.field;
        query.filter = testQuery.filter;


        console.log(query);

        let stream = db.query(testQuery.model, query);
        stream.on('error', function(error) {
            if (testQuery.error != null) {
                try {
                    expect(error.message).to.equal(testQuery.error);
                    if (_.has(error, 'extra.0.message')) {
                        expect(error.extra[0].message).to.equal(testQuery.errorExtraMessage);
                    }
                } catch (e) {
                    console.log('------------------');
                    console.log('>>>', chalk.blue(inspect(testQuery, {depth: 10, colors: true})));
                    console.log('------------------');
                    console.log('>>>', chalk.red(inspect(e, {depth: 10, colors: true})));
                    console.log('------------------');
                    console.log(error.stack);
                    console.log('iii', e);
                    return reject(e);
                }
                return resolve();
            } else {
                console.log('xxx>', error);
                return reject(error);
            }
        });

        highland(stream)
            .errors(function(error) {
                console.log('errors>', error);
            })
            .toArray(function(results) {
                // console.log('===', results);
                try {
                    if (testQuery.results) {
                        expect(results).to.deep.equal(testQuery.results);
                    }
                    return resolve();
                } catch(e) {
                    console.log('------------------');
                    console.log('expected>', chalk.blue(inspect(testQuery, {depth: 10, colors: true})));
                    console.log('------------------');
                    console.log('actual>', chalk.red(inspect(results, {depth: 10, colors: true})));
                    console.log('------------------');
                    console.log('uuuu', e);
                    return reject(e);
                }
            });
    });
};

describe('#aggregate()', function(){

    var db;
    before(function(done) {
        loadDb().then((registeredDB) => {
            db = registeredDB;
            done();
        }).catch((error) => {
            console.log(error);
            console.log(error.stack);
        });
    });


    var testFn = function(testQuery) {
        return function(done) {
            processTest(db, testQuery).then(() => {
                done();
            }).catch((error) => {
                console.log('testFn>', error);
                console.log(error.stack);
            });
        };
    };


    for (let i = 0; i < testQueries.length; i++) {
        let testQuery = testQueries[i];
        let testLauncher = it;
        if (testQuery.only) {
            testLauncher = it.only;
        }
        if (testQuery.skip) {
            testLauncher = it.skip;
        }
        testLauncher(`${testQuery.model}: ${testQuery.should}`, {parallel: false}, testFn(testQuery));
    }
});
