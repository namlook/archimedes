
import 'source-map-support/register';

import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var expect = Code.expect;

import testQueries from './queries';
import loadDb from './data';
import chalk from 'chalk';
import {inspect} from 'util';


var processDbTest = function(db, testQuery) {

    return new Promise((resolve, reject) => {

        if (!testQuery) {
            return resolve();
        }

        let promise = db.find(testQuery.model, testQuery.query, testQuery.options);

        if (testQuery.error != null) {

            promise.catch((error) => {
                try {
                    expect(error.message).to.equal(testQuery.error);
                    if (error.extra) {
                        expect(error.extra).to.equal(testQuery.errorExtraMessage);
                    }
                } catch (e) {
                    console.log('------------------');
                    console.log('>>>', chalk.blue(inspect(testQuery, {depth: 10, colors: true})));
                    console.log('------------------');
                    console.log(error);
                    console.log(error.stack);
                    return reject(e);
                }
                return resolve();
            });

        } else {

            promise.then((results) => {
                let ids = results.map((item) => item._id);

                try {
                    if (testQuery.ids) {
                        expect(ids).to.deep.equal(testQuery.ids);
                    }

                    if (testQuery.results) {
                        expect(results).to.deep.equal(testQuery.results);
                    }
                } catch(e) {
                    console.log('------------------');
                    console.log('>>>', chalk.blue(inspect(testQuery, {depth: 10, colors: true})));
                    console.log('------------------');
                    console.log(error);
                    console.log(error.stack);
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


var processModelTest = function(db, testQuery) {

    return new Promise((resolve, reject) => {

        if (!testQuery) {
            return resolve();
        }

        let promise = db[testQuery.model].find(testQuery.query, testQuery.options);

        if (testQuery.error != null) {

            promise.catch((error) => {
                try {
                    expect(error.message).to.equal(testQuery.error);
                    if (error.extra) {
                        expect(error.extra).to.equal(testQuery.errorExtraMessage);
                    }
                } catch (e) {
                    console.log('------------------');
                    console.log('>>>', chalk.blue(inspect(testQuery, {depth: 10, colors: true})));
                    console.log('------------------');
                    return reject(e);
                }
                return resolve();
            });

        } else {

            promise.then((results) => {
                let ids = results.map((item) => item._id);

                try {
                    if (testQuery.ids) {
                        expect(ids).to.deep.equal(testQuery.ids);
                    }

                    if (testQuery.results) {
                        let pojos = results.map((o) => o.attrs());
                        expect(pojos).to.deep.equal(testQuery.results);
                    }
                } catch(e) {
                    console.log('------------------');
                    console.log('>>>', chalk.blue(inspect(testQuery, {depth: 10, colors: true})));
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

describe('query', function(){

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


    var testDbFn = function(testQuery) {
        return function(done) {
            processDbTest(db, testQuery).then(() => {
                done();
            }).catch((error) => {
                console.log(error);
            });
        };
    };

    var testModelFn = function(testQuery) {
        return function(done) {
            processModelTest(db, testQuery).then(() => {
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
        testLauncher(`db> ${testQuery.model}: ${inspect(testQuery.query)} (${inspect(testQuery.options)})`, {parallel: false}, testDbFn(testQuery));
        testLauncher(`model> ${testQuery.model}: ${inspect(testQuery.query)} (${inspect(testQuery.options)})`, {parallel: false}, testModelFn(testQuery));
    }
});



