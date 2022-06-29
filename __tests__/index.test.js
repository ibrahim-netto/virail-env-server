require('dotenv').config();

const _ = require('lodash');
const fetch = require('node-fetch');
const { Directus } = require('@directus/sdk');

const { KEYS_COLLECTION, SERVERS_COLLECTION, PROJECTS_COLLECTION } = require('../src/constants');
const ENV_SERVER_TEST_NAME = 'Env Server Test';
const ENV_SERVER_TEST_VARIABLES = [
    { key: 'ENV_SERVER_TEST_NODE_ENV', value: 'development' },
    { key: 'ENV_SERVER_TEST_NODE_CLUSTER', value: '0' },
];
const DIRECTUS_API_URL = 'http://localhost:8055';
const NODE_API_URL = 'http://localhost:3000';
const LOCAL_IP = '::1';

const directus = new Directus(DIRECTUS_API_URL);

describe('Env Server', () => {
    beforeAll(async () => {
        await directus.auth.login({
            email: process.env.DIRECTUS_ADMIN_EMAIL,
            password: process.env.DIRECTUS_ADMIN_PASSWORD
        });

        for (const entry of ENV_SERVER_TEST_VARIABLES) {
            await createKey(entry.key);
        }

        try {
            await createServer({
                name: ENV_SERVER_TEST_NAME,
                ip: LOCAL_IP,
                project: {
                    id: 99999,
                    name: `${ENV_SERVER_TEST_NAME} Project`,
                    environment: 'development',
                    variables: ENV_SERVER_TEST_VARIABLES.map(entry => {
                        return {
                            key: {
                                key: entry.key,
                                info: 'Used for testing purposes.'
                            },
                            value: entry.value,
                            project: 99999
                        }
                    }),
                },
                static_token: await directus.utils.random.string(64),
                overrides: []
            });
        } catch (err) {
            console.error(err);
        }
    });

    afterAll(async () => {
        await deleteServerByName(ENV_SERVER_TEST_NAME);
        await deleteProjectByName(`${ENV_SERVER_TEST_NAME} Project`);
        for (const entry of ENV_SERVER_TEST_VARIABLES) {
            await deleteKey(entry.key);
        }
    });

    test('Get .env with static_token', async () => {
        const server = await getServerByName(ENV_SERVER_TEST_NAME);

        const url = `${NODE_API_URL}/api/v1/env`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${server.static_token}`
        };
        const response = await fetch(url, {
            headers,
            'method': 'GET'
        }).then(response => response.text());

        const expectedOutput = buildEnvOutput(ENV_SERVER_TEST_VARIABLES, server.static_token);
        expect(response).toEqual(expectedOutput);
    });

    test('Get .env with IP authentication', async () => {
        const server = await getServerByName(ENV_SERVER_TEST_NAME);

        const url = `${NODE_API_URL}/api/v1/env`;
        const headers = {
            'Content-Type': 'application/json'
        };
        const response = await fetch(url, {
            headers,
            'method': 'GET'
        }).then(response => response.text());

        const expectedOutput = buildEnvOutput(ENV_SERVER_TEST_VARIABLES, server.static_token);
        expect(response).toEqual(expectedOutput);
    });

    test('Deny access without autorized IP', async () => {
        const server = await getServerByName(ENV_SERVER_TEST_NAME);
        /*
            Change authorized server IP to random
         */
        await directus.items(SERVERS_COLLECTION).updateOne(server.id, {
            ip: '999.999.999.999'
        });

        const url = `${NODE_API_URL}/api/v1/env`;
        const headers = {
            'Content-Type': 'application/json'
        };
        const response = await fetch(url, {
            headers,
            'method': 'GET'
        }).then(response => response.json());

        const expectedOutput = {
            status: 'error',
            message: `You don't have permission to access this.`
        };
        expect(response).toMatchObject(expectedOutput);
    });

    test('Deny access without autorized IP and a valid static_token', async () => {
        const server = await getServerByName(ENV_SERVER_TEST_NAME);
        /*
            Change authorized server IP to random
         */
        await directus.items(SERVERS_COLLECTION).updateOne(server.id, {
            ip: '999.999.999.999'
        });

        const url = `${NODE_API_URL}/api/v1/env`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await directus.utils.random.string(64)}`
        };
        const response = await fetch(url, {
            headers,
            'method': 'GET'
        }).then(response => response.json());

        const expectedOutput = {
            status: 'error',
            message: `You don't have permission to access this.`
        };
        expect(response).toMatchObject(expectedOutput);
    });
});

async function getKey(key) {
    return await directus.items(KEYS_COLLECTION).readByQuery({
        filter: { key: { _eq: key } }
    }).then(response => response?.data[0]);
}

async function createKey(key) {
    const item = await getKey(key);

    if (!item) {
        return await directus.items(KEYS_COLLECTION).createOne({
            key: key,
            info: 'Used for testing purposes.'
        });
    }
    return item;
}

async function deleteKey(key) {
    const item = await getKey(key);

    if (item) {
        return await directus.items(KEYS_COLLECTION).deleteOne(item.key);
    }
    return true;
}

async function getProjectByName(name) {
    return await directus.items(PROJECTS_COLLECTION).readByQuery({
        filter: { name: { _eq: name } }
    }).then(response => response?.data[0]);
}

async function deleteProjectByName(name) {
    const item = await getProjectByName(name);

    if (item) {
        return await directus.items(PROJECTS_COLLECTION).deleteOne(item.id);
    }
    return true;
}

async function getServerByName(name) {
    return await directus.items(SERVERS_COLLECTION).readByQuery({
        filter: { name: { _eq: name } }
    }).then(response => response?.data[0]);
}

async function createServer(server) {
    const item = await getServerByName(server.name);

    if (!item) {
        return await directus.items(SERVERS_COLLECTION).createOne(server);
    }
    return item;
}

async function deleteServerByName(name) {
    const item = await getServerByName(name);

    if (item) {
        return await directus.items(SERVERS_COLLECTION).deleteOne(item.id);
    }
    return true;
}

function buildEnvOutput(variables, static_token) {
    const sortedVariables = _.sortBy([
        ...variables,
        { key: 'STATIC_TOKEN', value: static_token || '' }
    ], 'key');

    return sortedVariables?.reduce((acc, entry) => acc += `${entry.key}="${entry.value}"\n`, '');
}