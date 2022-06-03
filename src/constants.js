const packageJson = require('../package.json');

module.exports.VERSION = packageJson.version;
module.exports.EXPRESS_PORT = 3000;
module.exports.CHECK_DIRECTUS_INTERVAL = 1000 * 10;
module.exports.SERVERS_COLLECTION = 'servers';
module.exports.PROJECTS_COLLECTION = 'projects';
module.exports.VARIABLES_COLLECTION = 'variables';
module.exports.OVERRIDES_COLLECTION = 'overrides';
module.exports.KEYS_COLLECTION = 'keys';