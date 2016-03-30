
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
        options: {
            sort: ['_id']
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
        options: {
            sort: ['_id']
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
        options: {
            sort: ['_id']
        },
        results: [
            { _id: 'blogpost1', _type: 'BlogPost', score: 1 },
            { _id: 'blogpost2', _type: 'BlogPost', score: 2 },
            { _id: 'blogpost3', _type: 'BlogPost', score: 3 },
            { _id: 'blogpost4', _type: 'BlogPost', score: 4 },
            { _id: 'blogpost5', _type: 'BlogPost', score: 5 },
            { _id: 'blogpost6', _type: 'BlogPost', score: 0 },
            { _id: 'blogpost7', _type: 'BlogPost', score: 1 },
            { _id: 'blogpost8', _type: 'BlogPost', score: 2 },
            { _id: 'blogpost9', _type: 'BlogPost', score: 3 }
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
        options: {
            sort: ['_id']
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
        options: {
            sort: ['_id']
        },
        results: [
            { _id: 'blogpost2', _type: 'BlogPost', title: 'post 2', score: 2 },
            { _id: 'blogpost3', _type: 'BlogPost', title: 'post 3', score: 3 },
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6', score: 0 },
            { _id: 'blogpost7', _type: 'BlogPost', title: 'post 7', score: 1 },
            { _id: 'blogpost8', _type: 'BlogPost', title: 'post 8', score: 2 },
            { _id: 'blogpost9', _type: 'BlogPost', title: 'post 9', score: 3 }
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
            tags: 'tags'
        },
        filter: {
            tags: 'tag"7'
        },
        options: {
            sort: ['title', 'tags']
        },
        results: [
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6', tags: 'tag"6' },
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6', tags: 'tag"7' },
            { _id: 'blogpost7', _type: 'BlogPost', title: 'post 7', tags: 'tag"7' },
            { _id: 'blogpost7', _type: 'BlogPost', title: 'post 7', tags: 'tag"8' },
            { _id: 'blogpost7', _type: 'BlogPost', title: 'post 7', tags: 'tag"9' }
        ]
    },

    {
        should: 'filter on an array (grouped)',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title'
        },
        aggregate: {
            tags: {$array: 'tags'}
        },
        filter: {
            tags: 'tag"7'
        },
        options: {
            sort: ['title']
        },
        results: [
            { _id: 'blogpost6', _type: 'BlogPost', title: 'post 6', tags: [ 'tag"6', 'tag"7' ] },
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


    /*******/
    {
        should: 'allow no filter at all',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost1'},
            {_id: 'blogpost2'},
            {_id: 'blogpost3'},
            {_id: 'blogpost4'},
            {_id: 'blogpost5'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'filter filled properties ($exists)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {title: {$exists: true}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost1'},
            {_id: 'blogpost2'},
            {_id: 'blogpost3'},
            {_id: 'blogpost4'},
            {_id: 'blogpost5'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'filter unfilled properties ($exists)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {title: {$exists: false}},
        options: {sort: ['_id']},
        results: []
    },
    {
        should: 'filter filled properties ($exists) (2)',
        model: 'Comment',
        field: {_id: '_id'},
        filter: {ratting: {$exists: true}},
        options: {sort: ['_id']},
        results: [
            {_id: 'comment03'},
            {_id: 'comment06'},
            {_id: 'comment09'},
            {_id: 'comment13'},
            {_id: 'comment16'},
            {_id: 'comment23'},
            {_id: 'comment26'},
            {_id: 'comment36'},
            {_id: 'comment46'},
            {_id: 'comment56'}
        ]
    },
    {
        should: 'filter unfilled properties ($exists) (2)',
        model: 'Comment',
        field: {_id: '_id'},
        filter: {ratting: {$exists: false}},
        options: {sort: ['_id']},
        results: [
            {_id: 'comment01'},
            {_id: 'comment02'},
            {_id: 'comment04'},
            {_id: 'comment05'},
            {_id: 'comment07'},
            {_id: 'comment12'},
            {_id: 'comment14'},
            {_id: 'comment15'},
            {_id: 'comment17'},
            {_id: 'comment24'},
            {_id: 'comment25'},
            {_id: 'comment27'},
            {_id: 'comment34'},
            {_id: 'comment35'},
            {_id: 'comment37'},
            {_id: 'comment45'},
            {_id: 'comment47'},
            {_id: 'comment57'},
            {_id: 'comment67'}
        ]
    },
    {
        should: 'filter unfilled relation properties ($exists)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {'author.subscribedMailingList': {$exists: false}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost2'},
            {_id: 'blogpost4'},
            {_id: 'blogpost5'},
            {_id: 'blogpost7'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'filter filled relation properties ($exists)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {'author.subscribedMailingList': {$exists: true}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost1'},
            {_id: 'blogpost3'},
            {_id: 'blogpost6'},
            {_id: 'blogpost8'}
        ]
    },

    /*** strings ***/

    {
        should: 'filter a string ($eq)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {title: 'post 1'},
        options: {sort: ['_id']},
        results: [{_id: 'blogpost1'}]
    },
    {
        should: 'filter a string ($ne)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {title: {$ne: 'post 1'}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost2'},
            {_id: 'blogpost3'},
            {_id: 'blogpost4'},
            {_id: 'blogpost5'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'filter a string ($in)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {title: {$in: ['post 1', 'post 2']}},
        options: {sort: ['_id']},
        results: [{_id: 'blogpost1'}, {_id: 'blogpost2'}]
    },
    {
        should: 'filter a string ($nin)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {title: {$nin: ['post 1', 'post 2']}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost3'},
            {_id: 'blogpost4'},
            {_id: 'blogpost5'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'filter a string ($all)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {tags: {$all: ['tag\"3', 'tag\"4']}},
        options: {sort: ['_id']},
        results: [{_id: 'blogpost3'}]
    },
    {
        should: 'filter a string ($nall)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {tags: {$nall: ['tag\"3', 'tag\"4']}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost1'},
            {_id: 'blogpost2'},
            {_id: 'blogpost4'},
            {_id: 'blogpost5'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'filter a string ($regex)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {body: {$regex: 'body of the post 4$'}},
        options: {sort: ['_id']},
        results: [{_id: 'blogpost4'}]
    },
    {
        should: 'filter a string ($iregex)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {body: {$iregex: 'Body Of \\w+ post 4$'}},
        options: {sort: ['_id']},
        results: [{_id: 'blogpost4'}]
    },


    /*** numbers ***/
    {
        should: 'filter a number ($eq)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {ratting: 4},
        options: {sort: ['_id']},
        results: [{_id: 'blogpost4'}]
    },
    {
        should: 'filter a number ($ne)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {ratting: {$ne: 4}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost1'},
            {_id: 'blogpost2'},
            {_id: 'blogpost3'},
            {_id: 'blogpost5'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'filter a number ($lt)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {ratting: {$lt: 3}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost1'},
            {_id: 'blogpost2'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'}
        ]
    },
    {
        should: 'filter a number ($lte)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {ratting: {$lte: 3}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost1'},
            {_id: 'blogpost2'},
            {_id: 'blogpost3'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'filter a number ($gt)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {ratting: {$gt: 3}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost4'},
            {_id: 'blogpost5'}
        ]
    },
    {
        should: 'filter a number ($gte)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {ratting: {$gte: 3}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost3'},
            {_id: 'blogpost4'},
            {_id: 'blogpost5'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'filter a number ($in)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {ratting: {$in: [1, 3]}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost1'},
            {_id: 'blogpost3'},
            {_id: 'blogpost7'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'filter a number ($nin)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {ratting: {$nin: [1, 3]}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost2'},
            {_id: 'blogpost4'},
            {_id: 'blogpost5'},
            {_id: 'blogpost6'},
            {_id: 'blogpost8'}
        ]
    },

    /*** boolean ***/
    {
        should: 'filter a boolean ($eq)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {isPublished: true},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost1'},
            {_id: 'blogpost2'},
            {_id: 'blogpost4'},
            {_id: 'blogpost5'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'}
        ]
    },
    {
        should: 'filter a boolean ($ne)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {isPublished: {$ne: true}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost3'},
            {_id: 'blogpost6'},
            {_id: 'blogpost9'}
        ]
    },

    /*** date ***/
    {
        should: 'filter a date ($eq)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {createdDate: new Date(Date.UTC(1984, 7, 3))},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost2'}
        ]
    },
    {
        should: 'filter a date ($lt)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {createdDate: {$lt: new Date(Date.UTC(1984, 7, 3))}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost1'}
        ]
    },
    {
        should: 'filter a date ($lte)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {createdDate: {$lte: new Date(Date.UTC(1984, 7, 3))}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost1'},
            {_id: 'blogpost2'}
        ]
    },
    {
        should: 'filter a date ($gt)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {createdDate: {$gt: new Date(Date.UTC(1984, 7, 7))}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost7'},
            {_id: 'blogpost8'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'filter a date ($gte)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {createdDate: {$gte: new Date(Date.UTC(1984, 7, 7))}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost6'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'},
            {_id: 'blogpost9'}
        ]
    },

    /*** ids ***/
    {
        should: 'filter on _id ($in)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {_id: {$in: ['blogpost6', 'blogpost7', 'blogpost8']}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost6'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'}
        ]
    },


    /*** relations ***/
    {
        should: 'filter on relation _id ($eq)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {'author._id': 'user1'},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost1'},
            {_id: 'blogpost6'} ]
    },
    {
        should: 'filter on relation _id ($eq) (2)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {'author._id': 'user1', 'author._type': 'User'},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost1'},
            {_id: 'blogpost6'}
        ]
    },
    {
        should: 'filter on relation ($eq)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {'author.gender': 'female'},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost1'},
            {_id: 'blogpost3'},
            {_id: 'blogpost6'},
            {_id: 'blogpost8'}
        ]
    },
    {
        should: 'filter on relation ($eq) (2)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {'author.gender': 'female', 'author.name': 'user 1'},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost1'},
            {_id: 'blogpost6'}
        ]
    },
    {
        should: 'filter on relation date ($lt)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {'author.birthday': {$lt: new Date(Date.UTC(1982, 1, 1))}},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost1'},
            {_id: 'blogpost5'},
            {_id: 'blogpost6'}
        ]
    },
    {
        should: 'filter on relation string ($eq)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {'credits.name': 'user 1'},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost2'},
            {_id: 'blogpost3'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'}
        ]
    },
    {
        should: 'filter on relation string ($eq) (2)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {'credits.gender': 'female'},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost2'},
            {_id: 'blogpost3'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'}
        ]
    },

    /*** relations inverse ***/
    {
        should: 'filter on relation inverse ($eq)',
        model: 'User',
        field: {_id: '_id'},
        filter: {'blogPosts.ratting': 2},
        options: {sort: ['_id']},
        results: [{_id: 'user2'}, {_id: 'user3'}]
    },
    {
        should: 'filter on relation inverse _id ($eq)',
        model: 'User',
        field: {_id: '_id'},
        filter: {'comments._id': 'comment03'},
        options: {sort: ['_id']},
        results: [{_id: 'user0'}]
    },
    {
        should: 'filter on relation inverse _id ($in)',
        model: 'User',
        field: {_id: '_id'},
        filter: {'comments._id': {$in: ['comment03', 'comment12']}},
        options: {sort: ['_id']},
        results: [{_id: 'user0'}, {_id: 'user1'}]
    },
    {
        should: 'filter on relation inverse string ($eq)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {'comments.body': 'this thing sucks !'},
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost2'},
            {_id: 'blogpost5'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'}
        ]
    },
    {
        should: 'filter on relation inverse string ($eq) (2)',
        model: 'User',
        field: {_id: '_id'},
        filter: {'comments.body': 'this thing sucks !'},
        options: {sort: ['_id']},
        results: [
            {_id: 'user0'},
            {_id: 'user1'},
            {_id: 'user2'},
            {_id: 'user3'},
            {_id: 'user4'}
        ]
    },
    {
        should: '???',
        model: 'Comment',
        field: {_id: '_id'},
        filter: {'target._id': 'blogpost7'},
        options: {sort: ['_id']},
        results: [
            {_id: 'comment07'},
            {_id: 'comment17'},
            {_id: 'comment27'},
            {_id: 'comment37'},
            {_id: 'comment47'},
            {_id: 'comment57'},
            {_id: 'comment67'}
        ]
    },

    /**** search *****/
    {
        should: 'allow to search on a field',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {
            title: {$search: 'post 3'}
        },
        options: {sort: ['_id']},
        results: [ { _id: 'blogpost3' } ]
    },
    {
        should: 'allow to search on a field (2)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {
            title: {$search: 'pos'}
        },
        options: {sort: ['_id']},
        results: [
            { _id: 'blogpost0' },
            { _id: 'blogpost1' },
            { _id: 'blogpost2' },
            { _id: 'blogpost3' },
            { _id: 'blogpost4' },
            { _id: 'blogpost5' },
            { _id: 'blogpost6' },
            { _id: 'blogpost7' },
            { _id: 'blogpost8' },
            { _id: 'blogpost9' }
        ]
    },
    // {
    //     should: 'allow to search on all fields',
    //     model: 'BlogPost',
    //     field: {_id: '_id'},
    //     search: 'tag"3',
    //     options: {sort: ['_id']},
    //     results: ['bof']
    // },

    /**** Bool algebra ****/
    {
        should: 'allow a $and expression',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {
            tags: { $and: [
                {$eq: 'tag"3'},
                {$eq: 'tag"4'}
            ]}
        },
        options: {sort: ['_id']},
        results: [{_id: 'blogpost3'}]
    },
    {
        should: 'allow a $not expression',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {
            tags: {
                $not: {
                    $and: [ {$eq: 'tag\"3'}, {$eq: 'tag\"4'} ]
                }
            }
        },
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost1'},
            {_id: 'blogpost4'},
            {_id: 'blogpost5'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'},
            {_id: 'blogpost8'},
            {_id: 'blogpost9'}
        ]
    },
    {
        should: 'allow a $and expression with $not',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {
            tags: {$and: [
                {$iregex: '3$'},
                {$not: {$eq: 'tag\"4'}}
            ]}
        },
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost2'}
        ]
    },
    {
        should: 'allow a $or expression',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {
            tags: {$or: [
                {$eq: 'tag\"3'},
                {$eq: 'tag\"4'}
            ]}
        },
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost2'},
            {_id: 'blogpost3'},
            {_id: 'blogpost3'}
        ]
    },
    {
        should: 'allow a $or expression with $iregex',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {
            tags: {$or: [
                {$iregex: '3$'},
                {$eq: 'tag\"4'}
            ]}
        },
        options: {sort: ['_id']},
        results: [
            {_id: 'blogpost2'},
            {_id: 'blogpost3'},
            {_id: 'blogpost3'}
        ]
    },


];
