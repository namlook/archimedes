
export default [
    {
        should: 'throw an error if the field property is unknown',
        model: 'BlogPost',
        field: {
            gender: 'unknownProperty',
        },
        error: 'aggregate: unknown property "unknownProperty"'
    }
];
