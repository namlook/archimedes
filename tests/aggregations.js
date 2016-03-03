
export default [

    {
        should: 'fetch some basic fields',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting',
            author: 'author',
            tags: ['tags']
        },
        results: [
          { _id: 'blogpost1', _type: 'BlogPost',
            title: 'post 1', score: 1,
            author: { _id: 'user1', _type: 'User' },
            tags: [ 'tag"1' ] },
          { _id: 'blogpost9', _type: 'BlogPost',
            title: 'post 9', score: 3,
            author: { _id: 'user4', _type: 'User' },
            tags: [ 'tag"9' ] },
          { _id: 'blogpost2', _type: 'BlogPost',
            title: 'post 2', score: 2,
            author: { _id: 'user2', _type: 'User' },
            tags: [ 'tag"3', 'tag"2' ] },
          { _id: 'blogpost3', _type: 'BlogPost',
            title: 'post 3', score: 3,
            author: { _id: 'user3', _type: 'User' },
            tags: [ 'tag"3', 'tag"4', 'tag"5' ] },
          { _id: 'blogpost5', _type: 'BlogPost',
            title: 'post 5', score: 5,
            author: { _id: 'user0', _type: 'User' },
            tags: [ 'tag"5' ] },
          { _id: 'blogpost7', _type: 'BlogPost',
            title: 'post 7', score: 1,
            author: { _id: 'user2', _type: 'User' },
            tags: [ 'tag"7', 'tag"8', 'tag"9' ] },
          { _id: 'blogpost6', _type: 'BlogPost',
            title: 'post 6', score: 0,
            author: { _id: 'user1', _type: 'User' },
            tags: [ 'tag"7', 'tag"6' ] }
        ]
    },

    {
        should: 'limit the number of results',
        model: 'BlogPost',
        field: {
            title: 'title'
        },
        options: {limit: 2, sort: ['title']},
        results: [
            {
                title: 'post 0'
            },
            {
                title: 'post 1'
            }
        ]
    },

    {
        should: 'sort the results on multiple fields',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting'
        },
        options: {
            limit: 5,
            sort: ['score', '-title']
        },
        results: [
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6', score: 0 },
            { _id: 'blogpost0', _type: 'BlogPost', title: 'post 0', score: 0 },
            { _id: 'blogpost7', _type: 'BlogPost', title: 'post 7', score: 1 },
            { _id: 'blogpost1', _type: 'BlogPost', title: 'post 1', score: 1 },
            { _id: 'blogpost8', _type: 'BlogPost', title: 'post 8', score: 2 }
        ]
    },

    {
        should: 'fetch relations properties',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            authorName: 'author.name',
            authorGender: 'author.gender'
        },
        options: {limit: 2, sort: ['title']},
        results: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                authorName: 'user 0',
                title: 'post 0',
                authorGender: 'male'
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                authorName: 'user 1',
                title: 'post 1',
                authorGender: 'female'
            }
        ]
    },

    {
        should: 'be able to filter on a requested field',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title'
        },
        filter: {
            title: 'post 0'
        },
        results: [
            { _id: 'blogpost0', _type: 'BlogPost', title: 'post 0' }
        ]
    },

    {
        should: 'filter on a string',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            score: 'ratting'
        },
        filter: {
            title: 'post 0'
        },
        results: [
            { _id: 'blogpost0', _type: 'BlogPost', score: 0 }
        ]
    },

    {
        should: 'filter on a string on a relation',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting'
        },
        filter: {
            '_type': 'BlogPost',
            'author.gender': 'female'
        },
        results: [
            { _id: 'blogpost1', _type: 'BlogPost', title: 'post 1', score: 1 },
            { _id: 'blogpost3', _type: 'BlogPost', title: 'post 3', score: 3 },
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6', score: 0 },
            { _id: 'blogpost8', _type: 'BlogPost', title: 'post 8', score: 2 }
        ]
    },

    {
        should: 'filter on a string on a relation (2)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            authorGender: 'author.gender'
        },
        filter: {
            'author.gender': 'female'
        },
        options: {sort: ['title']},
        results: [
            { _id: 'blogpost1', _type: 'BlogPost', authorGender: 'female', title: 'post 1' },
            { _id: 'blogpost3', _type: 'BlogPost', authorGender: 'female', title: 'post 3' },
            { _id: 'blogpost6', _type: 'BlogPost', authorGender: 'female', title: 'post 6' },
            { _id: 'blogpost8', _type: 'BlogPost', authorGender: 'female', title: 'post 8' }
        ]
    },

    {
        should: 'filter on a string on a relation ($in)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title'
        },
        filter: {
            'author.gender': {$in: ['female']}
        },
        results: [
            { _id: 'blogpost1', _type: 'BlogPost', title: 'post 1' },
            { _id: 'blogpost3', _type: 'BlogPost', title: 'post 3' },
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6' },
            { _id: 'blogpost8', _type: 'BlogPost', title: 'post 8' }
        ]
    },

    {
        should: 'filter on a string ($ne)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            score: 'ratting'
        },
        filter: {
            title: {$ne: 'post 0'}
        },
        results: [
            { _id: 'blogpost1', _type: 'BlogPost', score: 1 },
            { _id: 'blogpost9', _type: 'BlogPost', score: 3 },
            { _id: 'blogpost2', _type: 'BlogPost', score: 2 },
            { _id: 'blogpost3', _type: 'BlogPost', score: 3 },
            { _id: 'blogpost4', _type: 'BlogPost', score: 4 },
            { _id: 'blogpost5', _type: 'BlogPost', score: 5 },
            { _id: 'blogpost7', _type: 'BlogPost', score: 1 },
            { _id: 'blogpost6', _type: 'BlogPost', score: 0 },
            { _id: 'blogpost8', _type: 'BlogPost', score: 2 }
        ]
    },

    {
        should: 'filter on a string ($in)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            score: 'ratting'
        },
        filter: {
            title: {$in: ['post 4', 'post 5']}
        },
        results: [
            { _id: 'blogpost4', _type: 'BlogPost', score: 4 },
            { _id: 'blogpost5', _type: 'BlogPost', score: 5 }
        ]
    },

    {
        should: 'filter on a string ($nin)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting'
        },
        filter: {
            title: {$nin: ['post 0', 'post 1', 'post 4', 'post 5']}
        },
        results: [
            { _id: 'blogpost9', _type: 'BlogPost', title: 'post 9', score: 3 },
            { _id: 'blogpost2', _type: 'BlogPost', title: 'post 2', score: 2 },
            { _id: 'blogpost3', _type: 'BlogPost', title: 'post 3', score: 3 },
            { _id: 'blogpost7', _type: 'BlogPost', title: 'post 7', score: 1 },
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6', score: 0 },
            { _id: 'blogpost8', _type: 'BlogPost', title: 'post 8', score: 2 }
        ]
    },

    {
        should: 'filter on a number',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting'
        },
        filter: {
            ratting: 1
        },
        options: {
            sort: ['title']
        },
        results: [
            { _id: 'blogpost1', _type: 'BlogPost', title: 'post 1', score: 1 },
            { _id: 'blogpost7', _type: 'BlogPost', title: 'post 7', score: 1 }
        ]
    },

    {
        should: 'filter on a number ($ne)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting'
        },
        filter: {
            ratting: {$ne: 1}
        },
        options: {
            sort: ['title']
        },
        results: [
            { _id: 'blogpost0', _type: 'BlogPost', title: 'post 0', score: 0 },
            { _id: 'blogpost2', _type: 'BlogPost', title: 'post 2', score: 2 },
            { _id: 'blogpost3', _type: 'BlogPost', title: 'post 3', score: 3 },
            { _id: 'blogpost4', _type: 'BlogPost', title: 'post 4', score: 4 },
            { _id: 'blogpost5', _type: 'BlogPost', title: 'post 5', score: 5 },
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6', score: 0 },
            { _id: 'blogpost8', _type: 'BlogPost', title: 'post 8', score: 2 },
            { _id: 'blogpost9', _type: 'BlogPost', title: 'post 9', score: 3 }
        ]
    },

    {
        should: 'filter on a number ($lt)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting'
        },
        filter: {
            ratting: {$lt: 2}
        },
        options: {
            sort: ['title']
        },
        results: [
            { _id: 'blogpost0', _type: 'BlogPost', title: 'post 0', score: 0 },
            { _id: 'blogpost1', _type: 'BlogPost', title: 'post 1', score: 1 },
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6', score: 0 },
            { _id: 'blogpost7', _type: 'BlogPost', title: 'post 7', score: 1 }
        ]
    },

    {
        should: 'filter on a number ($gt)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting'
        },
        filter: {
            ratting: {$gt: 3}
        },
        options: {
            sort: ['title']
        },
        results: [
            { _id: 'blogpost4', _type: 'BlogPost', title: 'post 4', score: 4 },
            { _id: 'blogpost5', _type: 'BlogPost', title: 'post 5', score: 5 }
        ]
    },

    {
        should: 'filter on a number ($in)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting'
        },
        filter: {
            ratting: {$in: [4, 5]}
        },
        options: {
            sort: ['title']
        },
        results: [
            { _id: 'blogpost4', _type: 'BlogPost', title: 'post 4', score: 4 },
            { _id: 'blogpost5', _type: 'BlogPost', title: 'post 5', score: 5 }
        ]
    },

    {
        should: 'filter on a number ($nin)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting'
        },
        filter: {
            ratting: {$nin: [0, 1, 2, 3]}
        },
        options: {
            sort: ['title']
        },
        results: [
            { _id: 'blogpost4', _type: 'BlogPost', title: 'post 4', score: 4 },
            { _id: 'blogpost5', _type: 'BlogPost', title: 'post 5', score: 5 }
        ]
    },

    {
        should: 'filter multiple time on a same property',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting'
        },
        filter: {
            ratting: {$gt: 3, $lt: 5}
        },
        options: {
            sort: ['title']
        },
        results: [
            { _id: 'blogpost4', _type: 'BlogPost', title: 'post 4', score: 4 }
        ]
    },

    {
        should: 'filter on an array',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            tags: {
                $aggregator: 'array',
                $property: 'tags'
            }
        },
        filter: {
            tags: 'tag"7'
        },
        options: {
            sort: ['title']
        },
        results: [
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6', tags: [ 'tag"7', 'tag"6' ] },
            { _id: 'blogpost7', _type: 'BlogPost', title: 'post 7', tags: [ 'tag"7', 'tag"8', 'tag"9' ] }
        ]
    },

    {
        should: 'filter on an array (2)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
        },
        filter: {
            tags: 'tag"7'
        },
        options: {
            sort: ['title']
        },
        results: [
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6' },
            { _id: 'blogpost7', _type: 'BlogPost', title: 'post 7' }
        ]
    },

    {
        should: 'filter on an array (3)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            tag: 'tags'
        },
        filter: {
            tags: 'tag"7'
        },
        options: {
            sort: ['title']
        },
        results: [
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6', tag: 'tag"7' },
            { _id: 'blogpost7', _type: 'BlogPost', title: 'post 7', tag: 'tag"7' }
        ]
    },

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

    {
        should: 'forge array from aggregation',
        model: 'BlogPost',
        field: {
            tag: 'tags',
            // creditGenderCount: [{
                gender: 'credits.gender',
                count: {$aggregator: 'count'}
            // }]
        },
        options: {sort: ['tag']},
        results: [
            { bof: 'bla'},
        ]
    },

    {
        should: 'fetch the _id',
        model: 'User',
        field: {id: '_id', title: 'name'},
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
        field: {title: 'title', 'userId': 'author._id'},
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
        field: {
            _id: '_id',
            _type: '_type',
            'yo.title': 'title',
            'yo.user': 'author.name'
        },
        options: {sort: ['yo.title']},
        results: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                yo: { user: 'user 0', title: 'post 0' }
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                yo: { user: 'user 1', title: 'post 1' }
            },
            {
                _id: 'blogpost2',
                _type: 'BlogPost',
                yo: { user: 'user 2', title: 'post 2' }
            },
            {
                _id: 'blogpost3',
                _type: 'BlogPost',
                yo: { user: 'user 3', title: 'post 3' }
            },
            {
                _id: 'blogpost4',
                _type: 'BlogPost',
                yo: { user: 'user 4', title: 'post 4' }
            },
            {
                _id: 'blogpost5',
                _type: 'BlogPost',
                yo: { user: 'user 0', title: 'post 5' }
            },
            {
                _id: 'blogpost6',
                _type: 'BlogPost',
                yo: { user: 'user 1', title: 'post 6' }
            },
            {
                _id: 'blogpost7',
                _type: 'BlogPost',
                yo: { user: 'user 2', title: 'post 7' }
            },
            {
                _id: 'blogpost8',
                _type: 'BlogPost',
                yo: { user: 'user 3', title: 'post 8' }
            },
            {
                _id: 'blogpost9',
                _type: 'BlogPost',
                yo: { user: 'user 4', title: 'post 9' }
            }
        ]
    },

    {
        should: 'make a COUNT aggregation',
        model: 'User',
        field: {
            label: 'gender',
            total: {
                $aggregator: 'count',
                $property: '_id'
                // distinct: true
            }
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
            author: 'author',
            avgRatting: {
                $aggregator: 'avg',
                $property: 'ratting'
            }
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
            author: 'author',
            totalRatting: {
                $aggregator: 'sum',
                $property: 'ratting'
            }
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
            authorName: 'author.name',
            minRatting: {
                $aggregator: 'min',
                $property: 'ratting'
            }
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
            authorName: 'author.name',
            maxRatting: {
                $aggregator: 'max',
                $property: 'ratting'
            }
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
            sex: 'gender', count: {$aggregator: 'count'}},
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
        field: {type: '_type', 'occ': {$count: '_type'}},
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
            total: {
                $aggregator: 'count',
                $property: 'author'
            }
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
            gender: 'author.gender',
            ratting: {
                $aggregator: 'avg',
                $property: 'ratting'
            }
        },
        options: {sort: ['-ratting']},
        results: [
            { gender: 'male', ratting: 2.5 },
            { gender: 'female', ratting: 1.5 }
        ]
    },


    /** group by multiple properties **/
    {
        should: 'sort the results by field name',
        model: 'BlogPost',
        field: {
            isPublished: 'isPublished',
            gender: 'author.gender',
            total: { $aggregator: 'count' }
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
        should: 'sort the results by field name in inversed order',
        model: 'BlogPost',
        field: {
            isPublished: 'isPublished',
            gender: 'author.gender',
            total: {$aggregator: 'count'}
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
        field: {
            isPublished: 'isPublished',
            gender: 'author.gender',
            total: {
                $aggregator: 'avg',
                $property: 'ratting'
            }
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
        field: {
            isPublished: 'isPublished',
            gender: 'author.gender',
            total: {
                $aggregator: 'avg',
                $property: 'ratting'
            }
        },
        filter: {isPublished: {$exists: true}},
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
        field: {title: 'title', id: '_id'},
        filter: {_id: 'blogpost0'},
        results: [{
            title: 'post 0',
            id: 'blogpost0'
        }]
    },

    /*** limit ***/
    {
        should: 'limit the number of results',
        model: 'BlogPost',
        field: {
            isPublished: 'isPublished',
            gender: 'author.gender',
            total: {$aggregator: 'count'}
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
        field: {authorName: 'author.name'},
        options: {distinct: true, sort: ['authorName']},
        results: [
            { authorName: 'user 0' },
            { authorName: 'user 1' },
            { authorName: 'user 2' },
            { authorName: 'user 3' },
            { authorName: 'user 4' }
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


    /*** errors ***/
    {
        should: 'throw an error if the property is malformed',
        model: 'BlogPost',
        field: {
            gender: 'author.gender',
            ratting: {blah: 'ratting'}
        },
        error: 'aggregate: unknown operator "$unknownOperator"'
    },
    {
        should: 'throw an error if the field property is unknown',
        model: 'BlogPost',
        field: {
            gender: 'unknownProperty',
        },
        error: 'aggregate: unknown property "unknownProperty"'
    },
    {
        should: 'throw an error if the aggregator is unknown',
        model: 'BlogPost',
        field: {
            gender: 'author.gender',
            ratting: {
                $aggregator: 'unknownAggregator',
                $property: 'ratting'
            }
        },
        error: 'aggregate: unknown operator "unknownAggregator"'
    },
    {
        should: 'throw an error if the field property is unknown',
        model: 'BlogPost',
        field: {
            gender: 'author.gender',
            ratting: {
                $aggregator: 'avg',
                $property: 'unknownProperty'
            }
        },
        error: 'aggregate: unknown property "unknownProperty" for model "BlogPost"'
    },
    {
        should: 'throw an error if the filter property is unknown',
        model: 'BlogPost',
        field: {
            gender: 'author.gender',
        },
        filter: {
            unknownProperty: false
        },
        error: 'aggregate: unknown property "unknownProperty" for model "BlogPost"'
    },
    {
        should: 'throw an error when sorting with an unknown variable',
        model: 'BlogPost',
        field: {
            gender: 'author.gender'
        },
        options: {sort: ['unknownVariable']},
        error: 'aggregate: unknown sorting constraint "unknownVariable"'
    }

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
