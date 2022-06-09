const fetch = require('node-fetch');
const directus = require('./directus');

module.exports.setCollectionLayoutColumnsOrder = async (collection, columnsOrder, userId) => {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${directus.auth.token}`
    };

    const preset = {
        user: userId,
        layout_query: { tabular: { fields: columnsOrder } },
        layout_options: { tabular: { widths: {} } },
        collection: collection
    }

    return fetch(`${process.env.EXPRESS_DIRECTUS_API_URL}/presets`, {
        headers,
        body: JSON.stringify(preset),
        'method': 'POST'
    });
}