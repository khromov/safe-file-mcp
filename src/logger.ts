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

// Create logger with default HTTP mode configuration
const logger = winston.createLogger({
  level: 'debug', // Set to debug to capture all levels
  format: logFormat,
  transports: [new winston.transports.Console({})],
});

/**
 * Configure the logger for the specified transport mode
 */
export function configureLogger(transportMode: string): void {
  const isStdioMode = transportMode === 'stdio';

  // Clear existing transports
  logger.clear();

  // Add appropriate transport based on mode
  const consoleTransport = isStdioMode
    ? new winston.transports.Console({
        // In stdio mode, ALL logs must go to stderr to avoid polluting stdout
        stderrLevels: ['error', 'warn', 'info', 'debug', 'verbose', 'silly'],
      })
    : new winston.transports.Console({});

  logger.add(consoleTransport);

  // Log the mode configuration
  if (isStdioMode) {
    logger.debug('Logger configured for stdio mode - all output to stderr');
  } else {
    logger.debug('Logger configured for HTTP mode - normal console output');
  }
}

export default logger;
