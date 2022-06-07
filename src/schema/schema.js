const directus = require('../directus');
const fetch = require('node-fetch');
const logger = require('../logger');

const serversData = require('./servers.data.json');

const {
    KEYS_COLLECTION,
    VARIABLES_COLLECTION,
    OVERRIDES_COLLECTION,
    PROJECTS_COLLECTION,
    SERVERS_COLLECTION
} = require('../constants');

module.exports = async () => {
    /*
        @TODO Apply collection orders
        @TODO Apply collection columns order
     */

    /*
        Skip if collection KEYS_COLLECTION exists
     */
    if (await collectionExists(KEYS_COLLECTION)) {
        logger.info(`Collection ${KEYS_COLLECTION} found. Skipping importing db schema, relations, example data and project settings.`);
        return;
    }
    logger.info('Importing started...');

    /*
        Apply project settings, description, colors, etc.
     */
    logger.info('Applying project settings, description, colors, etc...');
    await setProjectSettings();

    /*
        Create db schema and set field relations
     */
    logger.info('Creating db schema and set field relations...');
    await createKeysCollection(KEYS_COLLECTION);
    await createVariablesCollection(VARIABLES_COLLECTION);
    await createOverridesCollection(OVERRIDES_COLLECTION);
    await createProjectsCollection(PROJECTS_COLLECTION);
    await createServersCollection(SERVERS_COLLECTION);
    await setVariablesCollectionKeyFieldRelation(VARIABLES_COLLECTION, KEYS_COLLECTION);
    await setVariablesCollectionProjectFieldRelation(VARIABLES_COLLECTION, PROJECTS_COLLECTION);
    await setOverridesCollectionKeyFieldRelation(OVERRIDES_COLLECTION, KEYS_COLLECTION);
    await setOverridesCollectionServersFieldRelation(OVERRIDES_COLLECTION, SERVERS_COLLECTION);
    await setProjectsCollectionVariablesFieldRelation(PROJECTS_COLLECTION, VARIABLES_COLLECTION);
    await setServersCollectionProjectFieldRelation(SERVERS_COLLECTION, PROJECTS_COLLECTION);
    await setServersCollectionOverridesFieldRelation(SERVERS_COLLECTION, OVERRIDES_COLLECTION);

    /*
        Load example data
    */
    logger.info(`Importing example data...`);
    await directus.items(SERVERS_COLLECTION).createMany(serversData);

    logger.info('Importing finished.');
}

async function collectionExists(collectionName) {
    try {
        await directus.collections.readOne(collectionName);
        return true;
    } catch (err) {
        /*
            Directus SDK have a strange behavior of retuning a permission error
            when a collection is not found.
        */
        if (err.message === `You don't have permission to access this.`) return false;
        throw err;
    }
}

async function setProjectSettings() {
    const settings = {
        custom_css: `
            #app, #main-content, body {
                --primary-alt: #F0ECFF !important;
                --primary-10: #F0ECFF !important;
                --primary-25: #D9D0FF !important;
                --primary-50: #9eb3ce !important;
                --primary-75: #829dbf !important;
                --primary-90: #496890 !important;
                --primary: #E35169 !important;
                --primary-110: #344a66 !important;
                --primary-125: #2d4059 !important;
                --primary-150: #26364b !important;
                --primary-175: #1f2c3d !important;
                --primary-190: #1F2C53 !important;
            }
        `,
        project_name: 'virail-env-server',
        project_url: 'https://github.com/ibrahim-netto/virail-env-server'
    }

    return directus.settings.update(settings);
}

async function createKeysCollection(keysCollectionName) {
    const collection = {
        collection: keysCollectionName,
        fields: [{
            field: 'key',
            type: 'string',
            meta: {
                interface: 'input',
                readonly: false,
                hidden: false,
                special: null,
                options: {
                    trim: true
                }
            },
            schema: {
                is_primary_key: true,
                length: 255,
                has_auto_increment: false
            }
        }, {
            field: 'info',
            type: 'text',
            schema: {},
            meta: {
                interface: 'input-multiline',
                special: null,
                options: {
                    trim: true
                }
            }
        }],
        schema: {},
        meta: {
            singleton: false
        }
    };

    return directus.collections.createOne(collection);
}

