import winston from 'winston';

// Create a custom format that includes timestamp and level
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss MM/DD/YY', // Short date format as requested
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    // Add any additional metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }

    return logMessage;
  })
);

// Create Winston logger instance that outputs to console.log() only
const logger = winston.createLogger({
  level: 'debug', // Set to debug to capture all levels
  format: logFormat,
  transports: [new winston.transports.Console()],
});

export default logger;
