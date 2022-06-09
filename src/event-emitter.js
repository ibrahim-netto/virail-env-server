const EventEmitter = require('events');
const { setCollectionLayoutColumnsOrder } = require('./utils');
const {
    KEYS_COLLECTION,
    VARIABLES_COLLECTION,
    OVERRIDES_COLLECTION,
    PROJECTS_COLLECTION,
    SERVERS_COLLECTION
} = require('./constants');

const eventEmitter = new EventEmitter();

/*
    Listen for new users, apply collection columns order
 */

eventEmitter.on('new_user', async user => {
    await Promise.all([
        setCollectionLayoutColumnsOrder(KEYS_COLLECTION, ['key', 'info'], user.id),
        setCollectionLayoutColumnsOrder(VARIABLES_COLLECTION, ['key', 'value', 'project'], user.id),
        setCollectionLayoutColumnsOrder(OVERRIDES_COLLECTION, ['key', 'value', 'server'], user.id),
        setCollectionLayoutColumnsOrder(PROJECTS_COLLECTION, ['name', 'environment', 'variables'], user.id),
        setCollectionLayoutColumnsOrder(SERVERS_COLLECTION, ['name', 'ip', 'project', 'overrides'], user.id)
    ]);
});

module.exports = eventEmitter;