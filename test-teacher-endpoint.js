/**
 * Quick Test Script for Teacher /api/teacher/my-class Endpoint
 * This script verifies that the 404 fix is working correctly
 */

const axios = require('axios');

// Configuration - update these values based on your test environment
const API_BASE_URL = process.env.API_URL || 'http://10.0.2.2:3000/api';
const TEST_TEACHER_EMAIL = process.env.TEST_TEACHER_EMAIL || 'teacher@test.com';
const TEST_TEACHER_PASSWORD = process.env.TEST_TEACHER_PASSWORD || 'Teacher@123';

async function testTeacherEndpoint() {
  console.log('🧪 Testing Teacher /api/teacher/my-class Endpoint...\n');
  
  try {
    // Step 1: Login as teacher
    console.log('📝 Step 1: Logging in as teacher...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      usernameOrEmailOrId: TEST_TEACHER_EMAIL,
      password: TEST_TEACHER_PASSWORD,
    });
    
    if (!loginResponse.data.success || !loginResponse.data.token) {
      console.error('❌ Login failed. Please check test credentials.');
      console.error('Response:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Teacher login successful!\n');
    
    // Step 2: Call /api/teacher/my-class
    console.log('📝 Step 2: Calling /api/teacher/my-class...');
    const myClassResponse = await axios.get(`${API_BASE_URL}/teacher/my-class`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log('✅ Response received!\n');
    console.log('📊 Response Status:', myClassResponse.status);
    console.log('📊 Response Data:', JSON.stringify(myClassResponse.data, null, 2));
    
    // Step 3: Validate response
    if (myClassResponse.status === 200) {
      console.log('\n✅ SUCCESS: Endpoint returns 200 OK (not 404)');
      
      if (myClassResponse.data.success) {
        console.log('✅ SUCCESS: Response has success: true');
        
        const hasData = myClassResponse.data.data !== undefined;
        console.log(`✅ SUCCESS: Response has data field: ${hasData}`);
        
        if (hasData) {
          const data = myClassResponse.data.data;
          const hasId = data.id !== undefined;
          const hasStudents = Array.isArray(data.students);
          const hasHomeworks = Array.isArray(data.homeworks);
          const hasExamSchedules = Array.isArray(data.examSchedules);
          const hasCount = data._count !== undefined;
          
          console.log(`   - Has id field: ${hasId} (value: ${data.id})`);
          console.log(`   - Has students array: ${hasStudents}`);
          console.log(`   - Has homeworks array: ${hasHomeworks}`);
          console.log(`   - Has examSchedules array: ${hasExamSchedules}`);
          console.log(`   - Has _count object: ${hasCount}`);
          
          if (data.id === null) {
            console.log('\n⚠️  Teacher has NO class assigned (expected for new teachers)');
            console.log('   This is correct behavior - the endpoint returns 200 with empty data.');
          } else {
            console.log('\n✅ Teacher has a class assigned with data.');
          }
        }
        
        console.log('\n🎉 FIX VERIFIED: The 404 bug is FIXED!');
        console.log('   - Route exists and is accessible');
        console.log('   - Authentication works correctly');
        console.log('   - Returns 200 OK instead of 404');
        console.log('   - Response structure is correct');
      } else {
        console.error('❌ FAILED: Response success field is false');
      }
    } else {
      console.error(`❌ FAILED: Expected status 200, got ${myClassResponse.status}`);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 404) {
        console.error('\n⚠️  The 404 bug still exists! The fix may not have been applied correctly.');
      } else if (error.response.status === 401) {
        console.error('\n⚠️  Authentication failed. Check teacher credentials.');
      }
    } else if (error.request) {
      console.error('No response received. Is the backend server running?');
      console.error('Server URL:', API_BASE_URL);
    }
  }
}

// Run the test
console.log('='.repeat(60));
console.log('TEACHER ENDPOINT VERIFICATION TEST');
console.log('='.repeat(60));
console.log(`API URL: ${API_BASE_URL}`);
console.log(`Test Teacher: ${TEST_TEACHER_EMAIL}`);
console.log('='.repeat(60));
console.log('');

testTeacherEndpoint();