async function createVariablesCollection(variablesCollectionName) {
    const collection = {
        collection: variablesCollectionName,
        fields: [{
            field: 'id',
            type: 'uuid',
            meta: {
                hidden: true,
                readonly: true,
                interface: 'input',
                special: ['uuid']
            },
            schema: {
                is_primary_key: true,
                length: 36,
                has_auto_increment: false
            }
        }, {
            field: 'key',
            type: 'string',
            schema: {},
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                required: true,
                options: {
                    template: '{{key}} - {{info}}'
                }
            }
        }, {
            field: 'value',
            type: 'text',
            schema: {},
            meta: {
                interface: 'input-multiline',
                special: null,
                require: true,
                options: {
                    trim: true
                }
            }
        }, {
            field: 'project',
            type: 'uuid',
            schema: {},
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                required: true,
                options: {
                    template: '{{name}} - {{environment}}'
                }
            }
        }],
        schema: {},
        meta: {
            hidden: true,
            singleton: false
        }
    };

    return directus.collections.createOne(collection);
}

async function createOverridesCollection(overridesCollectionName) {
    const collection = {
        collection: overridesCollectionName,
        fields: [{
            field: 'id',
            type: 'uuid',
            meta: {
                hidden: true,
                readonly: true,
                interface: 'input',
                special: ['uuid']
            },
            schema: {
                is_primary_key: true,
                length: 36,
                has_auto_increment: false
            }
        }, {
            field: 'key',
            type: 'string',
            schema: {},
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                required: true,
                options: {
                    template: '{{key}} - {{info}}'
                }
            }
        }, {
            field: 'value',
            type: 'text',
            schema: {},
            meta: {
                interface: 'input-multiline',
                special: null,
                require: true,
                options: {
                    trim: true
                }
            }
        }, {
            field: 'server',
            type: 'uuid',
            schema: {},
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                required: true,
                options: {
                    template: '{{ip}}'
                }
            }
        }],
        schema: {},
        meta: {
            hidden: true,
            singleton: false
        }
    };

    return directus.collections.createOne(collection);
}

async function createProjectsCollection(projectsCollectionName) {
    const collection = {
        collection: projectsCollectionName,
        fields: [{
            field: 'id',
            type: 'uuid',
            meta: {
                hidden: true,
                readonly: true,
                interface: 'input',
                special: ['uuid']
            },
            schema: {
                is_primary_key: true,
                length: 36,
                has_auto_increment: false
            }
        }, {
            field: 'name',
            type: 'string',
            schema: {},
            meta: {
                interface: 'input',
                special: null,
                required: true,
                options: {
                    trim: true
                }
            }
        }, {
            field: 'environment',
            type: 'string',
            schema: {},
            meta: {
                interface: 'select-dropdown',
                special: null,
                required: true,
                options: {
                    choices: [{
                        text: 'development',
                        value: 'development'
                    }, {
                        text: 'production',
                        value: 'production'
                    }]
                }
            }
        }, {
            field: 'variables',
            type: 'alias',
            meta: {
                interface: 'list-o2m',
                special: ['o2m'],
                required: false,
                options: {
                    template: '{{key}} => {{value}}',
                    enableSelect: false
                }
            }
        }],
        schema: {},
        meta: { singleton: false }
    };

    return directus.collections.createOne(collection);
}

async function createServersCollection(serversCollectionName) {
    const collection = {
        collection: serversCollectionName,
        fields: [{
            field: 'id',
            type: 'uuid',
            meta: {
                hidden: true,
                readonly: true,
                interface: 'input',
                special: ['uuid']
            },
            schema: {
                is_primary_key: true,
                length: 36,
                has_auto_increment: false
            }
        }, {
            field: 'name',
            type: 'string',
            schema: {},
            meta: {
                interface: 'input',
                special: null,
                required: true,
                options: {
                    trim: true
                }
            }
        }, {
            field: 'ip',
            type: 'string',
            schema: {},
            meta: {
                interface: 'input',
                special: null,
                required: true,
                options: {
                    trim: true
                }
            }
        }, {
            field: 'project',
            type: 'uuid',
            schema: {},
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                required: true,
                options: {
                    template: '{{name}} - {{environment}}'
                }
            }
        }, {
            field: 'overrides',
            type: 'alias',
            meta: {
                interface: 'list-o2m',
                special: ['o2m'],
                required: false,
                options: {
                    template: '{{key}} => {{value}}',
                    enableSelect: false
                }
            }
        }, {
            field: 'static_token',
            type: 'string',
            schema: {},
            meta: {
                interface: 'input',
                special: null,
                required: false,
                options: {
                    trim: true
                },
                note: 'Composed by a min 64 character string.',
                validation: {
                    _and: [
                        {
                            static_token: {
                                _regex: '^.{64,}$'
                            }
                        }
                    ]
                },
                validation_message: 'static_token.length < 64'
            }
        }],
        schema: {},
        meta: { singleton: false }
    };

    return directus.collections.createOne(collection);
}

