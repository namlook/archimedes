
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
            _id: `comment${k + i}`,
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

var verbose = false;
export default function loadDb() {
    return new Promise((resolve, reject) => {

        var db;
        store().then((registeredDB) => {
            db = registeredDB;
            return db.clear();

        }).then(() => {
            return db.batchSync('BlogPost', blogposts);

        }).then((results) => {
            if (verbose) {
                console.log(inspect(results, {depth: 10}));
                console.log(results.length, 'blogposts saved');
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



