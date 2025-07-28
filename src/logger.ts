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

// Determine transport mode
const isStdioMode = process.env.COCO_MCP_TRANSPORT === 'stdio' || process.argv.includes('--stdio');

const consoleTransport = isStdioMode
  ? new winston.transports.Console({
      // In stdio mode, ALL logs must go to stderr to avoid polluting stdout
      stderrLevels: ['error', 'warn', 'info', 'debug', 'verbose', 'silly'],
    })
  : new winston.transports.Console({});

const logger = winston.createLogger({
  level: 'debug', // Set to debug to capture all levels
  format: logFormat,
  transports: [consoleTransport],
});

// Log the mode on startup (this will go to the appropriate stream)
if (isStdioMode) {
  logger.debug('Logger configured for stdio mode - all output to stderr');
} else {
  logger.debug('Logger configured for HTTP mode - normal console output');
}

export default logger;
