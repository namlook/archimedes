
export default [
    {
        model: 'User',
        groupBy: 'gender',
        results: [
            { label: 'male', value: '3'},
            { label: 'female', value: '2' }
        ]
    },
    {
        model: 'User',
        groupBy: {property: 'gender'},
        results: [
            { label: 'male', value: '3'},
            { label: 'female', value: '2' }
        ]
    },
    {
        model: 'User',
        groupBy: {property: 'gender', aggregation: 'count'},
        results: [
            { label: 'male', value: '3'},
            { label: 'female', value: '2' }
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
            { label: 'male', value: '3'},
            { label: 'female', value: '2' }
        ]
    },
    {
        model: 'User',
        groupBy: 'gender',
        query: {gender: 'male'},
        results: [
            { label: 'male', value: '3' }
        ]
    },

    /** group by deep relation **/
    {
        model: 'BlogPost',
        groupBy: 'author.gender',
        results: [
            { label: 'male', value: '6'},
            { label: 'female', value: '4' }
        ]
    },

    /** group by deep relation with avg operator on ratting **/
    {
        model: 'BlogPost',
        groupBy: {
            property: 'author.gender', aggregation: {
                operator: 'avg', target: 'ratting'
            }
        },
        results: [
            { label: 'male', value: '2.5'},
            { label: 'female', value: '1.5' }
        ]
    },

    /** max operator **/
    {
        model: 'BlogPost',
        groupBy: {
            property: 'author.gender', aggregation: {
                operator: 'max', target: 'ratting'
            }
        },
        results: [
            { label: 'male', value: '5'},
            { label: 'female', value: '3' }
        ]
    }
];