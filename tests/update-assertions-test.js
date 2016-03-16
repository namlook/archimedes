
import 'source-map-support/register';

import Lab from 'lab';
const lab = exports.lab = Lab.script();

import Code from 'code';
const describe = lab.describe;
const it = lab.it;
const before = lab.before;
const beforeEach = lab.beforeEach;
const expect = Code.expect;

import store from './db';

import chalk from 'chalk';
import _ from 'lodash';
import {inspect} from 'util';

import highland from 'highland';


import importAssertions from './update-assertions/import-assertions';
import importErrorAssertions from './update-assertions/import-error-assertions';

import saveAssertions from './update-assertions/save-assertions';
import saveErrorAssertions from './update-assertions/save-error-assertions';
//
// import aggregation from './query-assertions/aggregation-assertions';
// import aggregationErrors from './query-assertions/aggregation-error-assertions';
//
// import queryOptions from './query-assertions/option-assertions'
// import queryOptionsError from './query-assertions/option-error-assertions'

const testQueries = {
    import: importAssertions,
    'import-errors': importErrorAssertions,
    save: saveAssertions,
    'save-errors': saveErrorAssertions
};

var processTest = function(db, testQuery, method) {

    return new Promise((resolve, reject) => {

        if (!testQuery) {
            return resolve();
        }

        const testData = testQuery.save || testQuery.import;

        if (!testData.length) {
            throw new Error('WARNING! no test data specified');
        }

        if (!testQuery.results && !testQuery.error) {
            testQuery.results = _.cloneDeep(testData);
        }

        let saveStream;
        if (method === 'savePromise') {
            saveStream = highland(testQuery.save || [])
                .flatMap((o) => highland(db.save(o)));
        } else {// if (method === 'saveStream'){
            saveStream = db.saveStream(testQuery.save || []);
        }

        highland([
            db.importStream(testQuery.import || []),
            saveStream
        ])
        .sequence()
        .errors(function(error) {
            if (testQuery.error != null) {
                try {
                    expect(error.name).to.equal(testQuery.error.name);
                    expect(error.message).to.equal(testQuery.error.message);
                    expect(error.extra.validationErrors).to.deep.equal(testQuery.error.validationErrors);
                    expect(error.extra.object).to.deep.equal(testQuery.import[0]);
                } catch (e) {
                    console.log('------------------');
                    console.log('>>>', chalk.blue(inspect(testQuery, {depth: 10, colors: true})));
                    console.log('------------------');
                    console.log('>>>', chalk.red(inspect(e, {depth: 10, colors: true})));
                    console.log('------------------');
                    console.log(error.stack);
                    // console.log('iii', error);
                    return reject(e);
                }
                return resolve();
            } else {
                console.log('xxx>', error);
                return reject(error);
            }
        })
        .done(() => {

            db.exportStream().toArray((exportedData) => {
                exportedData = _.sortBy(exportedData, ['_type', '_id']);
                const results = _.sortBy(testQuery.results, ['_type', '_id']);
                try {
                    if (results) {
                        expect(exportedData).to.deep.equal(results);
                    }
                    return resolve();
                } catch(e) {
                    console.log('------------------');
                    console.log('query>', chalk.grey(inspect(_.omit(testQuery, 'results'), {depth: 10, colors: true})));
                    console.log('actual>', chalk.red(inspect(exportedData, {depth: 10, colors: true})));
                    console.log('expected>', chalk.blue(inspect(results, {depth: 10, colors: true})));
                    console.log('------------------');
                    return reject(e);
                }
            });
        });
    });
};

describe('#update()', function(){

    var db;
    before(function(done) {
        store().then((registeredDB) => {
            db = registeredDB;
            done();
        }).catch((error) => {
            console.log(error);
            console.log(error.stack);
        });
    });

    beforeEach(function(done) {
        db.clear().then(() => done());
    });

    var testFn = function(testQuery, method) {
        return function(done) {
            processTest(db, testQuery, method).then(() => {
                done();
            }).catch((error) => {
                console.log('testFn>', error);
                console.log(error.stack);
            });
        };
    };

    for (let section of Object.keys(testQueries)) {
        describe(`[${section}]`, function() {
            testQueries[section].map((testQuery) => {
                let methods = testQuery.save ?
                    ['savePromise', 'saveStream']: [''];

                methods.map((method) => {

                    let testLauncher = it;
                    if (testQuery.only) {
                        testLauncher = it.only;
                    }
                    if (testQuery.skip) {
                        testLauncher = it.skip;
                    }
                    testLauncher(
                        `${method}> ${testQuery.should}`,
                        {parallel: false},
                        testFn(testQuery, method)
                    );
                });
            });
        });
    }

});
