/**
 * Test Script for Weekly Lessons API
 * Tests all CRUD operations for the weekly lesson management system
 * 
 * Prerequisites:
 * 1. Server must be running on http://localhost:3000
 * 2. You need a valid JWT token for a TEACHER user
 * 3. You need a valid JWT token for a STUDENT user
 * 
 * Usage: node test-weekly-lessons.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Test credentials (replace with actual credentials from your system)
const TEACHER_CREDENTIALS = {
  email: 'teacher@test.com',
  password: 'Teacher@123',
};

const STUDENT_CREDENTIALS = {
  email: 'student@test.com',
  password: 'Student@123',
};

// Store tokens
let teacherToken = '';
let studentToken = '';

// Helper function to make authenticated requests
const teacherRequest = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

teacherRequest.interceptors.request.use((config) => {
  if (teacherToken) {
    config.headers.Authorization = `Bearer ${teacherToken}`;
  }
  return config;
});

const studentRequest = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

studentRequest.interceptors.request.use((config) => {
  if (studentToken) {
    config.headers.Authorization = `Bearer ${studentToken}`;
  }
  return config;
});

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function test(name, fn) {
  return async () => {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASSED' });
      console.log(`✅ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
    }
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================
// TEST SUITE
// ============================================

const runTests = async () => {
  console.log('\n🧪 Weekly Lessons API Test Suite\n');
  console.log(`📍 API Base URL: ${API_BASE_URL}\n`);

  // 1. Login as Teacher
  await test('Login as Teacher', async () => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEACHER_CREDENTIALS);
    assert(response.status === 200, 'Login should return 200');
    assert(response.data.success === true, 'Login should be successful');
    teacherToken = response.data.data.token;
    assert(teacherToken, 'Token should be returned');
  })();

  // 2. Login as Student
  await test('Login as Student', async () => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, STUDENT_CREDENTIALS);
    assert(response.status === 200, 'Login should return 200');
    assert(response.data.success === true, 'Login should be successful');
    studentToken = response.data.data.token;
    assert(studentToken, 'Token should be returned');
  })();

  // 3. Get Weekly Lessons (Teacher)
  await test('GET /api/teacher/weekly-lessons - Teacher can view weekly lessons', async () => {
    const response = await teacherRequest.get('/teacher/weekly-lessons');
    assert(response.status === 200, 'Should return 200');
    assert(response.data.success === true, 'Should be successful');
    assert(response.data.data.grid, 'Should return grid');
    assert(response.data.data.classId, 'Should return classId');
    // Check grid structure
    for (let i = 1; i <= 6; i++) {
      assert(response.data.data.grid[i], `Grid should have weekday ${i}`);
      assert(response.data.data.grid[i].name, `Weekday ${i} should have name`);
      assert(Array.isArray(response.data.data.grid[i].lessons), `Weekday ${i} should have lessons array`);
    }
  })();

  // 4. Create/Update Weekly Lesson (Teacher)
  let lessonId = '';
  await test('POST /api/teacher/weekly-lessons - Teacher can create lesson', async () => {
    const response = await teacherRequest.post('/teacher/weekly-lessons', {
      weekday: 1, // Monday
      subject: 'Mathematics',
      classworkText: 'Complete exercises 1-10 from chapter 5',
      homeworkText: 'Complete exercises 11-20 from chapter 5',
    });
    assert(response.status === 200, 'Should return 200');
    assert(response.data.success === true, 'Should be successful');
    assert(response.data.data.id, 'Should return lesson ID');
    assert(response.data.data.weekday === 1, 'Weekday should be 1');
    assert(response.data.data.subject === 'Mathematics', 'Subject should be Mathematics');
    lessonId = response.data.data.id;
  })();

  // 5. Update existing lesson (UPSERT test)
  await test('POST /api/teacher/weekly-lessons - Update existing lesson (UPSERT)', async () => {
    const response = await teacherRequest.post('/teacher/weekly-lessons', {
      weekday: 1, // Monday
      subject: 'Mathematics',
      classworkText: 'Updated: Complete exercises 1-15 from chapter 5',
      homeworkText: 'Updated: Complete exercises 16-25 from chapter 5',
    });
    assert(response.status === 200, 'Should return 200');
    assert(response.data.success === true, 'Should be successful');
    assert(response.data.data.id === lessonId, 'Should return same lesson ID (update, not create)');
    assert(response.data.data.classworkText.includes('Updated'), 'Classwork should be updated');
  })();

  // 6. Create another lesson for different day
  let lessonId2 = '';
  await test('POST /api/teacher/weekly-lessons - Create lesson for Tuesday', async () => {
    const response = await teacherRequest.post('/teacher/weekly-lessons', {
      weekday: 2, // Tuesday
      subject: 'Science',
      classworkText: 'Lab experiment: Photosynthesis',
      homeworkText: 'Write a report on the experiment',
    });
    assert(response.status === 200, 'Should return 200');
    assert(response.data.success === true, 'Should be successful');
    assert(response.data.data.weekday === 2, 'Weekday should be 2');
    lessonId2 = response.data.data.id;
  })();

  // 7. Validation: Invalid weekday
  await test('POST /api/teacher/weekly-lessons - Reject invalid weekday', async () => {
    try {
      await teacherRequest.post('/teacher/weekly-lessons', {
        weekday: 7, // Invalid
        subject: 'Test',
      });
      throw new Error('Should have returned 400');
    } catch (error) {
      assert(error.response && error.response.status === 400, 'Should return 400 for invalid weekday');
    }
  })();

  // 8. Validation: Missing subject
  await test('POST /api/teacher/weekly-lessons - Reject missing subject', async () => {
    try {
      await teacherRequest.post('/teacher/weekly-lessons', {
        weekday: 1,
        // Missing subject
      });
      throw new Error('Should have returned 400');
    } catch (error) {
      assert(error.response && error.response.status === 400, 'Should return 400 for missing subject');
    }
  })();

  // 9. Get Weekly Lessons (Student) - Read-only access
  await test('GET /api/student/weekly-lessons - Student can view lessons', async () => {
    const response = await studentRequest.get('/student/weekly-lessons');
    assert(response.status === 200, 'Should return 200');
    assert(response.data.success === true, 'Should be successful');
    assert(response.data.data.grid, 'Should return grid');
    assert(response.data.data.classId, 'Should return classId');
    // Verify lessons exist
    const hasLessons = Object.values(response.data.data.grid).some(day => day.lessons.length > 0);
    assert(hasLessons, 'Should have at least one lesson');
  })();

  // 10. Get Lessons by Weekday (Student)
  await test('GET /api/student/weekly-lessons/1 - Student can view Monday lessons', async () => {
    const response = await studentRequest.get('/student/weekly-lessons/1');
    assert(response.status === 200, 'Should return 200');
    assert(response.data.success === true, 'Should be successful');
    assert(response.data.data.weekday === 'Monday', 'Should return Monday');
    assert(response.data.data.weekdayNumber === 1, 'Weekday number should be 1');
    assert(Array.isArray(response.data.data.lessons), 'Should return lessons array');
  })();

  // 11. Delete lesson (Teacher)
  await test('DELETE /api/teacher/weekly-lessons/:id - Teacher can delete lesson', async () => {
    const response = await teacherRequest.delete(`/teacher/weekly-lessons/${lessonId2}`);
    assert(response.status === 200, 'Should return 200');
    assert(response.data.success === true, 'Should be successful');
    
    // Verify deletion
    const getResponse = await teacherRequest.get('/teacher/weekly-lessons');
    const tuesdayLessons = getResponse.data.data.grid[2].lessons;
    const deletedLessonExists = tuesdayLessons.some(l => l.id === lessonId2);
    assert(!deletedLessonExists, 'Lesson should be deleted');
  })();

  // 12. Student cannot access teacher endpoints
  await test('POST /api/teacher/weekly-lessons - Student cannot create lesson', async () => {
    try {
      await studentRequest.post('/teacher/weekly-lessons', {
        weekday: 3,
        subject: 'Test',
      });
      throw new Error('Should have returned 403');
    } catch (error) {
      assert(error.response && error.response.status === 403, 'Should return 403 for student');
    }
  })();

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${results.passed} passed, ${results.failed} failed`);
  console.log('='.repeat(50));

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => {
        console.log(`  - ${t.name}: ${t.error}`);
      });
  }

  console.log('\n');
  process.exit(results.failed > 0 ? 1 : 0);
};

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});