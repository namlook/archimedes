

export default [
    {
        should: 'import simple literals',
        import: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                body: 'this is the body of the post 0',
                createdDate: new Date(Date.UTC(1984, 7, 3)),
                ratting: 3,
                isPublished: true
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                body: 'this is the body of the post 1',
                createdDate: new Date(Date.UTC(1984, 7, 4)),
                ratting: 4,
                isPublished: false
            }
        ]
    },

    {
        should: 'import null values',
        import: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                body: 'this is the body of the post 0',
                createdDate: null,
                ratting: null,
                isPublished: null
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                body: 'this is the body of the post 1',
                createdDate: null,
                ratting: null,
                isPublished: false
            }
        ],
        results: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                body: 'this is the body of the post 0'
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                body: 'this is the body of the post 1',
                isPublished: false
            }
        ]
    },

    {
        should: 'should convert values',
        import: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                body: 'this is the body of the post 0',
                createdDate: `${new Date(Date.UTC(1984, 7, 3))}`,
                ratting: '3',
                isPublished: 'true'
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                body: 'this is the body of the post 1',
                createdDate: `${new Date(Date.UTC(1984, 7, 4))}`,
                ratting: '4',
                isPublished: 'no'
            }
        ],
        results: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                body: 'this is the body of the post 0',
                createdDate: new Date(Date.UTC(1984, 7, 3)),
                ratting: 3,
                isPublished: true
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                body: 'this is the body of the post 1',
                createdDate: new Date(Date.UTC(1984, 7, 4)),
                ratting: 4,
                isPublished: false
            }
        ]
    },

    {
        should: 'import relations',
        import: [
            // import the users
            { _id: 'bob', _type: 'User' },
            { _id: 'timy', _type: 'User' },
            { _id: 'namlook', _type: 'User' },
            // import the blogPosts
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                author: {_id: 'bob', _type: 'User'}
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                author: {_id: 'timy', _type: 'User'},
                credits: [
                    {_id: 'bob', _type: 'User'},
                    {_id: 'namlook', _type: 'User'}
                ]
            }
        ]
    },

    {
        should: 'import relations from only their _id',
        import: [
            // import the users
            { _id: 'bob', _type: 'User' },
            { _id: 'timy', _type: 'User' },
            { _id: 'namlook', _type: 'User' },
            // import the blogPosts
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                author: 'bob'
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                author: 'timy',
                credits: ['namlook', 'bob']
            }
        ],
        results: [
            // the users
            { _id: 'bob', _type: 'User' },
            { _id: 'timy', _type: 'User' },
            { _id: 'namlook', _type: 'User' },
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                author: {_id: 'bob', _type: 'User'}
            },
            // the blogPosts
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                author: {_id: 'timy', _type: 'User'},
                credits: [
                    {_id: 'bob', _type: 'User'},
                    {_id: 'namlook', _type: 'User'}
                ]
            }
        ]
    }
];
