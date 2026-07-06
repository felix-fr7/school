/**
 * Test Script: Verify Weekly Lessons Endpoint Fix
 * This script tests the GET /api/teacher/weekly-lessons endpoint
 * 
 * Usage: node test-weekly-lessons-fixed.js
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testWeeklyLessonsEndpoint() {
  console.log('🧪 Testing Weekly Lessons Endpoint...\n');
  
  try {
    // Step 1: Login as a teacher
    console.log('📝 Step 1: Logging in as teacher...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      usernameOrEmailOrId: 'felix@gmail.com',
      password: '123456'
    });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response data:', JSON.stringify(loginResponse.data, null, 2));
    
    // Check if login was successful - token is in data.data.token
    const loginSuccess = loginResponse.data.success && loginResponse.data.data && loginResponse.data.data.token;
    
    if (!loginSuccess) {
      console.log('❌ Login failed. Please check teacher credentials.');
      console.log('   You can create a teacher account using the admin panel.');
      return false;
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Teacher logged in successfully\n');
    
    // Step 2: Test GET /api/teacher/weekly-lessons
    console.log('📝 Step 2: Fetching weekly lessons...');
    const lessonsResponse = await axios.get(`${API_BASE_URL}/api/teacher/weekly-lessons`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (lessonsResponse.status === 200 && lessonsResponse.data.success) {
      console.log('✅ Weekly lessons endpoint returned 200 OK\n');
      
      const { classId, className, grid } = lessonsResponse.data.data;
      console.log(`📚 Class: ${className} (ID: ${classId})`);
      console.log(`📅 Grid has ${Object.keys(grid).length} days\n`);
      
      // Display grid structure
      console.log('📊 Weekly Lesson Grid Structure:');
      for (const [dayNum, dayData] of Object.entries(grid)) {
        console.log(`   ${dayNum}: ${dayData.name} - ${dayData.lessons.length} lessons`);
        if (dayData.lessons.length > 0) {
          dayData.lessons.forEach(lesson => {
            console.log(`      - ${lesson.subject}: "${lesson.classworkText || 'No classwork'}" / "${lesson.homeworkText || 'No homework'}"`);
          });
        }
      }
      
      console.log('\n🎉 Test PASSED! The weekly lessons endpoint is working correctly.');
      return true;
    } else {
      console.log('❌ Unexpected response:', lessonsResponse.data);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Test FAILED!');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.log('   No response received. Is the backend server running?');
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

// Run the test
testWeeklyLessonsEndpoint()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });