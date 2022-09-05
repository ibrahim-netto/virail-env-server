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
const directusLogin = require('./src/directus-login');
const applySchema = require('./src/schema/schema');
const postgreTriggers = require('./src/postgre-triggers');
const { varnishProjectHeaders } = require('./src/varnish-headers');
const controller = require('./src/controller');
const errorHandler = require('./src/error-handler');
const getIp = require('./src/get-ip');

const { EXPRESS_PORT } = require('./src/constants');

(async () => {
    /*
        Set static token, default schema, load example data & triggers
     */
    await checkDirectus();
    await directusLogin();
    await applySchema();
    await postgreTriggers();

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

    if (!!+process.env.EXPRESS_VARNISH_HEADERS) {
        app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
        app.use(varnishProjectHeaders);
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
        API endpoints
     */
    app.get('/api/v1/env', controller.getEnv);
    app.get('/api/v1/config/:service/:config', controller.getConfig);

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