
export default [
    {
        should: 'should throw an error when no _id is specified',
        import: [
            {
                _type: 'BlogPost',
                title: 'post 0',
                body: 'hello world',
                ratting: 3,
                isPublished: true
            }
        ],
        error: {
            name: 'ValidationError',
            message: 'malformed object',
            validationErrors: [
                {message: '"_id" is required'}
            ]
        }
    },
    {
        should: 'should throw an error when no _type is specified',
        import: [
            {
                _id: 'blogpost0',
                title: 'post 0',
                body: 'hello world',
                ratting: 3,
                isPublished: true
            }
        ],
        error: {
            name: 'ValidationError',
            message: 'malformed object',
            validationErrors: [
                {message: '"_type" is required'}
            ]
        }
    },
    {
        should: 'should throw an error when a bad _type is specified',
        import: [
            {
                _id: 'blogpost0',
                _type: 'UnknownModel',
                title: 'post 0',
                body: 'hello world',
                ratting: 3,
                isPublished: true
            }
        ],
        error: {
            name: 'ValidationError',
            message: 'malformed object',
            validationErrors: [
                {message: '"_type": no model found in schema'}
            ]
        }
    },
    {
        should: 'should throw a validation error when passing bad values',
        import: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                body: 12,
                createdDate: 'arf',
                ratting: '3?',
                isPublished: 'maybe'
            }
        ],
        error: {
            name: 'ValidationError',
            message: 'Bad value',
            validationErrors: [
                {
                    message: '"ratting" must be a number',
                    path: 'ratting',
                    type: 'number.base',
                    context: { key: 'ratting' }
                },
                {
                    message: '"body" must be a string',
                    path: 'body',
                    type: 'string.base',
                    context: { value: 12, key: 'body' }
                },
                {
                    message: '"createdDate" must be a number of milliseconds or valid date string',
                    path: 'createdDate',
                    type: 'date.base',
                    context: { key: 'createdDate' }
                },
                {
                    message: '"isPublished" must be a boolean',
                    path: 'isPublished',
                    type: 'boolean.base',
                    context: { key: 'isPublished' }
                }
            ]
        }
    },
    {
        should: 'should throw a validation error when passing bad values (2)',
        import: [
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: true,
                body: 'this is the body of the post 1',
                createdDate: 24,
                ratting: 'bla',
                isPublished: 42
            }
        ],
        error: {
            name: 'ValidationError',
            message: 'Bad value',
            validationErrors: [
                {
                    message: '"ratting" must be a number',
                    path: 'ratting',
                    type: 'number.base',
                    context: { key: 'ratting' }
                },
                {
                    message: '"title" must be a string',
                    path: 'title',
                    type: 'string.base',
                    context: { value: true, key: 'title' }
                },
                {
                    message: '"isPublished" must be a boolean',
                    path: 'isPublished',
                    type: 'boolean.base',
                    context: { key: 'isPublished' }
                }
            ]
        }
    },
];
