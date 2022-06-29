const { PROJECT_NAME } = require('../constants');

module.exports = (req, res, next) => {
    if (!!+process.env.EXPRESS_VARNISH_HEADERS) {
        res.set('X-Project', `${PROJECT_NAME}-docs`);
    }
    next();
}