
export default [
    {
        should: 'throw an error if the aggregator is unknown',
        model: 'BlogPost',
        field: {
            gender: 'author.gender',
            ratting: {
                $aggregator: 'unknownAggregator',
                $property: 'ratting'
            }
        },
        error: 'aggregate: unknown operator "unknownAggregator"'
    },
    {
        should: 'throw an error if the field property is unknown',
        model: 'BlogPost',
        field: {
            gender: 'author.gender',
            ratting: {
                $aggregator: 'avg',
                $property: 'unknownProperty'
            }
        },
        error: 'aggregate: unknown property "unknownProperty" for model "BlogPost"'
    },
    {
        should: 'throw an error if the filter property is unknown',
        model: 'BlogPost',
        field: {
            gender: 'author.gender',
        },
        filter: {
            unknownProperty: false
        },
        error: 'aggregate: unknown property "unknownProperty" for model "BlogPost"'
    },
    {
        should: 'throw an error when sorting with an unknown variable',
        model: 'BlogPost',
        field: {
            gender: 'author.gender'
        },
        options: {sort: ['unknownVariable']},
        error: 'aggregate: unknown sorting constraint "unknownVariable"'
    }
]
