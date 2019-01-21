'use strict';
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const logDir = 'log';

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: `${logDir}/%DATE%-chatbot.log`,
  datePattern: 'YYYY-MM-DD'
});

const dailyRotateFileTransportExceptions = new transports.DailyRotateFile({
    filename: `${logDir}/%DATE%-exceptions.log`,
    datePattern: 'YYYY-MM-DD'
  });

const logger = caller => {
  return  createLogger({
  exitOnError: false,
    // change level if in dev environment versus production
  level: env === 'development' ? 'debug' : 'info',
  format: format.combine(
    format.label({ label: path.basename(caller) }),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(info => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`)
  ),
  transports: [
    new transports.Console({
      level: 'debug',
      format: format.combine(
        format.colorize(),
        format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    }),
    dailyRotateFileTransport
  ],
  exceptionHandlers: [
    dailyRotateFileTransportExceptions
  ]
});
};

module.exports = logger;