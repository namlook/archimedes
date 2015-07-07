
export default {
    User: {
        properties: {
            name: 'string'
        }
    },
    Content: {
        properties: {
            title: 'string',
            body: 'string',
            author: 'User',
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
            body: 'string'
        }
    },
    AvailableOnline: {
        properties: {
            slug: 'string',
            comments: {
                type: 'array',
                items: 'Comment'
            },
            tags: {
                type: 'array',
                items: 'string'
            },
            ratting: {
                type: 'number',
                validate: [{min: 0}, {max: 5}],
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
            isbn: 'string'
        },
        statics: {
            checkIsbn(isbn) {
                return isbn.indexOf('isbn:') > -1;
            }
        }
    },
    EBook: {
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
            isPublished: 'boolean'
        }
    }
};