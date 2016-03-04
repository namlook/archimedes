
export default [

    /**** limit ****/
    {
        should: 'limit the number of results (framed)',
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

    // TODO (filtered)

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
        should: 'sort the results on multiple fields in reversed order (framed)',
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

    // TODO sorting (more framed and filtered)


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
];
