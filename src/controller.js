const _ = require('lodash');
const directus = require('./directus');
const getAuthFilter = require('./get-auth-filter');

const { SERVERS_COLLECTION } = require('./constants');

module.exports.getEnv = async (req, res, next) => {
    try {
        const filter = getAuthFilter(req);

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

        const env = variables?.reduce((acc, entry) => acc += `${entry.key}="${entry.value}"\n`, '');
        res.type('text/plain').send(env);
    } catch (err) {
        next(err);
    }
}

module.exports.getConfig = async (req, res, next) => {
    try {
        const filter = getAuthFilter(req);

        const query = {
            filter,
            fields: [
                'id',
            ]
        };
        const server = await directus.items(SERVERS_COLLECTION)
            .readByQuery(query)
            .then(response => response?.data[0]);

        if (!server) {
            res.status(403).json({ status: 'error', message: `You don't have permission to access this.` });
            return;
        }

        const collection = req.params.collection;
        /*
            Aparently this system collection doesn't support filters

            'This endpoint doesn't currently support any query parameters.'
            https://docs.directus.io/reference/system/collections.html#the-collection-object
         */
        const group = await directus.items('directus_collections')
            .readByQuery({
                limit: -1
            })
            .then(response => response.data.filter(v => v.collection === collection))
            .then(data => data[0]?.meta?.group);

        if (group !== 'configs') {
            /*
                Collection needs to be in configs group, otherwise this endpoint could
                open a security risk
             */
            res.status(403).json({ status: 'error', message: `You don't have permission to access this.` });
            return;
        }

        const result = await directus.items(collection)
            .readByQuery({
                filter: {
                    server: {
                        _eq: server.id
                    }
                }
            })
            .then(response => response?.data[0]);

        if (result?.config) {
            res.type('text/plain').send(result.config);
        } else {
            /*
                Config not found
             */
            res.sendStatus(404);
        }
    } catch (err) {
        next(err);
    }
}