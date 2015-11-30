
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
        aggregation: {id: '_id'},
        results: [
            { id: 'http://tests.archimedes.org/instances/user0' },
            { id: 'http://tests.archimedes.org/instances/user1' },
            { id: 'http://tests.archimedes.org/instances/user3' },
            { id: 'http://tests.archimedes.org/instances/user2' },
            { id: 'http://tests.archimedes.org/instances/user4' }
        ]
    },
    {
        should: 'aggregate the _type',
        model: 'User',
        aggregation: {type: '_type', 'occ': {$count: '_type'}},
        results: [
            { type: 'http://tests.archimedes.org/classes/User', occ: 5 }
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
        results: [
            { x: 'male', y: 3},
            { x: 'female', y: 2 }
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