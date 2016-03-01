
export default [

    {
        should: 'make simple aggregation',
        model: 'User',
        aggregation: {label: 'gender', total: {$count: 'gender'}},
        query: {gender: 'male'},
        results: [
            { label: 'male', total: 3 }
        ]
    },

    {
        should: 'aggregate the _id',
        model: 'User',
        aggregation: {id: '_id', title: 'name'},
        options: {sort: ['title']},
        results: [
            { title: 'user 0', id: 'user0' },
            { title: 'user 1', id: 'user1' },
            { title: 'user 2', id: 'user2' },
            { title: 'user 3', id: 'user3' },
            { title: 'user 4', id: 'user4' }
        ]
    },
    {
        should: 'aggregate the relation _id',
        model: 'BlogPost',
        aggregation: {title: 'title', 'userId': 'author._id'},
        options: {sort: ['title']},
        results: [
            { title: 'post 0', userId: 'user0' },
            { title: 'post 1', userId: 'user1' },
            { title: 'post 2', userId: 'user2' },
            { title: 'post 3', userId: 'user3' },
            { title: 'post 4', userId: 'user4' },
            { title: 'post 5', userId: 'user0' },
            { title: 'post 6', userId: 'user1' },
            { title: 'post 7', userId: 'user2' },
            { title: 'post 8', userId: 'user3' },
            { title: 'post 9', userId: 'user4' }
        ]
    },
    {
        should: 'forge deep objects',
        model: 'BlogPost',
        aggregation: {'yo.title': 'title', 'yo.user': 'author.name'},
        options: {sort: ['yo.title']},
        results: [
            { yo: { user: 'user 0', title: 'post 0' } },
            { yo: { user: 'user 1', title: 'post 1' } },
            { yo: { user: 'user 2', title: 'post 2' } },
            { yo: { user: 'user 3', title: 'post 3' } },
            { yo: { user: 'user 4', title: 'post 4' } },
            { yo: { user: 'user 0', title: 'post 5' } },
            { yo: { user: 'user 1', title: 'post 6' } },
            { yo: { user: 'user 2', title: 'post 7' } },
            { yo: { user: 'user 3', title: 'post 8' } },
            { yo: { user: 'user 4', title: 'post 9' } }
        ]
    },
    {
        should: 'aggregate the _type',
        model: 'User',
        aggregation: {type: '_type', 'occ': {$count: '_type'}},
        results: [
            { type: 'User', occ: 5 }
        ]
    },
    {
        should: 'aggregate the relation _type',
        model: 'BlogPost',
        aggregation: {authorType: 'author._type', 'occ': {$count: true}},
        results: [
            { authorType: 'User', occ: 10 }
        ]
    },
    {
        should: 'make simple aggregation with query',
        model: 'User',
        aggregation: {x: 'gender', y: {$count: 'gender'}},
        query: {gender: 'male'},
        results: [
            { x: 'male', y: 3 }
        ]
    },
    {
        should: 'accept true for the $count operator',
        model: 'User',
        aggregation: {x: 'gender', y: {$count: true}},
        options: {sort: ['x']},
        results: [
            { x: 'female', y: 2 },
            { x: 'male', y: 3}
        ]
    },

    /** group by types **/
    // {
    //     model: 'Content',
    //     groupBy: '_type',
    //     results: [
    //     ...
    //     ]
    // },

    /** group by deep relation **/
    {
        should: 'aggregate on deep relations',
        model: 'BlogPost',
        aggregation: {gender: 'author.gender', total: {$count: 'author'}},
        options: {sort: '-total'},
        results: [
            { gender: 'male', total: 6},
            { gender: 'female', total: 4 }
        ]
    },
    {
        should: 'aggregate on deep relations with query',
        model: 'BlogPost',
        aggregation: {x: 'author.gender', y: {$count: true}},
        query: {'author.gender': 'male'},
        results: [
            { x: 'male', y: 6 }
        ]
    },
    {
        should: 'aggregate on deep relations with query and operator',
        model: 'BlogPost',
        aggregation: {gender: 'author.gender', nbSubscriptions: {$count: 'author.subscribedMailingList'}},
        query: {'author.gender': 'female', 'author.subscribedMailingList': true},
        results: [
            { gender: 'female', nbSubscriptions: 4 }
        ]
    },
    /** group by deep relation with avg operator on ratting **/
    {
        should: 'accept $avg operator',
        model: 'BlogPost',
        aggregation: {
            gender: 'author.gender',
            ratting: {$avg: 'ratting'}
        },
        options: {sort: '-ratting'},
        results: [
            { gender: 'male', ratting: 2.5 },
            { gender: 'female', ratting: 1.5 }
        ]
    },

    /** max operator **/
    {
        should: 'accept $max operator',
        model: 'BlogPost',
        aggregation: {
            gender: 'author.gender',
            rattingMax: {$max: 'ratting'}
        },
        options: {sort: ['-rattingMax']},
        results: [
            { gender: 'male', rattingMax: 5},
            { gender: 'female', rattingMax: 3 }
        ]
    },

    /** group by multiple properties **/
    {
        should: 'sort the results by label',
        model: 'BlogPost',
        aggregation: {
            isPublished: 'isPublished',
            gender: 'author.gender',
            total: {$count: 'isPublished'}
        },
        options: {sort: ['isPublished', 'gender']},
        results: [
            { isPublished: false, gender: 'female', total: 2},
            { isPublished: false, gender: 'male', total: 2},
            { isPublished: true, gender: 'female', total: 2},
            { isPublished: true, gender: 'male', total: 4}
        ]
    },
    {
        should: 'sort the results by label in inversed order',
        model: 'BlogPost',
        aggregation: {
            isPublished: 'isPublished',
            gender: 'author.gender',
            total: {$count: 'isPublished'}
        },
        options: {sort: ['-total', 'isPublished', 'gender']},
        results: [
            { isPublished: true, gender: 'male', total: 4},
            { isPublished: false, gender: 'female', total: 2},
            { isPublished: false, gender: 'male', total: 2},
            { isPublished: true, gender: 'female', total: 2}
        ]
    },
    {
        should: 'sort the results by multiple labels',
        model: 'BlogPost',
        aggregation: {
            isPublished: 'isPublished',
            gender: 'author.gender',
            total: {$avg: 'ratting'}
        },
        options: {sort: ['isPublished', 'gender']},
        results: [
            { isPublished: false, gender: 'female', total: 1.5},
            { isPublished: false, gender: 'male', total: 1.5},
            { isPublished: true, gender: 'female', total: 1.5},
            { isPublished: true, gender: 'male', total: 3}
        ]
    },
    {
        should: 'sort the results by multiple labels with query',
        model: 'BlogPost',
        aggregation: {
            isPublished: 'isPublished',
            gender: 'author.gender',
            total: {$avg: 'ratting'}
        },
        query: {isPublished: {$exists: true}},
        options: {sort: ['isPublished', 'gender']},
        results: [
            { isPublished: false, gender: 'female', total: 1.5},
            { isPublished: false, gender: 'male', total: 1.5},
            { isPublished: true, gender: 'female', total: 1.5},
            { isPublished: true, gender: 'male', total: 3}
        ]
    },

    /*** query ***/
    {
        should: 'query by _id',
        model: 'BlogPost',
        aggregation: {title: 'title', id: '_id'},
        query: {_id: 'blogpost0'},
        results: [{
            title: 'post 0',
            id: 'blogpost0'
        }]
    },

    /*** limit ***/
    {
        should: 'limit the number of results',
        model: 'BlogPost',
        aggregation: {
            isPublished: 'isPublished',
            gender: 'author.gender',
            total: {$count: 'isPublished'}
        },
        options: {limit: 2, sort: ['isPublished', 'gender']},
        results: [
            { isPublished: false, gender: 'female', total: 2},
            { isPublished: false, gender: 'male', total: 2}
        ]
    },

    /*** distinct ***/
    {
        should: 'distinct the results',
        model: 'BlogPost',
        aggregation: {authorId: 'author._id'},
        options: {distinct: true, sort: 'authorId'},
        results: [
            {authorId: 'user0'},
            {authorId: 'user1'},
            {authorId: 'user2'},
            {authorId: 'user3'},
            {authorId: 'user4'}
        ]
    },

    /*** concat ***/
    {
        should: 'concat properties values',
        model: 'BlogPost',
        aggregation: {authorId: {$concat: 'author._id'}},
        options: {sort: 'authorId'},
        results: [{
            authorId: [
                'user0',
                'user0',
                'user1',
                'user1',
                'user2',
                'user2',
                'user3',
                'user3',
                'user4',
                'user4'
            ]
        }]
    },
    {
        should: 'concat properties values with distinct',
        model: 'BlogPost',
        aggregation: {authorId: {$concat: 'author._id'}},
        options: {sort: 'authorId', distinct: true},
        results: [{authorId: ['user0', 'user1', 'user2', 'user3', 'user4']}]
    },


    /*** errors ***/
    {
        should: 'throw an error if the operator is unknown',
        model: 'BlogPost',
        aggregation: {
            gender: 'author.gender',
            ratting: {$unknownOperator: 'ratting'}
        },
        error: 'aggregate: unknown operator "$unknownOperator"'
    },
    {
        should: 'throw an error if the property is unknown',
        model: 'BlogPost',
        aggregation: {
            gender: 'author.gender',
            ratting: {$avg: 'unknownProperty'}
        },
        error: 'aggregate: unknown property "unknownProperty" for model "BlogPost"'
    },
    {
        should: 'throw an error when sorting with an unknown variable',
        model: 'BlogPost',
        aggregation: {
            gender: 'author.gender',
            ratting: {$avg: 'ratting'}
        },
        options: {sort: ['unknownVariable']},
        error: 'aggregate: unknown sorting constraint "unknownVariable"'
    }
    // TODO to be implemented
    // {
    //     model: 'Thing',
    //     groupBy: {
    //         property: ['_type', 'gender']
    //     },
    //     results: [
    //         {
    //             label: 'Comment',
    //             value: [
    //                 {label: 'male', value: 16},
    //                 {label: 'female', value: 10}
    //             ]
    //         },
    //         {
    //             label: 'BlogPost',
    //             value: [
    //                 {label: 'male', value: 6},
    //                 {label: 'female', value: 4}
    //             ]
    //         },
    //         {
    //             label: 'Book',
    //             value: [...]
    //         }
    //     ]
    // }
];
