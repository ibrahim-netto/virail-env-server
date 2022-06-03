const delay = require('delay');
const directus = require('./directus');
const logger = require('./logger');

const { CHECK_DIRECTUS_INTERVAL } = require('./constants');

module.exports = async () => {
    let directusReady = false;

    logger.info('Checking if Directus is ready...');
    while (!directusReady) {
        try {
            await directus.server.ping();
            directusReady = true;
        } catch {
            logger.info('Directus not ready, waiting...');
            await delay(CHECK_DIRECTUS_INTERVAL);
        }
    }

    logger.info('Directus ready');
};