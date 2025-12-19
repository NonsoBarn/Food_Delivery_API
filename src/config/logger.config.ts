import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig: WinstonModuleOptions = {
  transports: [
    // Console logging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),

        winston.format.printf((info: winston.Logform.TransformableInfo) => {
          const { timestamp, level, message, context, ...meta } = info;

          const timestampStr =
            typeof timestamp === 'string' ? timestamp : String(timestamp);

          const levelStr = typeof level === 'string' ? level : String(level);

          const contextStr =
            typeof context === 'string' ? context : 'Application';

          const messageStr =
            typeof message === 'string' ? message : JSON.stringify(message);

          const metaStr = Object.keys(meta).length
            ? JSON.stringify(meta, null, 2)
            : '';

          return `${timestampStr} [${contextStr}] ${levelStr}: ${messageStr} ${metaStr}`.trim();
        }),
      ),
    }),

    // File logging - errors only
    new winston.transports.File({
      filename: '/app/logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),

    // File logging - all logs
    new winston.transports.File({
      filename: '/app/logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
};
