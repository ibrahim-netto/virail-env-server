module.exports = {
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer'
            }
        },
        responses: {
            EnvRequest: {
                type: 'string',
                description: 'Env request response.',
                example: `NODE_ENV=production\nNODE_CLUSTER=1\nSTATIC_TOKEN=ownMWWa525DduE0cIPWOLQJ3RwY0Fhk2MGDUUvACEWrCW4ZacAAKWrfkJM6j23pz`
            },
            AuthorizationError: {
                type: 'object',
                description: 'Authorization error response.',
                properties: {
                    status: {
                        type: 'string',
                        description: 'Response status.',
                        example: 'error',
                        enum: ['error'],
                        default: 'error'
                    },
                    message: {
                        type: 'string',
                        description: 'Response message.',
                        example: `You don't have permission to access this.`
                    }
                }
            }
        }
    }
}