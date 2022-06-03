const directus = require('./directus');
const logger = require('./logger');

module.exports = async () => {
    /*
        Set static token for admin user
     */
    await directus.auth.login({
        email: process.env.DIRECTUS_ADMIN_EMAIL,
        password: process.env.DIRECTUS_ADMIN_PASSWORD
    });

    const admin = await directus.users.me.read();

    if (admin.token) {
        await directus.auth.static(admin.token);
    } else {
        logger.info(`Generating new static token for user ${process.env.DIRECTUS_ADMIN_EMAIL}...`);
        const token = await directus.utils.random.string();
        await directus.users.me.update({ token });
        await directus.auth.static(token);
    }
}