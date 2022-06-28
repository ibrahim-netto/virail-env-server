const components = require('./components.swagger');
const paths = require('./paths.swagger');

const { PROJECT_NAME, VERSION } = require('../constants');

const options = {
    openapi: '3.0.0',
    info: {
        title: PROJECT_NAME,
        version: VERSION,
        description: '',
        license: {
            name: 'GPL-3.0-or-later',
        },
        contact: {
            name: 'Ibrahim Netto',
            url: 'https://github.com/ibrahim-netto/virail-env-server',
            email: 'ibrahim.netto@virail.com',
        },
    },
    schemes: ['http', 'https'],
    consumes: [],
    produces: ['text/plain'],
    servers: [ {
        url: process.env.EXPRESS_PUBLIC_URL
    }],
    tags: {},
    ...components,
    ...paths
};

module.exports = options;