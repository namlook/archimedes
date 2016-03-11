
export default [
    {
        should: 'throw an error if operator is unknown',
        model: 'BlogPost',
        field: {
            title: 'title',
        },
        filter: {
            ratting: {$unknownOperator: 3}
        },
        error: 'unknown filter operator "$unknownOperator" on property "ratting"'
    },

    {
        should: 'throw an error if the relation property is unknown',
        model: 'BlogPost',
        field: {
            title: 'title',
        },
        filter: {
            'unknownPropery.name': 'user 0'
        },
        error: 'unknown filter property "unknownProperty" for model "BlogPost"'
    }
];
