const _ = require('lodash');
const directus = require('./directus');

const { SERVERS_COLLECTION } = require('./constants');

module.exports.getEnv = async (req, res, next) => {
    try {
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
            const ip = req.ip;
            filter.ip = { _eq: ip }
        }

        const query = {
            filter,
            fields: [
                'id',
                'ip',
                'project.name',
                'project.type',
                'project.variables.key',
                'project.variables.value',
                'overrides.key',
                'overrides.value',
                'static_token'
            ]
        };
        const server = await directus.items(SERVERS_COLLECTION)
            .readByQuery(query)
            .then(response => response?.data[0]);

        if (!server) {
            res.status(403).json({ status: 'error', message: `You don't have permission to access this.` });
            return;
        }

        /*
            Create an array sorted by 'key' with overrides variables and the difference between
            overrides and project variables, making overrides to have precedence over
            project variables with the same name
         */
        const variables = _.sortBy([
            ...server.overrides,
            ...(_.differenceBy(server.project.variables, server.overrides, 'key')),
            { key: 'STATIC_TOKEN', value: server.static_token || '' }
        ], 'key');

        const env = variables?.reduce((acc, entry) => acc += `${entry.key}=${entry.value}\n`, '');
        res.type('text/plain').send(env);
    } catch (err) {
        next(err);
    }
}