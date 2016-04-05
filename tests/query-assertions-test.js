/* eslint-disable no-console */

import 'source-map-support/register';

import Lab from 'lab';
const lab = exports.lab = Lab.script();

import Code from 'code';
const describe = lab.describe;
const it = lab.it;
const before = lab.before;
const expect = Code.expect;

import loadDb from './data';
import chalk from 'chalk';
import _ from 'lodash';
import { inspect } from 'util';

import field from './query-assertions/field-assertions';
import fieldErrors from './query-assertions/field-error-assertions';

import filter from './query-assertions/filter-assertions';
import filterErrors from './query-assertions/filter-error-assertions';

import aggregation from './query-assertions/aggregation-assertions';
import aggregationErrors from './query-assertions/aggregation-error-assertions';

import queryOptions from './query-assertions/option-assertions';
import queryOptionsError from './query-assertions/option-error-assertions';

const testQueries = {
    field,
    'field-errors': fieldErrors,
    filter,
    'filter-errors': filterErrors,
    aggregation,
    'aggregation-errors': aggregationErrors,
    'query-options': queryOptions,
    'query-options-error': queryOptionsError,
};

const processTest = (db, testQuery) => (
    new Promise((resolve, reject) => {
        if (!testQuery) {
            return resolve();
        }

        const query = _.assign({}, testQuery.options, {
            field: testQuery.field,
            filter: testQuery.filter,
            aggregate: testQuery.aggregate,
        });

        return db.queryStream(testQuery.model, query)
            .errors((error) => {
                if (testQuery.error) {
                    try {
                        expect(error.name).to.equal(testQuery.error.name);
                        expect(error.message).to.equal(testQuery.error.message);
                        expect(error.extra.validationErrors)
                            .to.deep.equal(testQuery.error.validationErrors);
                        expect(error.extra.object).to.deep.equal(query);
                        // expect(error.message).to.equal(testQuery.error);
                        // if (_.has(error, 'extra.0.message')) {
                            // expect(error.extra[0].message).to.equal(testQuery.errorExtraMessage);
                        // }
                    } catch (e) {
                        console.log('------------------');
                        console.log(
                            '>>>', chalk.blue(inspect(testQuery, { depth: 10, colors: true }))
                        );
                        console.log('------------------');
                        console.log(
                            '>>>', chalk.red(inspect(e, { depth: 10, colors: true }))
                        );
                        console.log('------------------');
                        console.log(error.stack);
                        console.log('iii', e);
                        return reject(e);
                    }
                    return resolve();
                }
                console.log('xxx>', error);
                return reject(error);
            })
            .toArray((results) => {
                // console.log('===', results);
                try {
                    if (testQuery.results) {
                        expect(results).to.deep.equal(testQuery.results);
                    }
                    return resolve();
                } catch (e) {
                    console.log('------------------');
                    console.log('query>', chalk.grey(
                        inspect(_.omit(testQuery, 'results'), { depth: 10, colors: true })
                    ));
                    console.log(
                        'actual>', chalk.red(inspect(results, { depth: 10, colors: true }))
                    );
                    console.log('expected>', chalk.blue(
                        inspect(testQuery.results, { depth: 10, colors: true })
                    ));
                    console.log('------------------');
                    return reject(e);
                }
            });
    })
);

describe('#query()', () => {
    let db;
    before((done) => {
        loadDb().then((registeredDB) => {
            db = registeredDB;
            done();
        }).catch((error) => {
            console.log(error);
            console.log(error.stack);
        });
    });


    const testFn = (testQuery) =>
        (done) => {
            processTest(db, testQuery).then(() => {
                done();
            }).catch((error) => {
                console.log('vvvvv == testFn == vvvvvv');
                console.dir(error, { depth: 10 });
                console.log(error.stack);
            });
        };

    Object.keys(testQueries).forEach((section) => {
        describe(`[${section}]`, () => {
            testQueries[section].forEach((testQuery) => {
                let testLauncher = it;
                if (testQuery.only) {
                    testLauncher = it.only;
                }
                if (testQuery.skip) {
                    testLauncher = it.skip;
                }
                testLauncher(
                    `${testQuery.model}: ${testQuery.should}`,
                    { parallel: false },
                    testFn(testQuery)
                );
            });
        });
    });
});
