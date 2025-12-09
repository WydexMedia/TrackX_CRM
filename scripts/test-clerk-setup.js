#!/usr/bin/env node

/**
 * Test script to verify Clerk setup and authentication
 * 
 * Run: node scripts/test-clerk-setup.js
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY 
  ? 'https://your-domain.com' // Replace with your domain
  : 'http://localhost:3000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironmentVariables() {
  log('\n=== Checking Environment Variables ===', 'blue');
  
  const required = {
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    'CLERK_SECRET_KEY': process.env.CLERK_SECRET_KEY,
  };

  let allPresent = true;
  for (const [key, value] of Object.entries(required)) {
    if (value) {
      log(`✓ ${key} is set`, 'green');
    } else {
      log(`✗ ${key} is missing`, 'red');
      allPresent = false;
    }
  }

  return allPresent;
}

function testPublicEndpoint() {
  return new Promise((resolve) => {
    log('\n=== Testing Public Endpoint ===', 'blue');
    
    const url = new URL(`${BASE_URL}/api/tenants`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      log(`Status: ${res.statusCode}`, res.statusCode === 200 ? 'green' : 'yellow');
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          log('✓ Public endpoint is accessible', 'green');
        } else {
          log('⚠ Public endpoint returned non-200 status', 'yellow');
        }
        resolve(res.statusCode);
      });
    });

    req.on('error', (error) => {
      log(`✗ Error: ${error.message}`, 'red');
      log('  Make sure your dev server is running (npm run dev)', 'yellow');
      resolve(null);
    });

    req.end();
  });
}

function testProtectedEndpoint() {
  return new Promise((resolve) => {
    log('\n=== Testing Protected Endpoint (Should Require Auth) ===', 'blue');
    
    const url = new URL(`${BASE_URL}/api/users`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      log(`Status: ${res.statusCode}`, res.statusCode === 401 ? 'green' : 'yellow');
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 401) {
          log('✓ Protected endpoint correctly requires authentication', 'green');
          log('  (401 Unauthorized is expected without Clerk session)', 'yellow');
        } else if (res.statusCode === 200) {
          log('⚠ Protected endpoint returned 200 (might have valid session)', 'yellow');
        } else {
          log(`⚠ Unexpected status code: ${res.statusCode}`, 'yellow');
        }
        resolve(res.statusCode);
      });
    });

    req.on('error', (error) => {
      log(`✗ Error: ${error.message}`, 'red');
      resolve(null);
    });

    req.end();
  });
}

function testLoginPage() {
  return new Promise((resolve) => {
    log('\n=== Testing Login Page ===', 'blue');
    
    const url = new URL(`${BASE_URL}/login`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      log(`Status: ${res.statusCode}`, res.statusCode === 200 ? 'green' : 'yellow');
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          if (data.includes('clerk') || data.includes('Clerk')) {
            log('✓ Login page is accessible and contains Clerk', 'green');
          } else {
            log('⚠ Login page accessible but may not have Clerk', 'yellow');
          }
        } else {
          log(`✗ Login page returned ${res.statusCode}`, 'red');
        }
        resolve(res.statusCode);
      });
    });

    req.on('error', (error) => {
      log(`✗ Error: ${error.message}`, 'red');
      resolve(null);
    });

    req.end();
  });
}

async function main() {
  log('========================================', 'blue');
  log('   Clerk Setup Test Script', 'blue');
  log('========================================', 'blue');

  // Load environment variables
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    log('\n⚠ Could not load .env.local file', 'yellow');
  }

  // Check environment variables
  const envOk = checkEnvironmentVariables();
  
  if (!envOk) {
    log('\n✗ Environment variables are missing!', 'red');
    log('  Please add Clerk keys to .env.local:', 'yellow');
    log('  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...', 'yellow');
    log('  CLERK_SECRET_KEY=sk_test_...', 'yellow');
    log('\n  Get keys from: https://dashboard.clerk.com/last-active?path=api-keys', 'yellow');
    process.exit(1);
  }

  log('\n✓ All environment variables are set', 'green');

  // Test endpoints
  await testPublicEndpoint();
  await testProtectedEndpoint();
  await testLoginPage();

  log('\n========================================', 'blue');
  log('   Browser Testing Instructions', 'blue');
  log('========================================', 'blue');
  log('\n1. Start your dev server:', 'yellow');
  log('   npm run dev', 'yellow');
  log('\n2. Open in browser:', 'yellow');
  log(`   ${BASE_URL}/login`, 'yellow');
  log('\n3. Test sign up:', 'yellow');
  log('   - Click "Sign Up"', 'yellow');
  log('   - Create a test account', 'yellow');
  log('   - Verify redirect works', 'yellow');
  log('\n4. Test sign in:', 'yellow');
  log('   - Log out', 'yellow');
  log('   - Sign in with your test account', 'yellow');
  log('   - Verify you can access protected pages', 'yellow');
  log('\n5. Check browser console for any errors', 'yellow');
  log('\n========================================\n', 'blue');
}

main().catch(console.error);


