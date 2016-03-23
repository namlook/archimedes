
import store from './db';
import _ from 'lodash';
import Promise from 'bluebird';
import {inspect} from 'util';

var generateTags = function(i) {
    let _tags = [];
    for (let j = 0; j < i % 4; j++) {
        _tags.push(`tag"${i + j}`);
    }
    return _tags;
};


var generateCredits = function(i) {
    return _.range(0, i % 4).map((index) => {
        return {
            _id: `user${index}`,
            _type: 'User'
        };
    });
};


/** blogposts **/
var blogposts = _.range(0, 10).map((i) => {
    return {
        _id: `blogpost${i}`,
        _type: 'BlogPost',
        title: `post ${i}`,
        body: `this is the body of the post ${i}`,
        createdDate: new Date(Date.UTC(1984, 7, i + 1)),
        author: {
            _id: `user${i % 5}`,
            _type: 'User'
        },
        credits: generateCredits(i),
        tags: generateTags(i),
        ratting: i % 6,
        isPublished: Boolean(i % 3)
    };
});


/** comments **/
var comments = [];
for (let i = 0; i < 10; i++) {
    for (let k = 0; k < i % 8; k++) {
        let sensation = (k + 10 + i) % 3 ? 'rocks' : 'sucks';
        let thing = (k + i) % 5 ? 'thing' : 'stuff';
        let ratting;
        if (i % 3 === 0) {
            ratting = i % 5;
        }
        comments.push({
            _id: `comment${k}${i}`,
            _type: 'Comment',
            body: `this ${thing} ${sensation} !`,
            target: {_id: `blogpost${i}`, _type: 'BlogPost'},
            author: {
                _id: `user${k}`,
                _type: 'User'
            },
            ratting: ratting
        });
    }
}


/** users **/
var users = _.range(0, 5).map((i) => {
    let user = {
        _id: `user${i}`,
        _type: 'User',
        name: `user ${i}`,
        gender: i % 2 ? 'female' : 'male',
        birthday: new Date(Date.UTC(1980 + i, i, 10 + i))
    };

    if (i % 2) {
        user.subscribedMailingList = true;
    }

    return user;
});


const highland = require('highland');

let verbose = false;
export default function loadDb() {
    return new Promise((resolve, reject) => {

        // console.dir(users.map((o) => [o.name, o.gender]), {depth: 10})
        // console.dir(blogposts.map((o) => ({post: o.title, author: o.author, credits: o.credits})), {depth: 10})

        store().then((db) => {
            highland([
                highland(db.clear()),
                db.saveStream(blogposts),
                db.saveStream(comments),
                db.saveStream(users)
            ])
            .sequence()
            .done(() => {
                // csvFile.pipe(db.importCsvStream({csv: {arraySeparator: '|'}})).done(() => {
                resolve(db);
                // });
            });
        });
    });
}

if (require.main === module) {
    loadDb().catch((error) => {
        console.log(error);
        console.log(error.stack);
    });
}
