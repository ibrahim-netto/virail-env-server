const postgreClient = require('./postgre-client');
const eventEmitter = require('./event-emitter');

module.exports = async () => {
    if (!postgreClient._connected) await postgreClient.connect();

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
        CREATE OR REPLACE TRIGGER notify_new_user
        AFTER INSERT
        ON "directus_users"
        FOR EACH ROW
        EXECUTE PROCEDURE notify_new_user();
    `;

    await postgreClient.query(fnQuery);
    await postgreClient.query(triggerQuery);
    await postgreClient.query('LISTEN new_user');

    postgreClient.on('notification', (msg) => {
        if (msg.channel === 'new_user') {
            const payload = JSON.parse(msg.payload);
            eventEmitter.emit('new_user', payload);
        }
    });
}