
export default {
    Rateable: {
        properties: {
            ratting: {
                type: 'number',
                validate: [{precision: 2}, {min: 0}, {max: 5}],
                meta: {
                    deprecated: true
                }
            }
        }
    },

    Content: {
        properties: {
            author: {
                type: 'User'
            },
            body: {
                type: 'string'
            },
            createdDate: {
                type: 'date'
            }
        },

        methods: {
            writtenBy() {
                return this.get('author');
            }
        },

        statics: {
            utility() {
                return 'ok';
            }
        }
    },

    OnlineContent: {
        mixins: ['Content'],
        properties: {
            slug: 'string'
        },
        inverseRelationships: {
            comments: {
                type: 'Comment',
                property: 'target',
                propagateDeletion: true
            }
        },
        methods: {
            generateSlug() {
                return this.get('title').split(' ').join('-');
            }
        }
    },


    Comment: {
        mixins: ['Rateable', 'OnlineContent'],
        properties: {
            target: {
                type: 'OnlineContent'
            }
        }
    },

    BlogPost: {
        mixins: ['Rateable', 'OnlineContent'],
        properties: {
            title: 'string',
            tags: {
                type: 'array',
                items: 'string'
            },
            credits: {
                type: 'array',
                items: 'User'
            },
            backlinks: {
                type: 'array',
                items: {
                    type: 'string',
                    validate: ['uri']
                }
            },
            updatedDate: 'date',
            publishedDate: 'date',
            isPublished: 'boolean'
        }
    },

    Book: {
        mixins: ['Content'],
        properties: {
            isbn: 'string',
            reviewer: {
                type: 'User'
            }
        },
        statics: {
            checkIsbn(isbn) {
                return isbn.indexOf('isbn:') > -1;
            }
        }
    },

    Ebook: {
        mixins: ['Book', 'OnlineContent']
    },


    User: {
        properties: {
            name: {
                type: 'string'
            },
            gender: {
                type: 'string'
            },
            birthday: {
                type: 'date'
            },
            genericStaff: {
                type: 'GenericType',
                propagateDeletion: true
            },
            genericStuff: {
                type: 'array',
                items: 'GenericType',
                propagateDeletion: true
            }
        },
        inverseRelationships: {
            blogPosts: {
                type: 'BlogPost',
                property: 'author',
                propagateDeletion: true
            },
            reviewedBooks: {
                type: 'Book',
                property: 'reviewer',
                propagateDeletion: 'reviewer'
            },
            contents: {
                type: 'Content',
                property: 'author',
                propagateDeletion: 'author'
            },
            comments: {
                type: 'Comment',
                property: 'author',
                propagateDeletion: 'author'
            }
        }
    },

    GenericType: {
        properties: {
            text: 'string',
            dates: {
                type: 'array',
                items: 'date'
            }
        }
    }
};
