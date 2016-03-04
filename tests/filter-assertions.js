
export default [
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
        should: 'filter on the _id',
        model: 'User',
        field: {name: 'name'},
        filter: {_id: 'user0'},
        options: {sort: ['name']},
        results: [
            { name: 'user 0' }
        ]
    },

    {
        should: 'filter on the _id ($ne)',
        model: 'User',
        field: {name: 'name'},
        filter: {_id: {$ne: 'user0'}},
        options: {sort: ['name']},
        results: [
            { name: 'user 1' },
            { name: 'user 2' },
            { name: 'user 3' },
            { name: 'user 4' }
        ]
    },

    {
        should: 'filter on the _id ($in)',
        model: 'User',
        field: {name: 'name'},
        filter: {_id: {$in: ['user0', 'user1']}},
        options: {sort: ['name']},
        results: [
            { name: 'user 0' },
            { name: 'user 1' },
        ]
    },

    {
        should: 'filter on the _id ($nin)',
        model: 'User',
        field: {name: 'name'},
        filter: {_id: {$nin: ['user0', 'user1']}},
        options: {sort: ['name']},
        results: [
            { name: 'user 2' },
            { name: 'user 3' },
            { name: 'user 4' }
        ]
    },

    {
        should: 'filter on a relation _id',
        model: 'BlogPost',
        field: {title: 'title', authorName: 'author.name'},
        filter: {'author._id': 'user0'},
        options: {sort: ['title']},
        results: [
            { title: 'post 0', authorName: 'user 0' },
            { title: 'post 5', authorName: 'user 0' }
        ]
    },

    {
        should: 'filter on a relation _id ($nin)',
        model: 'BlogPost',
        field: {title: 'title', authorName: 'author.name'},
        filter: {'author._id': {$nin: ['user0', 'user1', 'user2']}},
        options: {sort: ['title']},
        results: [
            { title: 'post 3', authorName: 'user 3' },
            { title: 'post 4', authorName: 'user 4' },
            { title: 'post 8', authorName: 'user 3' },
            { title: 'post 9', authorName: 'user 4' }
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
];
