/**
 * Audit Logging Middleware
 * Logs all security-relevant events for compliance and monitoring
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_FILE = path.join(logsDir, 'audit.log');
const SECURITY_LOG_FILE = path.join(logsDir, 'security.log');

/**
 * Log levels
 */
const LogLevel = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SECURITY: 'SECURITY',
};

/**
 * Write log entry to file and stdout (for production log aggregators)
 */
function writeLog(file, entry) {
  const logEntry = JSON.stringify(entry);
  
  // Write to stdout for production log aggregators (CloudWatch, Datadog, etc.)
  console.log(logEntry);
  
  // Also write to file for local development
  fs.appendFile(file, `${logEntry}\n`, (err) => {
    if (err) console.error('Failed to write log file:', err);
  });
}

/**
 * Create log entry
 */
function createLogEntry(level, event, data, req = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data,
  };

  if (req) {
    entry.request = {
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      path: req.path,
      userId: req.user?.userId,
      userAgent: req.get('user-agent'),
    };
  }

  return entry;
}

/**
 * Log authentication events
 */
function logAuth(event, userId, success, req, additionalData = {}) {
  const entry = createLogEntry(
    success ? LogLevel.INFO : LogLevel.SECURITY,
    event,
    {
      userId,
      success,
      ...additionalData,
    },
    req
  );

  writeLog(success ? LOG_FILE : SECURITY_LOG_FILE, entry);
  
  if (!success) {
    console.warn('🔐 Authentication event:', entry);
  }
}

/**
 * Log payment transactions
 */
function logTransaction(event, transactionData, req) {
  const entry = createLogEntry(LogLevel.INFO, event, transactionData, req);
  writeLog(LOG_FILE, entry);
}

/**
 * Log security events
 */
function logSecurity(event, data, req) {
  const entry = createLogEntry(LogLevel.SECURITY, event, data, req);
  writeLog(SECURITY_LOG_FILE, entry);
  console.warn('⚠️ Security event:', entry);
}

/**
 * Log errors
 */
function logError(error, req) {
  const entry = createLogEntry(
    LogLevel.ERROR,
    'ERROR',
    {
      message: error.message,
      stack: error.stack,
    },
    req
  );
  writeLog(LOG_FILE, entry);
}

/**
 * Middleware to log all requests
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log request
  res.on('finish', () => {
    const duration = Date.now() - start;
    const entry = createLogEntry(
      LogLevel.INFO,
      'HTTP_REQUEST',
      {
        duration,
        statusCode: res.statusCode,
      },
      req
    );

    writeLog(LOG_FILE, entry);

    // Log suspicious activity
    if (res.statusCode === 401 || res.statusCode === 403) {
      logSecurity('UNAUTHORIZED_ACCESS', { statusCode: res.statusCode }, req);
    }
  });

  next();
}

/**
 * Middleware to log payment attempts
 */
function paymentLogger(req, res, next) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    logTransaction(
      'PAYMENT_ATTEMPT',
      {
        amount: req.body?.amount,
        receiverVPA: req.body?.receiverVPA,
        transactionId: req.body?.transactionId,
        success: data.success || false,
      },
      req
    );
    
    return originalJson(data);
  };
  
  next();
}

module.exports = {
  logAuth,
  logTransaction,
  logSecurity,
  logError,
  requestLogger,
  paymentLogger,
  LogLevel,
};
