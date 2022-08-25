const getIp = require('./get-ip');

module.exports = req => {
    const token = req.get('Authorization')?.replace('Bearer ', '');
    const filter = {};

    if (token) {
        /*
            Static token authentication expects string with a length of 64
         */
        if (token.length < 64) {
            res.status(403).json({ status: 'error', message: `You don't have permission to access this.` });
            return;
        }

        filter.static_token = token;
    } else {
        /*
            With IP based authentication, it's not possible to get the IP if it's behind a proxy because
            it opens a security flaw where the IP could be spoofed on the x-forwarded-for HTTP header.
        */
        const ip = getIp(req);
        filter.ip = { _eq: ip }
    }

    return filter;
}