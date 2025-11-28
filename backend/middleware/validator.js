/**
 * Input Validation and Sanitization Middleware
 * Prevents injection attacks and validates data integrity
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

/**
 * VPA validation rules
 */
const validateVPA = [
  body('vpa')
    .trim()
    .matches(/^[a-zA-Z0-9.\-_]{3,}@[a-zA-Z]{3,}$/)
    .withMessage('Invalid VPA format'),
  handleValidationErrors,
];

/**
 * Payment initiation validation
 */
const validatePayment = [
  body('amount')
    .isFloat({ min: 1, max: 100000 })
    .withMessage('Amount must be between ₹1 and ₹100,000'),
  body('receiverVPA')
    .trim()
    .matches(/^[a-zA-Z0-9.\-_]{3,}@[a-zA-Z]{3,}$/)
    .withMessage('Invalid receiver VPA'),
  body('receiverName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Invalid receiver name'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })

    .withMessage('Transaction note too long'),
  body('transactionId')
    .trim()
    .matches(/^TXN[A-Z0-9]+$/)
    .withMessage('Invalid transaction ID format'),
  body('checksum')
    .trim()
    .isLength({ min: 64, max: 64 })
    .matches(/^[a-f0-9]{64}$/)
    .withMessage('Invalid checksum'),
  handleValidationErrors,
];

/**
 * Transaction ID validation
 */
const validateTransactionId = [
  param('transactionId')
    .trim()
    .matches(/^TXN[A-Z0-9]+$/)
    .withMessage('Invalid transaction ID'),
  handleValidationErrors,
];

/**
 * PIN validation (for authentication)
 */
const validatePIN = [
  body('pin')
    .matches(/^\d{4,6}$/)
    .withMessage('PIN must be 4-6 digits'),
  handleValidationErrors,
];

/**
 * User registration validation
 */
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Invalid name'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email'),
  body('mobileNumber')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid Indian mobile number'),
  body('vpa')
    .trim()
    .matches(/^[a-zA-Z0-9.\-_]{3,}@[a-zA-Z]{3,}$/)
    .withMessage('Invalid VPA'),
  body('upiPin')
    .matches(/^\d{4,6}$/)
    .withMessage('UPI PIN must be 4-6 digits'),
  handleValidationErrors,
];

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remove potential SQL injection patterns
      sanitized[key] = value
        .replace(/[;'"\\]/g, '')
        .trim();
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

module.exports = {
  validateVPA,
  validatePayment,
  validateTransactionId,
  validatePIN,
  validateUserRegistration,
  handleValidationErrors,
  sanitizeObject,
};
