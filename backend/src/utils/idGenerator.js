/**
 * ID Generator Utility
 * Generates Class & Student IDs based on School name first 3 letters (no dash)
 * - Class: <SCH3><NUM>  e.g. School "Green Valley" -> GRE001, GRE002
 * - Student: ST<SCH3><NUM> e.g. School "Green Valley" -> STGRE0001, STGRE0002
 * Each school (admin) gets different prefix, so IDs never clash across schools.
 * Old IDs (CLS-xxx / STU-xxxx) still remain valid - only new IDs use new format.
 */

const getAlphaPrefix = (name, len = 3) => {
  if (!name || typeof name !== 'string') return null;
  // Keep only A-Z letters, uppercase
  const cleaned = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (!cleaned) return null;
  let prefix = cleaned.slice(0, len);
  // If name shorter than 3 letters, pad with X (e.g. "AB" -> "ABX")
  while (prefix.length < len) prefix += 'X';
  return prefix;
};

/**
 * Find school/tenant name by id.
 * Tries School collection first (schoolName), then Tenant collection (name/code).
 * Returns { prefix, name } or { prefix: null }
 */
const getSchoolPrefixById = async (id) => {
  if (!id) return { prefix: null, name: null };
  try {
    const mongoose = require('mongoose');
    // Avoid model lookup errors if models not registered yet
    let School, Tenant;
    try { School = mongoose.model('School'); } catch (e) { /* ignore */ }
    try { Tenant = mongoose.model('Tenant'); } catch (e) { /* ignore */ }

    if (School) {
      const school = await School.findById(id).select('schoolName schoolCode').lean();
      if (school) {
        const name = school.schoolName || school.schoolCode || '';
        const prefix = getAlphaPrefix(name, 3);
        if (prefix) return { prefix, name };
      }
    }
    if (Tenant) {
      const tenant = await Tenant.findById(id).select('name code').lean();
      if (tenant) {
        const name = tenant.name || tenant.code || '';
        const prefix = getAlphaPrefix(name, 3);
        if (prefix) return { prefix, name };
      }
    }
  } catch (e) {
    // ignore lookup errors, caller will fallback
  }
  return { prefix: null, name: null };
};

/**
 * Generate unique Class code: <PREFIX><001...>
 * e.g. GRE001
 */
const generateUniqueClassCode = async (ClassModel, tenantId, prefix) => {
  const usePrefix = prefix || 'CLS';
  const useDash = usePrefix === 'CLS'; // old format CLS-001 keeps dash for backward compat
  let attempt = 1;
  while (attempt < 100000) {
    const proposed = useDash
      ? `CLS-${String(attempt).padStart(3, '0')}`
      : `${usePrefix}${String(attempt).padStart(3, '0')}`;
    const existing = await ClassModel.findOne({ classCode: proposed }).lean();
    if (!existing) return proposed;
    attempt++;
  }
  throw new Error('Could not generate unique class code');
};

/**
 * Generate unique Student id: ST<PREFIX><0001...>
 * e.g. STGRE0001
 */
const generateUniqueStudentId = async (UserModel, schoolId, prefix) => {
  const usePrefix = prefix ? `ST${prefix}` : 'STU';
  const useDash = !prefix; // old format STU-0001 keeps dash for backward compat
  // Start from per-school count to keep numbers small, then loop for uniqueness
  let startAt = 1;
  try {
    if (schoolId) {
      const count = await UserModel.countDocuments({ schoolId, role: 'Student' });
      startAt = count + 1;
    } else {
      const count = await UserModel.countDocuments({ role: 'Student' });
      startAt = count + 1;
    }
  } catch (e) { startAt = 1; }

  let attempt = startAt;
  // Safety: try up to +100000 from start
  for (let i = 0; i < 100000; i++, attempt++) {
    const num = attempt < 1 ? 1 : attempt;
    const proposed = useDash
      ? `STU-${String(num).padStart(4, '0')}`
      : `${usePrefix}${String(num).padStart(4, '0')}`;
    const existing = await UserModel.findOne({ studentId: proposed }).lean();
    if (!existing) return proposed;
    // if collision (deleted records etc.), continue to next number
  }
  throw new Error('Could not generate unique student id');
};

module.exports = {
  getAlphaPrefix,
  getSchoolPrefixById,
  generateUniqueClassCode,
  generateUniqueStudentId,
};
