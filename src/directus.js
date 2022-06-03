const { Directus } = require('@directus/sdk');

const directus = new Directus(process.env.EXPRESS_DIRECTUS_API_URL, {
    auth: {
        staticToken: process.env.DIRECTUS_TOKEN
    }
});

module.exports = directus;