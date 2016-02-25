
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


var processTest = function(db, testQuery) {

    return new Promise((resolve, reject) => {

        if (!testQuery) {
            return resolve();
        }

        let promise = db.aggregate(testQuery.model, testQuery.aggregation, testQuery.query, testQuery.options);

        if (testQuery.error != null) {

            promise.catch((error) => {
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
                    return reject(e);
                }
                return resolve();
            });

        } else {

            promise.then((results) => {
                try {
                    if (testQuery.results) {
                        expect(results).to.deep.equal(testQuery.results);
                    }
                } catch(e) {
                    console.log('------------------');
                    console.log('expected>', chalk.blue(inspect(testQuery, {depth: 10, colors: true})));
                    console.log('------------------');
                    console.log('actual>', chalk.red(inspect(results, {depth: 10, colors: true})));
                    console.log('------------------');
                    return reject(e);
                }

                return resolve();
            }).catch((error) => {
                console.log('xxxx', testQuery);
                console.log(inspect(error, {depth: 10}));
                console.log(error.stack);
                return reject(error);
            });

        }

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
                console.log(error);
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
