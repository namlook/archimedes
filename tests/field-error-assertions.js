
export default [
    {
        should: 'throw an error if the field property is unknown',
        model: 'BlogPost',
        field: {
            gender: 'unknownProperty',
        },
        error: 'aggregate: unknown property "unknownProperty"'
    },
    {
        should: 'throw an error if we use array without concatenation keys',
        model: 'BlogPost',
        field: {
            authorId: ['author._id']
        },
        options: {sort: ['authorId']},
        error: 'bla'
    },
];
