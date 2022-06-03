const components = require('./components.swagger');
const paths = require('./paths.swagger');

const { VERSION, EXPRESS_PORT } = require('../constants');

const options = {
    openapi: '3.0.0',
    info: {
        title: 'Virail Env Server',
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
        url: `http://localhost:${EXPRESS_PORT}`,
        description: 'Local server'
    }],
    tags: {},
    ...components,
    ...paths
};

module.exports = options;