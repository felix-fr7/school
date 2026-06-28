/**
 * Global Error Handler Middleware
 * Handles all errors and returns consistent error responses
 */

const errorHandler = (err, req, res, next) => {
  // Log error for debugging (don't log in production for sensitive data)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  } else {
    console.error('Error:', err.message);
  }

  // Default error values
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Prisma validation error
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'A record with this value already exists';
    if (err.meta && err.meta.target) {
      message = `${err.meta.target[0]} already exists`;
    }
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Express validator errors
  if (err.array) {
    statusCode = 400;
    message = 'Validation error';
    errors = err.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: err.code,
      errors,
    },
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;