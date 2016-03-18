
export default [
    {
        should: 'throw an error if the field is malformed',
        model: 'BlogPost',
        field: 42,
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors: [
                { message: '"field" must be an object', path: 'field' }
            ]
        }
    },
    {
        should: 'throw an error if the field is malformed (2)',
        model: 'BlogPost',
        field: {
            gender: {$eq: 'sex'}
        },
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors:  [
                { message: '"gender" must be a string', path: 'field.gender' }
            ]
        }
    },
    {
        should: 'throw an error if the field property is unknown',
        model: 'BlogPost',
        field: {
            gender: 'unknownProperty',
        },
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors: [
                {
                    message: 'unknown property "unknownProperty" in field "gender"',
                    path: 'field.gender'
                }
            ]
        }
    },
    {
        should: 'throw an error if the field property relation is unknown',
        model: 'BlogPost',
        field: {
            gender: 'author.unknownProperty',
        },
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors: [
                {
                    message: 'unknown property "author.unknownProperty" in field "gender"',
                    path: 'field.gender'
                }
            ]
        }
    }
];
