const pg = require('pg');

/*
    For development, expose postgree docker-compose service port to the host, and
    change client host to 'localhost'
 */

const postgreClient = new pg.Client({
    // host: process.env.DIRECTUS_DB_HOST,
    host: 'localhost',
    port: process.env.DIRECTUS_DB_PORT,
    user: process.env.DIRECTUS_DB_USER,
    password: process.env.DIRECTUS_DB_PASSWORD,
    database: process.env.DIRECTUS_DB_DATABASE
});

module.exports = postgreClient;