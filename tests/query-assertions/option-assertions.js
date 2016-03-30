
export default [

    /**** limit ****/
    {
        should: 'limit the number of results',
        model: 'BlogPost',
        field: { title: 'title' },
        options: {limit: 2, sort: ['title']},
        results: [
            { title: 'post 0' },
            { title: 'post 1' }
        ]
    },

    {
        should: 'limit the number of results with offset',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {},
        options: {limit: 3, offset: 3, sort: ['_id']},
        results: [
            {_id: 'blogpost3'},
            {_id: 'blogpost4'},
            {_id: 'blogpost5'}
        ]
    },

    {
        should: 'limit the number of results (aggregated)',
        model: 'BlogPost',
        field: {
            isPublished: 'isPublished',
            gender: 'author.gender'
        },
        aggregate: {
            total: {$aggregator: 'count'}
        },
        options: {limit: 2, sort: ['isPublished', 'gender']},
        results: [
            { isPublished: false, gender: 'female', total: 2},
            { isPublished: false, gender: 'male', total: 2}
        ]
    },

    /**** sorting ****/
    {
        should: 'sort the results',
        model: 'BlogPost',
        field: {_id: '_id', ratting: 'ratting'},
        filter: {},
        options: {sort: ['ratting', '_id']},
        results: [
            { _id: 'blogpost0', ratting: 0 },
            { _id: 'blogpost6', ratting: 0 },
            { _id: 'blogpost1', ratting: 1 },
            { _id: 'blogpost7', ratting: 1 },
            { _id: 'blogpost2', ratting: 2 },
            { _id: 'blogpost8', ratting: 2 },
            { _id: 'blogpost3', ratting: 3 },
            { _id: 'blogpost9', ratting: 3 },
            { _id: 'blogpost4', ratting: 4 },
            { _id: 'blogpost5', ratting: 5 }
        ]
    },
    {
        should: 'sort the results in reversed order',
        model: 'BlogPost',
        field: {_id: '_id', ratting: 'ratting'},
        filter: {},
        options: {sort: ['-ratting', '_id']},
        results: [
            { _id: 'blogpost5', ratting: 5 },
            { _id: 'blogpost4', ratting: 4 },
            { _id: 'blogpost3', ratting: 3 },
            { _id: 'blogpost9', ratting: 3 },
            { _id: 'blogpost2', ratting: 2 },
            { _id: 'blogpost8', ratting: 2 },
            { _id: 'blogpost1', ratting: 1 },
            { _id: 'blogpost7', ratting: 1 },
            { _id: 'blogpost0', ratting: 0 },
            { _id: 'blogpost6', ratting: 0 }
        ]
    },
    {
        should: 'sort the results on multiple fields in reversed order',
        model: 'BlogPost',
        field: {
            _id: '_id',
            isPublished: 'isPublished',
            title: 'title'
        },
        filter: {},
        options: {sort: ['isPublished', '-title']},
        results: [
            { _id: 'blogpost9', isPublished: false, title: 'post 9' },
            { _id: 'blogpost6', isPublished: false, title: 'post 6' },
            { _id: 'blogpost3', isPublished: false, title: 'post 3' },
            { _id: 'blogpost0', isPublished: false, title: 'post 0' },
            { _id: 'blogpost8', isPublished: true, title: 'post 8' },
            { _id: 'blogpost7', isPublished: true, title: 'post 7' },
            { _id: 'blogpost5', isPublished: true, title: 'post 5' },
            { _id: 'blogpost4', isPublished: true, title: 'post 4' },
            { _id: 'blogpost2', isPublished: true, title: 'post 2' },
            { _id: 'blogpost1', isPublished: true, title: 'post 1' }
        ]
    },

    {
        should: 'sort the results on multiple fields in reversed order (2)',
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
        should: 'sort the results on multiple fields (aggregated)',
        model: 'BlogPost',
        field: {
            isPublished: 'isPublished',
            gender: 'author.gender'
        },
        aggregate: {
            total: {$count: true}
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
        should: 'sort the results by multiple fields inversed (aggregated)',
        model: 'BlogPost',
        field: {
            isPublished: 'isPublished',
            gender: 'author.gender'
        },
        aggregate: {
            total: {$avg: 'ratting'}
        },
        options: {sort: ['isPublished', '-total', 'gender']},
        results: [
            { isPublished: false, gender: 'female', total: 1.5},
            { isPublished: false, gender: 'male', total: 1.5},
            { isPublished: true, gender: 'male', total: 3},
            { isPublished: true, gender: 'female', total: 1.5}
        ]
    },

    {
        should: 'sort the results by field name in inversed order (aggregated)',
        model: 'BlogPost',
        field: {
            isPublished: 'isPublished',
            gender: 'author.gender'
        },
        aggregate: {
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
        should: 'sort the results by multiple labels with query (aggregated & filtered)',
        model: 'BlogPost',
        field: {
            isPublished: 'isPublished',
            gender: 'author.gender'
        },
        aggregate: {
            total: {$avg: 'ratting'}
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


    /**** distinct *****/

    {
        should: 'distinct the results',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {},
        options: {sort: ['_id'], limit: 3},
        results: [
            {_id: 'blogpost0'},
            {_id: 'blogpost1'},
            {_id: 'blogpost2'}
        ]
    },

    {
        should: 'distinct the results (with relations)',
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


    {
        should: 'distinct the results (filtered)',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {'comments.body': 'this thing sucks !'},
        options: {sort: ['_id'], distinct: true},
        results: [
            {_id: 'blogpost2'},
            {_id: 'blogpost5'},
            {_id: 'blogpost6'},
            {_id: 'blogpost7'}
        ]
    },

];
