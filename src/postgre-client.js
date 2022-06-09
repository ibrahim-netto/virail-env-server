const pg = require('pg');
const eventEmitter = require('./event-emitter');

/*
    For development, expose postgree docker-compose service port to the host, and
    change client host to 'localhost'
 */
const postgreClient = new pg.Client({
    host: process.env.DIRECTUS_DB_HOST,
    port: process.env.DIRECTUS_DB_PORT,
    user: process.env.DIRECTUS_DB_USER,
    password: process.env.DIRECTUS_DB_PASSWORD,
    database: process.env.DIRECTUS_DB_DATABASE
});

postgreClient.connect().then(async () => {
    const fnQuery = `
        CREATE OR REPLACE FUNCTION notify_new_user()
        RETURNS trigger AS
        $BODY$
            BEGIN
                PERFORM pg_notify('new_user', row_to_json(NEW)::text);
                RETURN NULL;
            END; 
        $BODY$
        LANGUAGE plpgsql VOLATILE
        COST 100;
    `;

    const triggerQuery = `
        CREATE TRIGGER notify_new_user
        AFTER INSERT
        ON "directus_users"
        FOR EACH ROW
        EXECUTE PROCEDURE notify_new_user();
    `;

    await postgreClient.query(fnQuery);
    await postgreClient.query(triggerQuery);
    await postgreClient.query('LISTEN new_user');
});

postgreClient.on('notification', (msg) => {
    if (msg.channel === 'new_user') {
        const payload = JSON.parse(msg.payload);
        eventEmitter.emit('new_user', payload);
    }
});

module.exports = postgreClient;