async function setVariablesCollectionKeyFieldRelation(variablesCollectionName, keysCollectionName) {
    const relation = {
        collection: variablesCollectionName,
        field: 'key',
        related_collection: keysCollectionName,
        meta: {
            sort_field: null
        },
        schema: {
            on_delete: 'SET NULL'
        }
    };

    return directus.relations.createOne(relation);
}

async function setVariablesCollectionProjectFieldRelation(variablesCollectionName, projectsCollectionName) {
    const relation = {
        collection: variablesCollectionName,
        field: 'project',
        related_collection: projectsCollectionName,
        meta: {
            sort_field: null
        },
        schema: {
            on_delete: 'SET NULL'
        }
    };

    return directus.relations.createOne(relation);
}

async function setOverridesCollectionKeyFieldRelation(overridesCollectionName, keysCollectionName) {
    return setVariablesCollectionKeyFieldRelation(overridesCollectionName, keysCollectionName);
}

async function setOverridesCollectionServersFieldRelation(overridesCollectionName, serversCollectionName) {
    const relation = {
        collection: overridesCollectionName,
        field: 'server',
        related_collection: serversCollectionName,
        meta: {
            sort_field: null
        },
        schema: {
            on_delete: 'SET NULL'
        }
    };

    return directus.relations.createOne(relation);
}

async function setProjectsCollectionVariablesFieldRelation(projectsCollectionName, variablesCollectionName) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${directus.auth.token}`
    };

    const relation = {
        collection: variablesCollectionName,
        field: 'project',
        related_collection: projectsCollectionName,
        meta: {
            one_field: 'variables',
            sort_field: null,
            one_deselect_action: 'delete'
        },
        schema: {
            on_delete: 'CASCADE'
        }
    };

    /*
        // return directus.relations.updateOne(variablesCollectionName, 'key', relation);

        There's a bug with Directus SDK:
        error = { message: '"params" is not allowed' };
        Here's the fn:

        async updateOne(collection, field, item) {
            if (`${collection}` === '')
                throw new EmptyParamError('collection');
            if (`${field}` === '')
                throw new EmptyParamError('field');
            return (await this.transport.patch(`/relations/${collection}/${field}`, {
                params: item,
            })).data;
        }

        "params" property is on the fn itself, so it's on every updateOne request.
        As a fallback, let's use node-fetch directly
    */

    return fetch(`${process.env.EXPRESS_DIRECTUS_API_URL}/relations/${variablesCollectionName}/project`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(relation),
    }).then(response => response.json())
}

async function setServersCollectionProjectFieldRelation(serversCollectionName, projectsCollectionName) {
    const relation = {
        collection: serversCollectionName,
        field: 'project',
        related_collection: projectsCollectionName,
        meta: {
            sort_field: null
        },
        schema: {
            on_delete: 'SET NULL'
        }
    };

    return directus.relations.createOne(relation);
}

async function setServersCollectionOverridesFieldRelation(serversCollectionName, overridesCollectionName) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${directus.auth.token}`
    };

    const relation = {
        collection: overridesCollectionName,
        field: 'server',
        related_collection: serversCollectionName,
        meta: {
            one_field: 'overrides',
            sort_field: null,
            one_deselect_action: 'delete'
        },
        schema: {
            on_delete: 'CASCADE'
        }
    };

    return fetch(`${process.env.EXPRESS_DIRECTUS_API_URL}/relations/${overridesCollectionName}/server`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(relation),
    }).then(response => response.json())
}