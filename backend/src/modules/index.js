/**
 * Modules Index
 * Central export point for all modules
 * Modular structure for School Management System
 * 
 * Each module is self-contained with:
 * - routes: Express router with all endpoints
 * - controller: Business logic functions
 * - middleware: Role-specific middleware functions
 */

const superadmin = require('./superadmin');
const admin = require('./admin');
const classModule = require('./class');
const student = require('./student');

module.exports = {
  superadmin,
  admin,
  class: classModule,
  student
};