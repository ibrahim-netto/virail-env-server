module.exports = (req, res, next) => {
    res.set('X-Project', 'virail-env-server-docs');
    next();
}