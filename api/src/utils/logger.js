"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggers = void 0;
exports.createRequestLogger = createRequestLogger;
exports.logError = logError;
exports.logPerformance = logPerformance;
const pino_1 = __importDefault(require("pino"));
const env_js_1 = require("../config/env.js");
const loggerConfig = {
    level: env_js_1.env.LOG_LEVEL,
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
};
if (env_js_1.env.LOG_PRETTY_PRINT && env_js_1.env.NODE_ENV === "development") {
    loggerConfig.transport = {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    };
}
const logger = (0, pino_1.default)(loggerConfig);
exports.default = logger;
// Structured logging helpers
exports.loggers = {
    info: (message, data) => logger.info(data, message),
    error: (message, error) => logger.error(error, message),
    warn: (message, data) => logger.warn(data, message),
    debug: (message, data) => logger.debug(data, message),
    fatal: (message, error) => logger.fatal(error, message),
};
// Request logging middleware
function createRequestLogger() {
    return {
        request: (request) => {
            logger.info({
                method: request.method,
                url: request.url,
                headers: request.headers,
                remoteAddress: request.ip,
            }, "Incoming request");
        },
        response: (request, reply) => {
            logger.info({
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
                responseTime: reply.getResponseTime(),
            }, "Request completed");
        },
    };
}
// Error logging helper
function logError(error, context) {
    logger.error({
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
        },
        context,
    }, "Application error");
}
// Performance logging helper
function logPerformance(operation, duration, metadata) {
    logger.info({
        operation,
        duration,
        metadata,
    }, "Performance metric");
}
