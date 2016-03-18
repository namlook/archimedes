
export default [

    {
        should: 'throw an error if filter is malformed',
        model: 'BlogPost',
        field: {
            _id: '_id'
        },
        filter: 42,
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors:  [
                { message: '"filter" must be an object', path: 'filter' }
            ]
        }
    },
    {
        should: 'throw an error if operator is unknown',
        model: 'BlogPost',
        field: {
            title: 'title',
        },
        filter: {
            ratting: {$unknownOperator: 3}
        },
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors:  [{
                message: 'unknown operator "$unknownOperator" on property "ratting"',
                path: 'filter.ratting'
            }]
        }
    },
    {
        should: 'throw an error if the relation property is unknown',
        model: 'BlogPost',
        field: {
            title: 'title',
        },
        filter: {
            'unknownProperty.name': 'user 0'
        },
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors:  [
                { message: 'unknown property "unknownProperty.name" for model "BlogPost"', path: 'filter' }
            ]
        }
    }
];
