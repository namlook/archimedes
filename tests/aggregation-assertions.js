
export default [

    {
        should: 'aggregate using OBJECT aggregator',
        model: 'BlogPost',
        field: {
            tags: 'tags',
            publishedCount: {
                $aggregator: 'object',
                $fields: {
                    isPublished: 'isPublished',
                    total: {$aggregator: 'count'}
                }
            },
        },
        filter: {
            ratting: 3
        },
        // options: {sort: ['_id']},
        results: [
            {bof: 'blah'}
        ]
    },


    {
        should: 'aggregate using OBJECT aggregator (deep relation)',
        model: 'BlogPost',
        field: {
            ratting: 'ratting',
            creditedUser: {
                $aggregator: 'object',
                $fields: {
                    name: 'credits.name',
                    gender: 'credits.gender'
                }
            },
        },
        filter: {
            ratting: 3
        },
        // options: {sort: ['_id']},
        results: [
            {bof: 'blah'}
        ]
    },

    {
        should: 'forge object from aggregation (2)',
        model: 'BlogPost',
        field: {
            tag: 'tags',
            // tag: {
            //     $aggregator: 'array',
            //     $property: {
            //         $aggregator: 'object',
            //         $properties: {
            //             title: 'tags'
            //         }
            //     }
            // },
            creditedGenderCount: {
                $aggregator: 'object',
                $properties: {
                    gender: 'credits.gender',
                    count: {$aggregator: 'count'}
                }
            }
        },
        options: {sort: ['tag']},
        results: [
            { bof: 'bla'},
        ]
    },

    // {
    //     should: 'forge array from aggregation',
    //     model: 'BlogPost',
    //     field: {
    //         tag: 'tags',
    //         creditGenderCount: [{
    //             gender: 'credits.gender',
    //             count: 'count'
    //         }]
    //     },
    //     aggregate: {
    //         count: {$aggregator: 'count'}
    //     },
    //     options: {sort: ['tag']},
    //     results: [
    //         { bof: 'bla'},
    //     ]
    // },


    {
        should: 'make a COUNT aggregation',
        model: 'User',
        field: {
            label: 'gender'
        },
        aggregate: {
            total: {$count: '_id'}
            // {
            //     operator: 'cluster',
            //     $property: 'elevation',
            //     step: 100
            // },
            // {
            //     $operator: 'floor',
            //     $property: {$aggregator: 'avg', $property: 'elevation'}
            // },
            // {
            //     operator: 'compute',
            //     expression: 'startwith(<label>, "foo"')
            // }
        },
        filter: {gender: 'male'},
        results: [
            { label: 'male', total: 3 }
        ]
    },

    {
        should: 'make an AVG aggregation',
        model: 'BlogPost',
        field: {
            author: 'author'
        },
        aggregate: {
            avgRatting: {$avg: 'ratting'}
        },
        options: {sort: ['-avgRatting']},
        results: [
            { author: { _id: 'user4', _type: 'User' }, avgRatting: 3.5 },
            { author: { _id: 'user0', _type: 'User' }, avgRatting: 2.5 },
            { author: { _id: 'user3', _type: 'User' }, avgRatting: 2.5 },
            { author: { _id: 'user2', _type: 'User' }, avgRatting: 1.5 },
            { author: { _id: 'user1', _type: 'User' }, avgRatting: 0.5 }
        ]
    },

    {
        should: 'make an SUM aggregation',
        model: 'BlogPost',
        field: {
            author: 'author'
        },
        aggregate: {
            totalRatting: {$sum: 'ratting'}
        },
        options: {sort: ['-totalRatting']},
        results: [
            { author: { _id: 'user4', _type: 'User' }, totalRatting: 7 },
            { author: { _id: 'user0', _type: 'User' }, totalRatting: 5 },
            { author: { _id: 'user3', _type: 'User' }, totalRatting: 5 },
            { author: { _id: 'user2', _type: 'User' }, totalRatting: 3 },
            { author: { _id: 'user1', _type: 'User' }, totalRatting: 1 }
        ]
    },


    {
        should: 'make an MIN aggregation',
        model: 'BlogPost',
        field: {
            authorName: 'author.name'
        },
        aggregate: {
            minRatting: {$min: 'ratting'}
        },
        options: {sort: ['minRatting', 'authorName']},
        results: [
            { authorName: 'user 0', minRatting: 0 },
            { authorName: 'user 1', minRatting: 0 },
            { authorName: 'user 2', minRatting: 1 },
            { authorName: 'user 3', minRatting: 2 },
            { authorName: 'user 4', minRatting: 3 }
        ]
    },

    {
        should: 'make an MAX aggregation',
        model: 'BlogPost',
        field: {
            authorName: 'author.name'
        },
        aggregate: {
            maxRatting: {$max: 'ratting'}
        },
        options: {sort: ['-maxRatting', 'authorName']},
        results: [
            { authorName: 'user 0', maxRatting: 5 },
            { authorName: 'user 4', maxRatting: 4 },
            { authorName: 'user 3', maxRatting: 3 },
            { authorName: 'user 2', maxRatting: 2 },
            { authorName: 'user 1', maxRatting: 1 }
        ]
    },

    {
        should: 'aggregate with a query',
        model: 'User',
        field: {
            sex: 'gender'
        },
        aggregate: {
            total: {$count: 'gender'}
        },
        filter: {gender: 'male'},
        results: [
            { sex: 'male', total: 3 }
        ]
    },

    {
        should: 'accept no property for the COUNT aggregator',
        model: 'User',
        field: {
            sex: 'gender'
        },
        aggregate: {
            count: {$count: true}
        },
        options: {sort: ['sex']},
        results: [
            { sex: 'female', count: 2 },
            { sex: 'male', count: 3}
        ]
    },


    // {
    //     should: 'make an expression',
    //     model: 'BlogPost',
    //     field: {
    //         author: 'author',
    //         avgRatting: {
    //             $aggregator: 'compute',
    //             expression: 'floor(avg(<ratting>))'
    //         }
    //     },
    //     options: {sort: ['-avgRatting']},
    //     results: [
    //         { author: { _id: 'user4', _type: 'User' }, avgRatting: 3.5 },
    //         { author: { _id: 'user0', _type: 'User' }, avgRatting: 2.5 },
    //         { author: { _id: 'user3', _type: 'User' }, avgRatting: 2.5 },
    //         { author: { _id: 'user2', _type: 'User' }, avgRatting: 1.5 },
    //         { author: { _id: 'user1', _type: 'User' }, avgRatting: 0.5 }
    //     ]
    // },
    //
    // {
    //     should: 'make an stdev aggregation',
    //     model: 'BlogPost',
    //     field: {
    //         author: 'author',
    //         stdevRatting: {
    //             $aggregator: 'stdev',
    //             $property: 'ratting'
    //         }
    //     },
    //     options: {sort: ['-avgRatting']},
    //     results: [
    //         {foo: 'bof'}
    //     ]
    // },

    {
        should: 'aggregate the _type',
        model: 'User',
        field: {type: '_type'},
        aggregate: {'occ': {$count: '_type'}},
        results: [
            { type: 'User', occ: 5 }
        ]
    },
    {
        should: 'aggregate the relation _type',
        model: 'BlogPost',
        field: {authorType: 'author._type', 'occ': {$count: true}},
        results: [
            { authorType: 'User', occ: 10 }
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
        field: {
            gender: 'author.gender',
        },
        aggregate: {
            total: {$count: 'author'}
        },
        options: {sort: ['-total']},
        results: [
            { gender: 'male', total: 6},
            { gender: 'female', total: 4 }
        ]
    },
    {
        should: 'aggregate on deep relations with query',
        model: 'BlogPost',
        field: {
            sex: 'author.gender',
            count: {$aggregator: 'count'}
        },
        filter: {'author.gender': 'male'},
        results: [
            { sex: 'male', count: 6 }
        ]
    },
    {
        should: 'aggregate on deep relations with query and operator',
        model: 'BlogPost',
        field: {
            gender: 'author.gender',
            nbSubscriptions: {
                $aggregator: 'count',
                $property: 'author.subscribedMailingList'
            }
        },
        filter: {'author.gender': 'female', 'author.subscribedMailingList': true},
        results: [
            { gender: 'female', nbSubscriptions: 4 }
        ]
    },
    /** group by deep relation with avg operator on ratting **/
    {
        should: 'make AVG aggregation on deep relations',
        model: 'BlogPost',
        field: {
            gender: 'author.gender'
        },
        aggregate: {
            ratting: {$avg: 'ratting'}
        },
        options: {sort: ['-ratting']},
        results: [
            { gender: 'male', ratting: 2.5 },
            { gender: 'female', ratting: 1.5 }
        ]
    },



    /*** concat ***/
    {
        should: 'concat properties values',
        model: 'BlogPost',
        field: {authorId: {$concat: 'author._id'}},
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
        field: {authorId: {$concat: 'author._id'}},
        options: {sort: 'authorId', distinct: true},
        results: [{authorId: ['user0', 'user1', 'user2', 'user3', 'user4']}]
    },


// {
//     field: {
//         label: '_type',
//         'values+.gender': 'gender',
//         'values+.total': {
//             $aggregator: 'count'
//         }
//     }
// }

// {
//     model: 'Thing',
//     field: {
//         label: '_type',
//         values: [{
//             gender: 'gender',
//             total: {
//                 $aggregator: 'count'
//             }
//         }]
//
//     }
// }
//
//
// {
//     field: {
//         blogPostTitle: 'title',
//         'morphologicalFiles+.title': 'morphologicalFiles.title',
//         'morphologicalFiles+.path': 'morphologicalFiles.path'
//     }
// }
//
// {
//     field: {
//         blogPostTitle: 'title',
//         morphologicalFiles: [{
//             title: 'morphologicalFiles.title',
//             path: 'morphologicalFiles.path'
//         }]
//     }
// }


    // TODO to be implemented
    // {
    //     model: 'Thing',
    //     groupBy: {
    //         $property: ['_type', 'gender']
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
