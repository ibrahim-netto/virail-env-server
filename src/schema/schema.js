const fs = require('fs/promises');
const path = require('path');
const postgrePool = require('../postgre-pool');
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
        Apply collection columns order
     */
    const userId = await directus.users.me.read().then(user => user.id);
    await setCollectionLayoutColumnsOrder(KEYS_COLLECTION, ['key', 'info'], userId);
    await setCollectionLayoutColumnsOrder(VARIABLES_COLLECTION, ['key', 'value', 'project'], userId);
    await setCollectionLayoutColumnsOrder(OVERRIDES_COLLECTION, ['key', 'value', 'server'], userId);
    await setCollectionLayoutColumnsOrder(PROJECTS_COLLECTION, ['name', 'environment', 'variables'], userId);
    await setCollectionLayoutColumnsOrder(SERVERS_COLLECTION, ['name', 'ip', 'project', 'overrides'], userId);

    /*
        Set user_created && user_updated relations
     */
    const collections = [
        KEYS_COLLECTION,
        VARIABLES_COLLECTION,
        OVERRIDES_COLLECTION,
        PROJECTS_COLLECTION,
        SERVERS_COLLECTION
    ];

    for (const collection of collections) {
        await Promise.all([
            setCollectionUserCreatedFieldRelation(collection),
            setCollectionUserUpdatedFieldRelation(collection)
        ]);
    }

    /*
        Add compound constraints
    */
    await Promise.all([
        addCollectionCompoundUniqueKeyConstraint(VARIABLES_COLLECTION, 'key', 'project'),
        addCollectionCompoundUniqueKeyConstraint(PROJECTS_COLLECTION, 'name', 'environment')
    ]);

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
    const customCss = await fs.readFile(path.join(__dirname, 'custom.css'), 'utf8');

    const settings = {
        project_name: 'virail-env-server',
        project_url: 'https://github.com/ibrahim-netto/virail-env-server',
        default_language: 'en-US',
        project_color: '#E35169',
        custom_css: customCss
    }

    return directus.settings.update(settings);
}

