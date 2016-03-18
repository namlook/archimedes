
export default [

    {
        should: 'forge object with aggregation',
        model: 'BlogPost',
        field: {
            creditedAuthor: 'credits',
            'publishedCount.isPublished': 'isPublished',
        },
        aggregate: {
            'publishedCount.total': {$count: true}
        },
        options: {sort: ['-creditedAuthor']},
        results: [
            {creditedAuthor: 'user2', publishedCount: {isPublished: false, total: 1}},
            {creditedAuthor: 'user2', publishedCount: {isPublished: true, total: 1}},
            {creditedAuthor: 'user1', publishedCount: {isPublished: true, total: 2}},
            {creditedAuthor: 'user1', publishedCount: {isPublished: false, total: 2}},
            {creditedAuthor: 'user0', publishedCount: {isPublished: true, total: 4}},
            {creditedAuthor: 'user0', publishedCount: {isPublished: false, total: 3}}
        ]
    },

    {
        should: 'forge object with aggregation (2)',
        model: 'BlogPost',
        field: {
            tag: 'tags',
            'creditedGenderCount.gender': 'credits.gender'
        },
        aggregate: {
            'creditedGenderCount.count': {$aggregator: 'count'}
        },
        options: {sort: ['tag']},
        results: [
            {tag: 'tag"1', creditedGenderCount: {gender: 'male', count: 1}},
            {tag: 'tag"2', creditedGenderCount: {gender: 'male', count: 1}},
            {tag: 'tag"2', creditedGenderCount: {gender: 'female', count: 1}},
            {tag: 'tag"3', creditedGenderCount: {gender: 'male', count: 3}},
            {tag: 'tag"3', creditedGenderCount: {gender: 'female', count: 2}},
            {tag: 'tag"4', creditedGenderCount: {gender: 'male', count: 2}},
            {tag: 'tag"4', creditedGenderCount: {gender: 'female', count: 1}},
            {tag: 'tag"5', creditedGenderCount: {gender: 'male', count: 3}},
            {tag: 'tag"5', creditedGenderCount: {gender: 'female', count: 1}},
            {tag: 'tag"6', creditedGenderCount: {gender: 'male', count: 1}},
            {tag: 'tag"6', creditedGenderCount: {gender: 'female', count: 1}},
            {tag: 'tag"7', creditedGenderCount: {gender: 'male', count: 3}},
            {tag: 'tag"7', creditedGenderCount: {gender: 'female', count: 2}},
            {tag: 'tag"8', creditedGenderCount: {gender: 'male', count: 2}},
            {tag: 'tag"8', creditedGenderCount: {gender: 'female', count: 1}},
            {tag: 'tag"9', creditedGenderCount: {gender: 'male', count: 3}},
            {tag: 'tag"9', creditedGenderCount: {gender: 'female', count: 1}}
        ]
    },

    {
        skip: true,
        should: 'forge object with aggregation and all its fields',
        model: 'BlogPost',
        field: {
            ratting: 'ratting?',
            author: 'author?',
            body: 'body?',
            createdDate: 'createdDate?',
            slug: 'slug?',
            title: 'title?',
            updatedDate: 'updatedDate?',
            publishedDate: 'publishedDate?',
            isPublished: 'isPublished?',
            _type: '_type',
            _id: '_id'
        },
        aggregate: {
            tags: { '$array': 'tags?' },
            credits: {
                $aggregator: 'array',
                $fields: {
                    _id: 'credits?._id',
                    _type: 'credits?._type'
                }
            },
            backlinks: { '$array': 'backlinks?' }
        },
        options: {sort: ['ratting']},
        results: ['bof']
    },

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
            'author._id': 'author._id',
            'author._type': 'author._type'
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
            { author: 'user4', totalRatting: 7 },
            { author: 'user0', totalRatting: 5 },
            { author: 'user3', totalRatting: 5 },
            { author: 'user2', totalRatting: 3 },
            { author: 'user1', totalRatting: 1 }
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
        field: {
            authorType: 'author._type'
        },
        aggregate: {
            occ: {$count: true}
        },
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
        },
        aggregate: {
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
            gender: 'author.gender'
        },
        aggregate: {
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

    /*** array ***/
    {
        should: 'aggregate values into an array',
        model: 'BlogPost',
        field: {
            _type: '_type'
        },
        aggregate: {
            authorId: {$array: 'author._id'}
        },
        options: {sort: ['authorId']},
        results: [
            {
                _type: 'BlogPost',
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
            }
        ]
    },
    {
        should: 'aggregate values into an array (distinct)',
        model: 'BlogPost',
        field: {
            _type: '_type'
        },
        aggregate: {
            authorId: {
                $aggregator: 'array',
                $property: 'author._id',
                distinct: true
            }
        },
        options: {sort: ['authorId']},
        results: [
            {
                _type: 'BlogPost',
                authorId: [
                   'user0',
                   'user1',
                   'user2',
                   'user3',
                   'user4'
                ]
            }
        ]
    },

    {
        should: 'aggregate values into array of object',
        model: 'BlogPost',
        field: {
            tag: 'tags',
        },
        aggregate: {
            authors: {
                $aggregator: 'array',
                $fields: {
                    gender: 'author.gender',
                    name: 'author.name'
                }
            }
        },
        filter: {
            ratting: 3
        },
        options: {sort: ['tag']},
        results: [
            { tag: 'tag"3', authors: [ { gender: 'female', name: 'user 3' } ] },
            { tag: 'tag"4', authors: [ { gender: 'female', name: 'user 3' } ] },
            { tag: 'tag"5', authors: [ { gender: 'female', name: 'user 3' } ] },
            { tag: 'tag"9', authors: [ { gender: 'male', name: 'user 4' } ] }
        ]
    },

    {
        should: 'aggregate relations into an array',
        model: 'BlogPost',
        field: {
            title: 'title'
        },
        aggregate: {
            creditedAuthors: {$array: 'credits._id'}
        },
        options: {sort: ['title']},
        results: [
            {title: 'post 1', creditedAuthors: ['user0']},
            {title: 'post 2', creditedAuthors: ['user0', 'user1']},
            {title: 'post 3', creditedAuthors: ['user0', 'user1', 'user2']},
            {title: 'post 5', creditedAuthors: ['user0']},
            {title: 'post 6', creditedAuthors: ['user0', 'user1']},
            {title: 'post 7', creditedAuthors: ['user0', 'user1', 'user2']},
            {title: 'post 9', creditedAuthors: ['user0']}
        ]
    },



    {
        should: 'aggregate relations into an array (optional)',
        model: 'BlogPost',
        field: {
            title: 'title',
        },
        aggregate: {
            creditedAuthors: {$array: 'credits?._id'}
        },
        options: {sort: ['title']},
        results: [
            { title: 'post 0'},
            { title: 'post 1', creditedAuthors: [ 'user0' ] },
            { title: 'post 2', creditedAuthors: [ 'user0', 'user1' ] },
            { title: 'post 3', creditedAuthors: [ 'user0', 'user1', 'user2' ] },
            { title: 'post 4'},
            { title: 'post 5', creditedAuthors: [ 'user0' ] },
            { title: 'post 6', creditedAuthors: [ 'user0', 'user1' ] },
            { title: 'post 7', creditedAuthors: [ 'user0', 'user1', 'user2' ] },
            { title: 'post 8'},
            { title: 'post 9', creditedAuthors: [ 'user0' ] }
        ]
    },



    {
        should: 'aggregate deep relation fields into an array',
        model: 'BlogPost',
        field: {
            title: 'title',
        },
        aggregate: {
            creditedAuthors: {
                $aggregator: 'array',
                $fields: {
                    name: 'credits.name',
                    sex: 'credits.gender',
                }
            },
        },
        options: {sort: ['title']},
        results: [
            {
                title: 'post 1',
                creditedAuthors: [ { name: 'user 0', sex: 'male' } ]
            },
            {
                title: 'post 2',
                creditedAuthors: [
                    { name: 'user 0', sex: 'male' },
                    { name: 'user 1', sex: 'female' }
                ]
            },
            {
                title: 'post 3',
                creditedAuthors: [
                    { name: 'user 0', sex: 'male' },
                    { name: 'user 1', sex: 'female' },
                    { name: 'user 2', sex: 'male' }
                ]
            },
            {
                title: 'post 5',
                creditedAuthors: [ { name: 'user 0', sex: 'male' } ]
            },
            {
                title: 'post 6',
                creditedAuthors: [
                    { name: 'user 0', sex: 'male' },
                    { name: 'user 1', sex: 'female' }
                ]
            },
            {
                title: 'post 7',
                creditedAuthors: [
                    { name: 'user 0', sex: 'male' },
                    { name: 'user 1', sex: 'female' },
                    { name: 'user 2', sex: 'male' }
                ]
            },
            {
                title: 'post 9',
                creditedAuthors: [ { name: 'user 0', sex: 'male' } ]
            }
        ]
    },


    {
        should: 'aggregate deep relation fields into an array (2)',
        model: 'BlogPost',
        field: {
            title: 'title',
        },
        aggregate: {
            creditedAuthors: {
                $aggregator: 'array',
                $fields: {
                    _id: 'credits._id',
                    _type: 'credits._type',
                }
            },
        },
        options: {sort: ['title']},
        results: [
            {
                title: 'post 1',
                creditedAuthors: [ { _id: 'user0', _type: 'User' } ]
            },
            {
                title: 'post 2',
                creditedAuthors: [
                    { _id: 'user0', _type: 'User' },
                    { _id: 'user1', _type: 'User' }
                ]
            },
            {
                title: 'post 3',
                creditedAuthors: [
                    { _id: 'user0', _type: 'User' },
                    { _id: 'user1', _type: 'User' },
                    { _id: 'user2', _type: 'User' }
                ]
            },
            {
                title: 'post 5',
                creditedAuthors: [ { _id: 'user0', _type: 'User' } ]
            },
            {
                title: 'post 6',
                creditedAuthors: [
                    { _id: 'user0', _type: 'User' },
                    { _id: 'user1', _type: 'User' }
                ]
            },
            {
                title: 'post 7',
                creditedAuthors: [
                    { _id: 'user0', _type: 'User' },
                    { _id: 'user1', _type: 'User' },
                    { _id: 'user2', _type: 'User' }
                ]
            },
            {
                title: 'post 9',
                creditedAuthors: [ { _id: 'user0', _type: 'User' } ]
            }
        ]
    },

    {
        should: 'aggregate deep relation fields into an array (optional)',
        model: 'BlogPost',
        field: {
            title: 'title'
        },
        aggregate: {
            creditedAuthors: {
                $aggregator: 'array',
                $fields: {
                    name: 'credits?.name',
                    sex: 'credits?.gender',
                }
            },
        },
        options: {sort: ['title']},
        results: [
            { title: 'post 0' },
            { title: 'post 1', creditedAuthors: [ { name: 'user 0', sex: 'male' } ] },
            { title: 'post 2', creditedAuthors: [ { name: 'user 0', sex: 'male' }, { name: 'user 1', sex: 'female' } ] },
            { title: 'post 3', creditedAuthors: [ { name: 'user 0', sex: 'male' }, { name: 'user 1', sex: 'female' }, { name: 'user 2', sex: 'male' } ] },
            { title: 'post 4' },
            { title: 'post 5', creditedAuthors: [ { name: 'user 0', sex: 'male' } ] },
            { title: 'post 6', creditedAuthors: [ { name: 'user 0', sex: 'male' }, { name: 'user 1', sex: 'female' } ] },
            { title: 'post 7', creditedAuthors: [ { name: 'user 0', sex: 'male' }, { name: 'user 1', sex: 'female' }, { name: 'user 2', sex: 'male' } ] },
            { title: 'post 8' },
            { title: 'post 9', creditedAuthors: [ { name: 'user 0', sex: 'male' } ] }
        ]
    }


    // {
    //     should: 'aggregate values into array of object with aggregation',
    //     model: 'BlogPost',
    //     field: {
    //         tag: 'tags',
    //     },
    //     aggregate: {
    //         creditGender: {
    //             $aggregator: 'array',
    //             $fields: {
    //                 gender: 'credits.gender',
    //                 count: {$count: true}
    //             }
    //         }
    //     },
    //     options: {sort: ['tag']},
    //     results: [
    //         { bof: 'bla'},
    //     ]
    // },


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
