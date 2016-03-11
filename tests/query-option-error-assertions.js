
export default [
    {
        should: 'throw an error when sorting on a non declared field',
        model: 'BlogPost',
        field: {_id: '_id'},
        filter: {},
        options: {sort: ['ratting']},
        error: ''
    }
];