async function setCollectionLayoutColumnsOrder(collection, columnsOrder, user) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${directus.auth.token}`
    };

    const preset = {
        user,
        layout_query: { tabular: { fields: columnsOrder } },
        layout_options: { tabular: { widths: {} } },
        collection: collection
    }

    return fetch(`${process.env.EXPRESS_DIRECTUS_API_URL}/presets`, {
        headers,
        body: JSON.stringify(preset),
        'method': 'POST'
    });
}

async function createNewUserWebhook(url) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${directus.auth.token}`
    };

    const webhook = {
        name: 'New User',
        actions: ['create'],
        collections: ['keys'],
        data: true,
        method: 'POST',
        url: 'http://192.168.1.107:3000/hooks/new-user'
    };

    return fetch(`${process.env.EXPRESS_DIRECTUS_API_URL}/webhooks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(webhook),
    }).then(response => response.json());
}

function getMetadataFields() {
    return [{
        field: 'user_created',
        type: 'uuid',
        meta: {
            special: ['user-created'],
            interface: 'select-dropdown-m2o',
            options: {
                template: '{{avatar.$thumbnail}} {{first_name}} {{last_name}}'
            },
            display: 'user',
            readonly: true,
            hidden: false,
            width: 'half'
        },
        schema: {}
    }, {
        field: 'date_created',
        type: 'timestamp',
        meta: {
            special: ['date-created'],
            interface: 'datetime',
            readonly: true,
            hidden: false,
            width: 'half',
            display: 'datetime',
            display_options: {
                relative: true
            }
        },
        schema: {}
    }, {
        field: 'user_updated',
        type: 'uuid',
        meta: {
            special: ['user-updated'],
            interface: 'select-dropdown-m2o',
            options: {
                template: '{{avatar.$thumbnail}} {{first_name}} {{last_name}}'
            },
            display: 'user',
            readonly: true,
            hidden: false,
            width: 'half'
        },
        schema: {}
    }, {
        field: 'date_updated',
        type: 'timestamp',
        meta: {
            special: ['date-updated'],
            interface: 'datetime',
            readonly: true,
            hidden: false,
            width: 'half',
            display: 'datetime',
            display_options: {
                relative: true
            }
        },
        schema: {}
    }]
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
                },
                display: 'formatted-value',
                display_options: {
                    icon: 'vpn_key',
                    color: '#E35169'
                },
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
        },
            ...getMetadataFields()
        ],
        schema: {},
        meta: {
            singleton: false,
            icon: 'vpn_key',
            display_template: '{{key}} ({{info}})',
            sort: 1
        }
    };

    return directus.collections.createOne(collection);
}

async function createVariablesCollection(variablesCollectionName) {
    const collection = {
        collection: variablesCollectionName,
        fields: [{
            field: 'id',
            type: 'integer',
            meta: {
                hidden: true,
                readonly: true,
                interface: 'input',
                special: null,
                required: true
            },
            schema: {
                is_primary_key: true,
                has_auto_increment: true
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
            type: 'integer',
            schema: {},
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                required: true,
                options: {
                    template: '{{name}} - {{environment}}'
                },
                display: 'related-values',
                display_options: {
                    template: '{{name}} - {{environment}}'
                }
            }
        },
            ...getMetadataFields()
        ],
        schema: {},
        meta: {
            singleton: false,
            icon: 'abc',
            sort: 2
        }
    };

    return directus.collections.createOne(collection);
}

async function createOverridesCollection(overridesCollectionName) {
    const collection = {
        collection: overridesCollectionName,
        fields: [{
            field: 'id',
            type: 'integer',
            meta: {
                hidden: true,
                readonly: true,
                interface: 'input',
                special: null,
                required: true
            },
            schema: {
                is_primary_key: true,
                has_auto_increment: true
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
            type: 'integer',
            schema: {},
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                required: true,
                options: {
                    template: '{{ip}}'
                }
            }
        },
            ...getMetadataFields()
        ],
        schema: {},
        meta: {
            hidden: true,
            singleton: false,
            sort: 3
        }
    };

    return directus.collections.createOne(collection);
}

async function createProjectsCollection(projectsCollectionName) {
    const collection = {
        collection: projectsCollectionName,
        fields: [{
            field: 'id',
            type: 'integer',
            meta: {
                hidden: true,
                readonly: true,
                interface: 'input',
                special: null,
                required: true
            },
            schema: {
                is_primary_key: true,
                has_auto_increment: true
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
                },
                display: 'formatted-value',
                display_options: {
                    font: 'monospace',
                    bold: true,
                    color: '#3399FF'
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
                },
                display: 'labels',
                display_options: {
                    choices: [{
                        text: 'development',
                        value: 'development',
                        foreground: '#FFFFFF',
                        background: '#c8cd2e'
                    }, {
                        text: 'production',
                        value: 'production',
                        foreground: '#FFFFFF',
                        background: '#68cd2e'
                    }]
                },
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
                },
                display: 'related-values',
                display_options: {
                    template: '{{key}}'
                }
            }
        },
            ...getMetadataFields()
        ],
        schema: {},
        meta: {
            singleton: false,
            icon: 'card_travel',
            sort: 4
        }
    };

    return directus.collections.createOne(collection);
}

async function createServersCollection(serversCollectionName) {
    const collection = {
        collection: serversCollectionName,
        fields: [{
            field: 'id',
            type: 'integer',
            meta: {
                hidden: true,
                readonly: true,
                interface: 'input',
                special: null,
                required: true
            },
            schema: {
                is_primary_key: true,
                has_auto_increment: true
            }
        }, {
            field: 'name',
            type: 'string',
            schema: {
                is_unique: true
            },
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
            schema: {
                is_unique: true
            },
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
            type: 'integer',
            schema: {},
            meta: {
                interface: 'select-dropdown-m2o',
                special: ['m2o'],
                required: true,
                options: {
                    template: '{{name}} - {{environment}}'
                },
                display: 'related-values',
                display_options: {
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
                },
                display: 'related-values',
                display_options: {
                    template: '{{key}}'
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
        },
            ...getMetadataFields()
        ],
        schema: {},
        meta: {
            singleton: false,
            icon: 'dns',
            sort: 5
        }
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
    }).then(response => response.json());
}

function setCollectionUserCreatedFieldRelation(collection) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${directus.auth.token}`
    };

    const relation = {
        collection: collection,
        field: 'user_created',
        related_collection: 'directus_users',
        schema: {}
    };

    return fetch(`${process.env.EXPRESS_DIRECTUS_API_URL}/relations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(relation),
    }).then(response => response.json());
}

function setCollectionUserUpdatedFieldRelation(collection) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${directus.auth.token}`
    };

    const relation = {
        collection: collection,
        field: 'user_updated',
        related_collection: 'directus_users',
        schema: {}
    };

    return fetch(`${process.env.EXPRESS_DIRECTUS_API_URL}/relations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(relation),
    }).then(response => response.json());
}

async function addCollectionCompoundUniqueKeyConstraint(collection, ...columns) {
    const postgreClient = await postgrePool.connect()
    /*
        Using Directus/Postgre constraint name pattern
     */
    const constraintName = `${collection}` +
        columns.join('_') +
        '_unique';

    const query = `ALTER TABLE ${collection}
                   ADD CONSTRAINT ${constraintName} UNIQUE(${columns.join(',')});`

    return await postgreClient.query(query)
        .finally(() => postgreClient.release());
}