const directus = require('./directus');
const { setCollectionLayoutColumnsOrder } = require('./utils');

module.exports.newUser = async (req, res) => {
    const collections = await directus.collections.readAll();
    /*
        @TODO Allow requests only from Directus instance
     */
    console.log();
}