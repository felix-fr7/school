/**
 * Telemetry Controller
 * Handles system health monitoring and performance metrics for Super Admin
 */

const db = require('../config/db');

// In-memory system configuration state (will be replaced with DB persistence in production)
const systemConfig = {
  rateLimiting: true,
  autoBackup: false,
  auditLogs: true,
};

/**
 * Get DB Pool Latency
 * Measures real-time database response time using a lightweight query
 * GET /api/superadmin/db-latency
 */
const getDbLatency = async (req, res, next) => {
  try {
    // Measure latency using performance.now() for high-resolution timing
    const startTime = performance.now();
    
    // Execute a lightweight query to measure actual DB response time
    await db.query('SELECT 1');
    
    const endTime = performance.now();
    const latency = Math.round((endTime - startTime) * 100) / 100; // Round to 2 decimal places
    
    // Determine status based on latency thresholds
    let status = 'Optimal';
    if (latency > 200) {
      status = 'Critical';
    } else if (latency > 100) {
      status = 'Degraded';
    } else if (latency > 50) {
      status = 'Warning';
    }
    
    res.status(200).json({
      success: true,
      data: {
        latency,
        status,
        timestamp: new Date().toISOString(),
        thresholds: {
          optimal: '< 50ms',
          warning: '50-100ms',
          degraded: '100-200ms',
          critical: '> 200ms',
        },
      },
    });
  } catch (error) {
    // If DB query fails, return error status
    res.status(503).json({
      success: false,
      error: {
        message: 'Database connection failed',
        latency: null,
        status: 'Error',
      },
    });
  }
};

/**
 * Get System Configuration
 * Returns current system configuration state
 * GET /api/superadmin/system-config
 */
const getSystemConfig = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        config: { ...systemConfig },
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update System Configuration Toggle
 * Updates a specific system configuration setting
 * POST /api/superadmin/toggle-config
 * Body: { toggleName: string, value: boolean }
 */
const toggleSystemConfig = async (req, res, next) => {
  try {
    const { toggleName, value } = req.body;
    
    // Validate toggle name
    const validToggles = Object.keys(systemConfig);
    if (!validToggles.includes(toggleName)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid toggle name. Valid toggles: ${validToggles.join(', ')}`,
        },
      });
    }
    
    // Validate value is boolean
    if (typeof value !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Value must be a boolean (true/false)',
        },
      });
    }
    
    // Update the configuration
    const previousValue = systemConfig[toggleName];
    systemConfig[toggleName] = value;
    
    console.log(`[System Config] ${toggleName}: ${previousValue} -> ${value}`);
    
    res.status(200).json({
      success: true,
      data: {
        toggleName,
        previousValue,
        newValue: value,
        config: { ...systemConfig },
        timestamp: new Date().toISOString(),
      },
      message: `System configuration updated: ${toggleName} is now ${value ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get System Health Overview
 * Comprehensive system health check
 * GET /api/superadmin/system-health
 */
const getSystemHealth = async (req, res, next) => {
  try {
    // Measure DB latency
    const startTime = performance.now();
    await db.query('SELECT 1');
    const endTime = performance.now();
    const dbLatency = Math.round((endTime - startTime) * 100) / 100;
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;
    
    // Get uptime
    const uptimeSeconds = process.uptime();
    const uptimeFormatted = formatUptime(uptimeSeconds);
    
    // Determine overall health
    let overallHealth = 'healthy';
    if (dbLatency > 200 || memoryMB > 500) {
      overallHealth = 'critical';
    } else if (dbLatency > 100 || memoryMB > 300) {
      overallHealth = 'warning';
    }
    
    res.status(200).json({
      success: true,
      data: {
        overallHealth,
        database: {
          latency: dbLatency,
          status: dbLatency < 50 ? 'optimal' : dbLatency < 100 ? 'good' : dbLatency < 200 ? 'warning' : 'critical',
        },
        server: {
          uptime: uptimeFormatted,
          uptimeSeconds: Math.round(uptimeSeconds),
          memory: {
            used: memoryMB,
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
            external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100,
          },
        },
        config: { ...systemConfig },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Format uptime seconds into human-readable string
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : '< 1m';
}

/**
 * Get current system config (for middleware use)
 */
const getConfig = () => systemConfig;

module.exports = {
  getDbLatency,
  getSystemConfig,
  toggleSystemConfig,
  getSystemHealth,
  getConfig,
};