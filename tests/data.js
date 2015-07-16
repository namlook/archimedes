
import store from './db';

import {inspect} from 'util';

var generateTags = function(i) {
    let _tags = [];
    for (let j = 0; j < i % 4; j++) {
        _tags.push(`tag${i + j}`);
    }
    return _tags;
};


var generateComments = function(i) {
    let _comments = [];
    for (let k = 0; k < i % 8; k++) {
        _comments.push({
            _id: `comment${k}${i}`,
            _type: 'Comment'
        });
    }
    return _comments;
};

/** blogposts **/
var blogposts = [];
for (let i = 0; i < 10; i++) {
    blogposts.push({
        _id: `blogpost${i}`,
        title: `post ${i}`,
        body: `this is the body of the post ${i}`,
        createdDate: new Date(1984, 7, i + 1),
        author: {
            _id: `user${i % 5}`,
            _type: 'User'
        },
        tags: generateTags(i),
        ratting: i % 6,
        isPublished: Boolean(i % 3),
        comments: generateComments(i)
    });
}

/** comments **/
var comments = [];
for (let i = 0; i < 10; i++) {
    for (let k = 0; k < i % 8; k++) {
        let sensation = (k + 10 + i) % 3 ? 'rocks' : 'sucks';
        let thing = (k + i) % 5 ? 'thing' : 'stuff';
        comments.push({
            _id: `comment${k}${i}`,
            _type: 'Comment',
            body: `this ${thing} ${sensation} !`,
            author: {
                _id: `user${i % 5}`,
                _type: 'User'
            }
        });
    }
}

/** users **/
var users = [];
for (let i = 0; i < 5; i++) {
    users.push({
        _id: `user${i}`,
        _type: 'User',
        name: `user ${i}`,
        gender: i % 2 ? 'female' : 'male',
        birthday: new Date(1980 + i, i, 10 + i)
    });
}

var verbose = false;
export default function loadDb() {
    return new Promise((resolve, reject) => {

        var db;
        store().then((registeredDB) => {
            db = registeredDB;
            return db.clear();

        }).then(() => {
            return Promise.all([
                db.batchSync('BlogPost', blogposts),
                db.batchSync('Comment', comments),
                db.batchSync('User', users)
            ]);
        }).then((results) => {
            if (verbose) {
                console.log(inspect(results, {depth: 10}));
                console.log(results[0].length, 'blogposts saved');
                console.log(results[1].length, 'comments saved');
                console.log(results[2].length, 'users saved');
            }
            resolve(db);

        }).catch((error) => {
            if (verbose) {
                console.log(error);
                console.log(error.stack);
            }
            reject(error);
        });
    });
}

if (require.main === module) {
    loadDb();
}



