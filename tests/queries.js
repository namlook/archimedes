
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
    }
];