module.exports = {
    paths: {
        '/api/v1/env': {
            get: {
                description: 'Request environment variables.',
                operationId: 'requestEnv',
                security: [{
                    BearerAuth: []
                }],
                responses: {
                    '200': {
                        description: 'Environment variables request result.',
                        content: {
                            'text/plain': {
                                schema: {
                                    $ref: '#/components/responses/EnvRequest'
                                }
                            }
                        }
                    },
                    '403': {
                        description: 'Authorization error.',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/responses/AuthorizationError'
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}