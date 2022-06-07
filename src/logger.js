const { createLogger, format, transports } = require('winston');
const { combine, colorize, splat, timestamp, printf } = format;

const custom = printf(({ level, message, timestamp, ...metadata }) => {
    const ip = (metadata.ip) ? ` ${metadata.ip} ` : '';
    return `${timestamp} \x1b[34m${process.pid}\x1b[0m ${level}:${ip} ${message} `;
});

const logger = createLogger({
    format: combine(
        colorize(),
        splat(),
        timestamp(),
        custom
    ),
    transports: [new transports.Console()]
});

module.exports = logger;