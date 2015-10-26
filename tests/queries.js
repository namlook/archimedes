
export default [
    {
        model: 'BlogPost',
        query: {},
        ids: [
            'blogpost0',
            'blogpost1',
            'blogpost2',
            'blogpost3',
            'blogpost4',
            'blogpost5',
            'blogpost6',
            'blogpost7',
            'blogpost8',
            'blogpost9'
        ]

    },
    {
        model: 'BlogPost',
        query: {title: {$exists: true}},
        ids: [
            'blogpost0',
            'blogpost1',
            'blogpost2',
            'blogpost3',
            'blogpost4',
            'blogpost5',
            'blogpost6',
            'blogpost7',
            'blogpost8',
            'blogpost9'
        ]
    },
    {
        model: 'BlogPost',
        query: {title: {$exists: false}},
        ids: []
    },
    {
        model: 'BlogPost',
        query: {ratting: {$exists: true}},
        ids: [
            'blogpost0',
            'blogpost1',
            'blogpost2',
            'blogpost3',
            'blogpost4',
            'blogpost5',
            'blogpost6',
            'blogpost7',
            'blogpost8',
            'blogpost9'
        ]
    },
    {
        model: 'BlogPost',
        query: {ratting: {$exists: false}},
        ids: []
    },

    /*** strings ***/

    {
        model: 'BlogPost',
        query: {title: 'post 1'},
        ids: ['blogpost1']
    },
    {
        model: 'BlogPost',
        query: {title: {$ne: 'post 1'}},
        ids: [
            'blogpost0',
            'blogpost2',
            'blogpost3',
            'blogpost4',
            'blogpost5',
            'blogpost6',
            'blogpost7',
            'blogpost8',
            'blogpost9'
        ]
    },
    {
        model: 'BlogPost',
        query: {title: {$in: ['post 1', 'post 2']}},
        ids: ['blogpost1', 'blogpost2']
    },
    {
        model: 'BlogPost',
        query: {title: {$nin: ['post 1', 'post 2']}},
        ids: [
            'blogpost0',
            'blogpost3',
            'blogpost4',
            'blogpost5',
            'blogpost6',
            'blogpost7',
            'blogpost8',
            'blogpost9'
        ]
    },
    {
        model: 'BlogPost',
        query: {body: {$regex: 'body of the post 4$'}},
        ids: ['blogpost4']
    },
    {
        model: 'BlogPost',
        query: {body: {$iregex: 'Body Of \\w+ post 4$'}},
        ids: ['blogpost4']
    },


    /*** numbers ***/
    {
        model: 'BlogPost',
        query: {ratting: 4},
        ids: ['blogpost4']
    },
    {
        model: 'BlogPost',
        query: {ratting: {$ne: 4}},
        ids: [
            'blogpost0',
            'blogpost1',
            'blogpost2',
            'blogpost3',
            'blogpost5',
            'blogpost6',
            'blogpost7',
            'blogpost8',
            'blogpost9'
        ]
    },
    {
        model: 'BlogPost',
        query: {ratting: {$lt: 3}},
        ids: [
            'blogpost0',
            'blogpost1',
            'blogpost2',
            'blogpost6',
            'blogpost7',
            'blogpost8'
        ]
    },
    {
        model: 'BlogPost',
        query: {ratting: {$lte: 3}},
        ids: [
            'blogpost0',
            'blogpost1',
            'blogpost2',
            'blogpost3',
            'blogpost6',
            'blogpost7',
            'blogpost8',
            'blogpost9'
        ]
    },
    {
        model: 'BlogPost',
        query: {ratting: {$gt: 3}},
        ids: [ 'blogpost4', 'blogpost5' ]
    },
    {
        model: 'BlogPost',
        query: {ratting: {$gte: 3}},
        ids: [ 'blogpost3', 'blogpost4', 'blogpost5', 'blogpost9' ]
    },
    {
        model: 'BlogPost',
        query: {ratting: {$in: [1, 3]}},
        ids: [ 'blogpost1', 'blogpost3', 'blogpost7', 'blogpost9' ]
    },
    {
        model: 'BlogPost',
        query: {ratting: {$nin: [1, 3]}},
        ids: [
            'blogpost0',
            'blogpost2',
            'blogpost4',
            'blogpost5',
            'blogpost6',
            'blogpost8'
        ]
    },

    /*** boolean ***/
    {
        model: 'BlogPost',
        query: {isPublished: true},
        ids: [
            'blogpost1',
            'blogpost2',
            'blogpost4',
            'blogpost5',
            'blogpost7',
            'blogpost8'
        ]
    },
    {
        model: 'BlogPost',
        query: {isPublished: {$ne: true}},
        ids: [
            'blogpost0',
            'blogpost3',
            'blogpost6',
            'blogpost9'
        ]
    },

    /*** date ***/
    {
        model: 'BlogPost',
        query: {createdDate: new Date(Date.UTC(1984, 7, 3))},
        ids: [
            'blogpost2'
        ]
    },
    {
        model: 'BlogPost',
        query: {createdDate: {$lt: new Date(Date.UTC(1984, 7, 3))}},
        ids: [
            'blogpost0',
            'blogpost1'
        ]
    },
    {
        model: 'BlogPost',
        query: {createdDate: {$lte: new Date(Date.UTC(1984, 7, 3))}},
        ids: [
            'blogpost0',
            'blogpost1',
            'blogpost2'
        ]
    },
    {
        model: 'BlogPost',
        query: {createdDate: {$gt: new Date(Date.UTC(1984, 7, 7))}},
        ids: [
            'blogpost7',
            'blogpost8',
            'blogpost9'
        ]
    },
    {
        model: 'BlogPost',
        query: {createdDate: {$gte: new Date(Date.UTC(1984, 7, 7))}},
        ids: [
            'blogpost6',
            'blogpost7',
            'blogpost8',
            'blogpost9'
        ]
    },

    /*** ids ***/
    {
        model: 'BlogPost',
        query: {_id: {$in: ['blogpost6', 'blogpost7', 'blogpost8']}},
        ids: [
            'blogpost6',
            'blogpost7',
            'blogpost8'
        ]
    },


    /*** relations ***/
    {
        model: 'BlogPost',
        query: {'author._id': 'user1'},
        ids: [ 'blogpost1', 'blogpost6' ]
    },
    {
        model: 'BlogPost',
        query: {'author': 'user1'},
        ids: [ 'blogpost1', 'blogpost6' ]
    },
    {
        model: 'BlogPost',
        query: {'author.gender': 'female'},
        ids: [ 'blogpost1', 'blogpost3', 'blogpost6', 'blogpost8' ]
    },
    {
        model: 'BlogPost',
        query: {'author.birthday': {$lt: new Date(Date.UTC(1982, 1, 1))}},
        ids: [ 'blogpost0', 'blogpost1', 'blogpost5', 'blogpost6' ]
    },
    {
        model: 'BlogPost',
        query: {'credits.name': 'user 1'},
        ids: [ 'blogpost2', 'blogpost3', 'blogpost6', 'blogpost7' ]
    },
    {
        model: 'BlogPost',
        query: {'credits.gender': 'female'},
        ids: [ 'blogpost2', 'blogpost3', 'blogpost6', 'blogpost7' ]
    },

    /*** relations inverse ***/
    {
        model: 'User',
        query: {'blogPosts.ratting': 2},
        ids: ['user2', 'user3']
    },
    {
        model: 'User',
        query: {'comments._id': 'comment03'},
        ids: ['user0']
    },
    {
        model: 'User',
        query: {'comments._id': {$in: ['comment03', 'comment12']}},
        ids: ['user0', 'user1']
    },
    {
        model: 'BlogPost',
        query: {'comments.body': 'this thing sucks !'},
        ids: [
            'blogpost2',
            'blogpost5',
            'blogpost6',
            'blogpost6',
            'blogpost7',
            'blogpost7'
        ]
    },
    {
        model: 'User',
        query: {'comments.body': 'this thing sucks !'},
        ids: [
            'user0',
            'user1',
            'user2',
            'user3',
            'user4'
        ]
    },
    {
        model: 'Comment',
        query: {'target._id': 'blogpost7'},
        ids: [
            'comment07',
            'comment17',
            'comment27',
            'comment37',
            'comment47',
            'comment57',
            'comment67'
        ]
    },


    /**** options ****/
    {
        model: 'BlogPost',
        query: {},
        options: {limit: 3},
        ids: [
            'blogpost0',
            'blogpost1',
            'blogpost2'
        ]
    },
    {
        model: 'BlogPost',
        query: {},
        options: {limit: 3, offset: 3},
        ids: [
            'blogpost3',
            'blogpost4',
            'blogpost5'
        ]
    },
    {
        model: 'BlogPost',
        query: {},
        options: {sort: 'ratting'},
        ids: [
            'blogpost0',
            'blogpost6',
            'blogpost1',
            'blogpost7',
            'blogpost2',
            'blogpost8',
            'blogpost3',
            'blogpost9',
            'blogpost4',
            'blogpost5'
        ]
    },
    {
        model: 'BlogPost',
        query: {},
        options: {sort: '-ratting'},
        ids: [
            'blogpost5',
            'blogpost4',
            'blogpost3',
            'blogpost9',
            'blogpost2',
            'blogpost8',
            'blogpost1',
            'blogpost7',
            'blogpost0',
            'blogpost6'
        ]
    },
    {
        model: 'BlogPost',
        query: {},
        options: {sort: 'isPublished,-title'},
        ids: [
            'blogpost9',
            'blogpost6',
            'blogpost3',
            'blogpost0',
            'blogpost8',
            'blogpost7',
            'blogpost5',
            'blogpost4',
            'blogpost2',
            'blogpost1'
        ]
    },
    {
        model: 'BlogPost',
        query: {},
        options: {fields: 'title,ratting', limit: 3},
        results: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                ratting: 0
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                ratting: 1
            },
            {
                _id: 'blogpost2',
                _type: 'BlogPost',
                title: 'post 2',
                ratting: 2
            }
        ]
    },
    {
        model: 'BlogPost',
        query: {},
        options: {fields: ['title', 'ratting'], limit: 3},
        results: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                ratting: 0
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                ratting: 1
            },
            {
                _id: 'blogpost2',
                _type: 'BlogPost',
                title: 'post 2',
                ratting: 2
            }
        ]
    },
    {
        model: 'User',
        query: {},
        options: {fields: ['name', 'subscribedMailingList']},
        results: [
            {
                _id: 'user0',
                name: 'user 0',
                _type: 'User'
            },
            {
                _id: 'user1',
                subscribedMailingList: true,
                name: 'user 1',
                _type: 'User'
            },
            {
                _id: 'user2',
                name: 'user 2',
                _type: 'User'
            },
            {
                _id: 'user3',
                _type: 'User',
                name: 'user 3',
                subscribedMailingList: true
            },
            {
                _id: 'user4',
                name: 'user 4',
                _type: 'User'
            }
        ]
    },
    {
        model: 'BlogPost',
        query: {'comments.body': 'this thing sucks !'},
        options: {distinct: true},
        ids: [
            'blogpost2',
            'blogpost5',
            'blogpost6',
            'blogpost7'
        ]
    },

    /*** bad queries ***/
    {
        model: 'BlogPost',
        query: {title: true},
        error: 'malformed query',
        errorExtraMessage: '"title" must be a string'
    },
    {
        model: 'BlogPost',
        query: {ratting: {$badOperator: true}},
        error: 'malformed query',
        errorExtraMessage: 'unknown operator "$badOperator"'
    },
    {
        model: 'BlogPost',
        query: {'comment.body': 'this thing rocks !'},
        error: 'malformed query',
        errorExtraMessage: 'unknown property "comment" on model "BlogPost"'
    },
    {
        model: 'BlogPost',
        query: {'ratting._id': 'foo'},
        error: 'malformed query',
        errorExtraMessage: 'cannot reach ratting._id on BlogPost: ratting is not a relation'
    },

    /*** bad options ***/
    {
        model: 'BlogPost',
        query: {},
        options: {sort: 'unknownProperty'},
        error: 'malformed options',
        errorExtraMessage: 'sort: unknown property "unknownProperty" on model "BlogPost"'
    },
    {
        model: 'BlogPost',
        query: {},
        options: {fields: ['unknownProperty']},
        error: 'malformed options',
        errorExtraMessage: 'fields: unknown property "unknownProperty" on model "BlogPost"'
    }
];