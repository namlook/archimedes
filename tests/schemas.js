
export default {
    User: {
        properties: {
            name: 'string',
            gender: 'string',
            birthday: 'date'
        }
    },
    Content: {
        properties: {
            title: 'string',
            body: 'string',
            author: {
                type: 'User',
                reverse: 'contents'
            },
            createdDate: 'date'
        },
        methods: {
            writtenBy() {
                return this.get('author');
            }
        }
    },
    Comment: {
        properties: {
            body: 'string',
            author: {
                type: 'User',
                reverse: 'comments'
            },
            comments: {
                type: 'array',
                items: 'Comment'
            }
        }
    },
    AvailableOnline: {
        properties: {
            slug: 'string',
            comments: {
                type: 'array',
                items: 'Comment',
                reverse: 'onlineContents'
            },
            tags: {
                type: 'array',
                items: 'string'
            },
            ratting: {
                type: 'number',
                validate: [{precision: 2}, {min: 0}, {max: 5}],
                meta: {
                    deprecated: true
                }
            }
        },
        methods: {
            generateSlug() {
                return this.get('title').split(' ').join('-');
            }
        }
    },
    Book: {
        mixins: ['Content'],
        properties: {
            isbn: 'string',
            reviewer: {
                type: 'User',
                reverse: 'reviewedBooks'
            }
        },
        statics: {
            checkIsbn(isbn) {
                return isbn.indexOf('isbn:') > -1;
            }
        }
    },
    Ebook: {
        mixins: ['Book', 'AvailableOnline']
    },
    BlogPost: {
        mixins: ['Content', 'AvailableOnline'],
        properties: {
            backlinks: {
                type: 'array',
                items: 'string'
            },
            updatedDate: 'date',
            publishedDate: 'date',
            isPublished: 'boolean'
        }
    },
    GenericType: {
        properties: {
            dates: {
                type: 'array',
                items: 'date'
            }
        }
    }
};