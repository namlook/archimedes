
import 'source-map-support/register';



import Lab from 'lab';
var lab = exports.lab = Lab.script();

import Code from 'code';
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
// var beforeEach = lab.beforeEach;
var expect = Code.expect;

import testQueries from './queries';
import loadDb from './data';
import chalk from 'chalk';
import _ from 'lodash';
import {inspect} from 'util';


// var nbTests = 0;
var processTest = function(db, testQuery) {

    // var testQuery = _testQueries.shift();
    return new Promise((resolve, reject) => {

        if (!testQuery) {
            return resolve();
        }

        let promise = db.find(testQuery.model, testQuery.query);

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
                    return reject(e);
                }
                // nbTests++;
                return resolve();
                // return resolve(processTest(db, _testQueries));
            });

        } else {

            promise.then((results) => {
                let ids = results.map((item) => item._id);

                try {
                    expect(ids).to.deep.equal(testQuery.ids);
                } catch(e) {
                    console.log('------------------');
                    console.log('>>>', chalk.blue(inspect(testQuery, {depth: 10, colors: true})));
                    console.log('------------------');
                    return reject(e);
                }

                // nbTests++;
                return resolve();
                // return resolve(processTest(db, _testQueries));
            }).catch((error) => {
                console.log('xxxx', testQuery);
                return reject(error);
            });

        }

    });
};


// loadDb().then((db) => {

//     processTest(db, testQueries).then(() => {
//         console.log('ok', nbTests, 'tests passed');
//     }).catch((errors) => {
//         console.log(inspect(errors, {depth: 10, colors: true}));
//         console.log(chalk.red(errors.stack));
//     });

// }).catch((error) => {
//     console.log('--xxxx--');
//     console.log(error);
// });



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
        it(`${testQuery.model}: ${inspect(testQuery.query)}`, testFn(testQuery));
    }
});



