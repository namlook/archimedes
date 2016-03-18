
export default [
    {
        should: 'throw an error if aggregate is malformed',
        model: 'BlogPost',
        field: {_id: '_id'},
        aggregate: 42,
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors: [
                { message: '"aggregate" must be an object', path: 'aggregate' }
            ]
        }
    },
    {
        should: 'throw an error if the aggregator is unknown',
        model: 'BlogPost',
        field: {
            gender: 'author.gender'
        },
        aggregate: {
            ratting: {
                $aggregator: 'unknownAggregator',
                $property: 'ratting'
            }
        },
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors: [
                {
                    message: 'unknown aggregator "unknownAggregator" in field "ratting"',
                    path: 'aggregate.ratting'
                }
            ]
        }
    },
    {
        should: 'throw an error if the aggregator is unknown (2)',
        model: 'BlogPost',
        field: {
            gender: 'author.gender'
        },
        aggregate: {
            ratting: {$unknownAggregator: 'ratting'}
        },
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors: [
                {
                    message: 'unknown aggregator "unknownAggregator" in field "ratting"',
                    path: 'aggregate.ratting'
                }
            ]
        }
    },
    {
        should: 'throw an error if the field property is unknown',
        model: 'BlogPost',
        field: {
            gender: 'author.gender',
        },
        aggregate: {
            ratting: {
                $aggregator: 'avg',
                $property: 'unknownProperty'
            }
        },
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors: [
                {
                    message: 'unknown property "unknownProperty" in field "ratting"',
                    path: 'aggregate.ratting'
                }
            ]
        }
    },
    {
        should: 'throw an error if the field property is unknown (2)',
        model: 'BlogPost',
        field: {
            gender: 'author.gender',
        },
        aggregate: {
            ratting: {$avg: 'unknownProperty'}
        },
        error: {
            name: 'ValidationError',
            message: 'Bad query',
            validationErrors: [
                {
                    message: 'unknown property "unknownProperty" in field "ratting"',
                    path: 'aggregate.ratting'
                }
            ]
        }
    }
]
