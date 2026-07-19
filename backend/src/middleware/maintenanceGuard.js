/**
 * Maintenance Guard Middleware
 * Blocks non-superadmin requests when maintenance mode is active
 * Returns 503 Service Unavailable with a clean corporate JSON message
 */

const { getConfig } = require('../controllers/telemetryController');

/**
 * Maintenance Guard Middleware
 * Checks if maintenance mode is active and blocks non-superadmin requests
 * Super admins can still access the system during maintenance
 */
const maintenanceGuard = async (req, res, next) => {
  try {
    const config = getConfig();
    
    // If maintenance mode is not active, continue
    if (!config.maintenanceMode) {
      return next();
    }
    
    // Check if this is a super admin (allow access during maintenance)
    if (req.user && req.user.role === 'SUPER_ADMIN') {
      return next();
    }
    
    // Check if this is a health check or telemetry endpoint (allow during maintenance)
    const allowedPaths = [
      '/health',
      '/api/superadmin/db-latency',
      '/api/superadmin/system-health',
      '/api/superadmin/system-config',
    ];
    
    if (allowedPaths.includes(req.path)) {
      return next();
    }
    
    // Block the request with 503 Service Unavailable
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'System is currently under maintenance',
        details: 'We are performing scheduled maintenance to improve your experience. Please try again later.',
        retryAfter: 3600, // Suggest retry after 1 hour (in seconds)
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // If there's an error checking maintenance mode, allow the request through
    // but log the error
    console.error('[MaintenanceGuard] Error checking maintenance mode:', error.message);
    return next();
  }
};

/**
 * Rate Limiting Middleware (Basic Implementation)
 * Simple in-memory rate limiter for API protection
 * For production, consider using express-rate-limit with Redis
 */
const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    max = 100, // 100 requests per window default
    message = 'Too many requests, please try again later.',
  } = options;
  
  // In-memory store for rate limiting
  const requests = new Map();
  
  // Clean up old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requests.entries()) {
      if (now - value.windowStart > windowMs) {
        requests.delete(key);
      }
    }
  }, windowMs);
  
  return (req, res, next) => {
    try {
      const config = getConfig();
      
      // If rate limiting is disabled, skip
      if (!config.rateLimiting) {
        return next();
      }
      
      // Get client identifier (IP address)
      const clientId = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      
      // Get or create request record
      let record = requests.get(clientId);
      if (!record || now - record.windowStart > windowMs) {
        record = {
          windowStart: now,
          count: 0,
        };
        requests.set(clientId, record);
      }
      
      // Increment counter
      record.count++;
      
      // Set rate limit headers
      res.set('X-RateLimit-Limit', max.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, max - record.count).toString());
      res.set('X-RateLimit-Reset', Math.ceil((record.windowStart + windowMs) / 1000).toString());
      
      // Check if limit exceeded
      if (record.count > max) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
            retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000),
          },
        });
      }
      
      next();
    } catch (error) {
      // If there's an error, allow the request through
      console.error('[RateLimiter] Error:', error.message);
      return next();
    }
  };
};

/**
 * Check if maintenance mode is active (utility function)
 */
const isMaintenanceMode = () => {
  const config = getConfig();
  return config.maintenanceMode;
};

module.exports = {
  maintenanceGuard,
  rateLimiter,
  isMaintenanceMode,
};