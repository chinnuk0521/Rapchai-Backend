import pino from 'pino';
import { env } from '@/config/env.js';

const loggerConfig: any = {
  level: env.LOG_LEVEL,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

if (env.LOG_PRETTY_PRINT && env.NODE_ENV === 'development') {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

const logger = pino(loggerConfig);
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;

// Structured logging helpers
export const loggers = {
  info: (message: string, data?: any) => logger.info(data, message),
  error: (message: string, error?: Error | any) => logger.error(error, message),
  warn: (message: string, data?: any) => logger.warn(data, message),
  debug: (message: string, data?: any) => logger.debug(data, message),
  fatal: (message: string, error?: Error | any) => logger.fatal(error, message),
};

// Request logging middleware
export function createRequestLogger() {
  return {
    request: (request: any) => {
      logger.info({
        method: request.method,
        url: request.url,
        headers: request.headers,
        remoteAddress: request.ip,
      }, 'Incoming request');
    },
    response: (request: any, reply: any) => {
      logger.info({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
      }, 'Request completed');
    },
  };
}

// Error logging helper
export function logError(error: Error, context?: any) {
  logger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  }, 'Application error');
}

// Performance logging helper
export function logPerformance(operation: string, duration: number, metadata?: any) {
  logger.info({
    operation,
    duration,
    metadata,
  }, 'Performance metric');
}
