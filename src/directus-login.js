const directus = require('./directus');

module.exports = async () => {
    await directus.auth.login({
        email: process.env.DIRECTUS_ADMIN_EMAIL,
        password: process.env.DIRECTUS_ADMIN_PASSWORD
    });
}