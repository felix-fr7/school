/**
 * SuperAdmin Module
 * Handles all super admin operations including tenant management
 * Modular structure - SuperAdmin module
 * 
 * Exports:
 * - routes: Express router with all SuperAdmin endpoints
 * - controller: Business logic functions
 * - middleware: Role-specific middleware functions
 */

const routes = require('./superadmin.routes');
const controller = require('./superadmin.controller');
const middleware = require('./superadmin.middleware');

module.exports = {
  routes,
  controller,
  middleware
};