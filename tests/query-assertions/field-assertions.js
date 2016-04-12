/*eslint-disable comma-dangle, object-curly-spacing, array-bracket-spacing, spaced-comment, max-len */

export default [
    {
        should: 'frame some basic fields',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            score: 'ratting',
            'author._id': 'author._id',
            'author._type': 'author._type',
        },
        aggregate: {
            tags: {$array: 'tags'}
        },
        options: {sort: ['title']},
        results: [
            {
                _id: 'blogpost1', _type: 'BlogPost',
                title: 'post 1', score: 1,
                author: { _id: 'user1', _type: 'User' },
                tags: [ 'tag"1' ]
            },
            {
                _id: 'blogpost2', _type: 'BlogPost',
                title: 'post 2', score: 2,
                author: { _id: 'user2', _type: 'User' },
                tags: [ 'tag"2', 'tag"3' ]
            },
            {
                _id: 'blogpost3', _type: 'BlogPost',
                title: 'post 3', score: 3,
                author: { _id: 'user3', _type: 'User' },
                tags: [ 'tag"3', 'tag"4', 'tag"5' ]
            },
            {
                _id: 'blogpost5', _type: 'BlogPost',
                title: 'post 5', score: 5,
                author: { _id: 'user0', _type: 'User' },
                tags: [ 'tag"5' ]
            },
            {
                _id: 'blogpost6', _type: 'BlogPost',
                title: 'post 6', score: 0,
                author: { _id: 'user1', _type: 'User' },
                tags: [ 'tag"6', 'tag"7' ]
            },
            {
                _id: 'blogpost7', _type: 'BlogPost',
                title: 'post 7', score: 1,
                author: { _id: 'user2', _type: 'User' },
                tags: [ 'tag"7', 'tag"8', 'tag"9' ]
            },
            {
                _id: 'blogpost9', _type: 'BlogPost',
                title: 'post 9', score: 3,
                author: { _id: 'user4', _type: 'User' },
                tags: [ 'tag"9' ]
            }
        ]
    },

    {
        should: 'frame relations properties',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            title: 'title',
            authorName: 'author.name',
            authorGender: 'author.gender'
        },
        options: {limit: 2, sort: ['title']},
        results: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                authorName: 'user 0',
                title: 'post 0',
                authorGender: 'male'
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                authorName: 'user 1',
                title: 'post 1',
                authorGender: 'female'
            }
        ]
    },

    {
        should: 'frame the _id',
        model: 'User',
        field: {id: '_id', title: 'name'},
        options: {sort: ['title']},
        results: [
            { title: 'user 0', id: 'user0' },
            { title: 'user 1', id: 'user1' },
            { title: 'user 2', id: 'user2' },
            { title: 'user 3', id: 'user3' },
            { title: 'user 4', id: 'user4' }
        ]
    },

    {
        should: 'frame the relation _id',
        model: 'BlogPost',
        field: {title: 'title', userId: 'author._id'},
        options: {sort: ['title']},
        results: [
            { title: 'post 0', userId: 'user0' },
            { title: 'post 1', userId: 'user1' },
            { title: 'post 2', userId: 'user2' },
            { title: 'post 3', userId: 'user3' },
            { title: 'post 4', userId: 'user4' },
            { title: 'post 5', userId: 'user0' },
            { title: 'post 6', userId: 'user1' },
            { title: 'post 7', userId: 'user2' },
            { title: 'post 8', userId: 'user3' },
            { title: 'post 9', userId: 'user4' }
        ]
    },

    {
        should: 'frame the relation _id (2)',
        model: 'BlogPost',
        field: {
            title: 'title',
            'user._id': 'author._id',
            'user._type': 'author._type'
        },
        options: {sort: ['title']},
        results: [
            { title: 'post 0', user: { _id: 'user0', _type: 'User' } },
            { title: 'post 1', user: { _id: 'user1', _type: 'User' } },
            { title: 'post 2', user: { _id: 'user2', _type: 'User' } },
            { title: 'post 3', user: { _id: 'user3', _type: 'User' } },
            { title: 'post 4', user: { _id: 'user4', _type: 'User' } },
            { title: 'post 5', user: { _id: 'user0', _type: 'User' } },
            { title: 'post 6', user: { _id: 'user1', _type: 'User' } },
            { title: 'post 7', user: { _id: 'user2', _type: 'User' } },
            { title: 'post 8', user: { _id: 'user3', _type: 'User' } },
            { title: 'post 9', user: { _id: 'user4', _type: 'User' } }
        ]
    },

    {
        should: 'frame deep objects',
        model: 'BlogPost',
        field: {
            _id: '_id',
            _type: '_type',
            'yo.title': 'title',
            'yo.user': 'author.name'
        },
        options: {sort: ['yo.title']},
        results: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                yo: { user: 'user 0', title: 'post 0' }
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                yo: { user: 'user 1', title: 'post 1' }
            },
            {
                _id: 'blogpost2',
                _type: 'BlogPost',
                yo: { user: 'user 2', title: 'post 2' }
            },
            {
                _id: 'blogpost3',
                _type: 'BlogPost',
                yo: { user: 'user 3', title: 'post 3' }
            },
            {
                _id: 'blogpost4',
                _type: 'BlogPost',
                yo: { user: 'user 4', title: 'post 4' }
            },
            {
                _id: 'blogpost5',
                _type: 'BlogPost',
                yo: { user: 'user 0', title: 'post 5' }
            },
            {
                _id: 'blogpost6',
                _type: 'BlogPost',
                yo: { user: 'user 1', title: 'post 6' }
            },
            {
                _id: 'blogpost7',
                _type: 'BlogPost',
                yo: { user: 'user 2', title: 'post 7' }
            },
            {
                _id: 'blogpost8',
                _type: 'BlogPost',
                yo: { user: 'user 3', title: 'post 8' }
            },
            {
                _id: 'blogpost9',
                _type: 'BlogPost',
                yo: { user: 'user 4', title: 'post 9' }
            }
        ]
    },

    {
        should: 'frame embed relation fields',
        model: 'BlogPost',
        field: {
            title: 'title',
            'author.name': 'author.name',
            'author.sex': 'author.gender'
        },
        options: {sort: ['title']},
        results: [
            { title: 'post 0', author: { name: 'user 0', sex: 'male' } },
            { title: 'post 1', author: { name: 'user 1', sex: 'female' } },
            { title: 'post 2', author: { name: 'user 2', sex: 'male' } },
            { title: 'post 3', author: { name: 'user 3', sex: 'female' } },
            { title: 'post 4', author: { name: 'user 4', sex: 'male' } },
            { title: 'post 5', author: { name: 'user 0', sex: 'male' } },
            { title: 'post 6', author: { name: 'user 1', sex: 'female' } },
            { title: 'post 7', author: { name: 'user 2', sex: 'male' } },
            { title: 'post 8', author: { name: 'user 3', sex: 'female' } },
            { title: 'post 9', author: { name: 'user 4', sex: 'male' } }
        ]
    },

    {
        should: 'frame inverse relationships',
        model: 'User',
        field: {
            name: 'name',
            posts: 'blogPosts.title',
            postAuthor: 'blogPosts.author'
        },
        options: {sort: ['name', 'posts']},
        results: [
            { name: 'user 0', posts: 'post 0', postAuthor: 'user0' },
            { name: 'user 0', posts: 'post 5', postAuthor: 'user0' },
            { name: 'user 1', posts: 'post 1', postAuthor: 'user1' },
            { name: 'user 1', posts: 'post 6', postAuthor: 'user1' },
            { name: 'user 2', posts: 'post 2', postAuthor: 'user2' },
            { name: 'user 2', posts: 'post 7', postAuthor: 'user2' },
            { name: 'user 3', posts: 'post 3', postAuthor: 'user3' },
            { name: 'user 3', posts: 'post 8', postAuthor: 'user3' },
            { name: 'user 4', posts: 'post 4', postAuthor: 'user4' },
            { name: 'user 4', posts: 'post 9', postAuthor: 'user4' }
        ]
    },

];
