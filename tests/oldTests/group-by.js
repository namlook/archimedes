
export default [
    {
        model: 'User',
        groupBy: 'gender',
        results: [
            { label: 'male', value: 3},
            { label: 'female', value: 2 }
        ]
    },
    {
        model: 'User',
        groupBy: {property: 'gender'},
        results: [
            { label: 'male', value: 3},
            { label: 'female', value: 2 }
        ]
    },
    {
        model: 'User',
        groupBy: {property: 'gender', aggregation: 'count'},
        results: [
            { label: 'male', value: 3},
            { label: 'female', value: 2 }
        ]
    },
    {
        model: 'User',
        groupBy: {
            property: 'gender', aggregation: {
                operator: 'count', target: 'gender'
            }
        },
        results: [
            { label: 'male', value: 3},
            { label: 'female', value: 2 }
        ]
    },
    {
        model: 'User',
        groupBy: 'gender',
        query: {gender: 'male'},
        results: [
            { label: 'male', value: 3 }
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
        model: 'BlogPost',
        groupBy: 'author.gender',
        results: [
            { label: 'male', value: 6},
            { label: 'female', value: 4 }
        ]
    },

    /** group by deep relation with avg operator on ratting **/
    {
        model: 'BlogPost',
        groupBy: {
            property: 'author.gender',
            aggregation: {
                operator: 'avg', target: 'ratting'
            }
        },
        results: [
            { label: 'male', value: 2.5 },
            { label: 'female', value: 1.5 }
        ]
    },

    /** max operator **/
    {
        model: 'BlogPost',
        groupBy: {
            property: 'author.gender',
            aggregation: {
                operator: 'max', target: 'ratting'
            }
        },
        results: [
            { label: 'male', value: 5},
            { label: 'female', value: 3 }
        ]
    },

    /** group by multiple properties **/
    {
        model: 'BlogPost',
        groupBy: {
            property: ['isPublished', 'author.gender'],
            aggregation: {
                target: 'isPublished'
            }
        },
        results: [
            {
                label: 'false', values: [
                    { label: 'female', value: 2},
                    { label: 'male', value: 2}
                ]
            },
            {
                label: 'true', values: [
                    { label: 'female', value: 2},
                    { label: 'male', value: 4}
                ]
            }
        ]
    },
    {
        model: 'BlogPost',
        groupBy: {
            property: ['isPublished', 'author.gender'],
            aggregation: {
                operator: 'avg', target: 'ratting'
            }
        },
        options: {sort: ['isPublished', 'author.gender']},
        results: [
            {
                label: 'false', values: [
                    { label: 'female', value: 1.5},
                    { label: 'male', value: 1.5}
                ]
            },
            {
                label: 'true', values: [
                    { label: 'female', value: 1.5},
                    { label: 'male', value: 3}
                ]
            }
        ]
    },

    /*** errors ***/
    {
        model: 'BlogPost',
        groupBy: {
            property: ['isPublished', 'author.gender'],
            aggregation: {operator: 'avg'}
        },
        error: 'groupBy: with multiple properties and a custom operator, target is required'
    },
    {
        model: 'BlogPost',
        groupBy: {
            property: ['isPublished', 'author.gender']
        },
        options: {sort: ['unknownProperty']},
        error: 'sort: unknown property "unknownProperty" on model "BlogPost"'
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