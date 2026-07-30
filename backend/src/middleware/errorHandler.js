/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method
  });

  // MySQL error codes
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry. This record already exists.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      success: false,
      message: 'Cannot perform this action. The record is referenced by other data.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired. Please login again.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error.',
      errors: err.details ? err.details.map(d => d.message) : [err.message],
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum file size is 10MB.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error.';

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;