

export default [
    {
        should: 'save simple literals',
        save: [
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
        should: 'replace simple literals',
        import: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                body: 'this is the body of the post 0',
                createdDate: new Date(Date.UTC(1984, 7, 3)),
                ratting: 3,
                isPublished: true,
                tags: ['toto', 'tata']
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
        ],
        save: [
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 000',
                createdDate: new Date(Date.UTC(1984, 7, 8)),
                ratting: 4,
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 100',
                body: 'this is the body of the post 100',
                isPublished: true,
                tags: ['bar', 'foo']
            }
        ]
    },

    {
        should: 'save null values',
        save: [
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
        save: [
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
        should: 'save relations',
        save: [
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
        should: 'replace relations',
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
        ],
        save: [
            { _id: 'nico', _type: 'User' },
            // import the blogPosts
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                author: {_id: 'nico', _type: 'User'},
                credits: [{_id: 'timy', _type: 'User'}]
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                author: {_id: 'bob', _type: 'User'},
                credits: [
                    {_id: 'bob', _type: 'User'}
                ]
            }
        ],
        results: [
            // import the users
            { _id: 'bob', _type: 'User' },
            { _id: 'nico', _type: 'User' },
            { _id: 'timy', _type: 'User' },
            { _id: 'namlook', _type: 'User' },
            // import the blogPosts
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                author: {_id: 'nico', _type: 'User'},
                credits: [{_id: 'timy', _type: 'User'}]
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                author: {_id: 'bob', _type: 'User'},
                credits: [
                    {_id: 'bob', _type: 'User'}
                ]
            }
        ]
    },

    {
        should: 'save relations from only their _id',
        save: [
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
    },

    {
        should: 'replace relations from only their _id',
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
                author: 'bob',
                credits: ['timy', 'namlook']
            }
        ],
        save: [
            // import the users
            { _id: 'bob', _type: 'User' },
            { _id: 'timy', _type: 'User' },
            { _id: 'namlook', _type: 'User' },
            // import the blogPosts
            {
                _id: 'blogpost0',
                _type: 'BlogPost',
                title: 'post 0',
                author: 'namlook'
            },
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                author: 'namlook',
                credits: ['timy', 'bob']
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
                author: {_id: 'namlook', _type: 'User'}
            },
            // the blogPosts
            {
                _id: 'blogpost1',
                _type: 'BlogPost',
                title: 'post 1',
                author: {_id: 'namlook', _type: 'User'},
                credits: [
                    {_id: 'bob', _type: 'User'},
                    {_id: 'timy', _type: 'User'}
                ]
            }
        ]
    }
];
