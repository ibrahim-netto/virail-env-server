require('dotenv').config();

const logger = require('./src/logger');
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const expressWinston = require('express-winston');
const Sentry = require('@sentry/node');
const rateLimit = require('express-rate-limit');
const swaggerHeaders = require('./src/swagger/headers.swagger');
const swaggerUi = require('swagger-ui-express');
const swaggerOptions = require('./src/swagger/options.swagger');
const checkDirectus = require('./src/check-directus');
const setStaticToken = require('./src/set-static-token');
const applySchema = require('./src/schema/schema');
const controller = require('./src/controller');
const hooks = require('./src/hooks');
const errorHandler = require('./src/error-handler');
const getIp = require('./src/get-ip');

const { EXPRESS_PORT } = require('./src/constants');

(async () => {
    /*
        Set static token, default schema & load example data
     */
    await checkDirectus();
    await setStaticToken();
    await applySchema();

    const app = express();

    app.use(bodyParser.json());

    app.use(expressWinston.logger({
        winstonInstance: logger,
        expressFormat: true,
        colorize: true,
        meta: true,
        metaField: null,
        dynamicMeta: (req) => {
            const meta = {};

            if (req) {
                meta.ip = getIp(req);
            }

            return meta;
        }
    }));

    if (process.env.SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN
        });
        app.use(Sentry.Handlers.requestHandler());
    }

    if (!!+process.env.EXPRESS_GZIP) {
        /*
            For use on servers without reverse-proxy
         */
        app.use(compression());
    }

    if (!!+process.env.EXPRESS_RATE_LIMIT) {
        const limiter = rateLimit({
            windowMs: process.env.EXPRESS_RATE_LIMIT_WINDOW,
            max: process.env.EXPRESS_RATE_LIMIT_MAX,
            standardHeaders: false,
            legacyHeaders: false
        })
        /*
            Apply the rate limiting middleware to API calls only
         */
        app.get('/api', limiter);
    }

    /*
        Hooks
     */
    app.post('/hooks/new-user', hooks.newUser);

    /*
        API endpoints
     */
    app.get('/api/env', controller.getEnv);

    /*
        Swagger Docs
     */
    app.use('/docs', swaggerHeaders, swaggerUi.serve, swaggerUi.setup(swaggerOptions));

    if (process.env.SENTRY_DSN) {
        app.use(Sentry.Handlers.errorHandler());
    }
    app.use(errorHandler);

    app.listen(EXPRESS_PORT, () => {
        logger.info(`Express app listening on port ${EXPRESS_PORT}`);
    });
})();