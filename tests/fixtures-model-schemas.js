
export default {
    Content: {
        properties: {
            title: 'string',
            body: 'string',
            author: 'string'
        },
        methods: {
            writtenBy() {
                console.log('its ' + this.attrs.author);
            }
        }
    },
    AvailableOnline: {
        properties: {
            slug: 'string',
            comments: {
                type: 'string',
                multi: true
            },
            tags: {
                type: 'string',
                multi: true
            }
        },
        methods: {
            generateSlug() {
                return this.attrs.title.split(' ').join('-');
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
                type: 'string',
                multi: true
            }
        }
    }
};