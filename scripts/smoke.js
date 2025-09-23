#!/usr/bin/env node

// Smoke test script for Emergency Assistance System
// Tests basic endpoints to ensure the system is working

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:3001';
const TIMEOUT = 10000; // 10 seconds

// Test endpoints
const ENDPOINTS = [
  { path: '/api/ping', method: 'GET', expectedStatus: 200 },
  { path: '/api/health', method: 'GET', expectedStatus: 200 },
  { path: '/api/auth/handshake', method: 'GET', expectedStatus: 200 },
  {
    path: '/api/auth/login',
    method: 'POST',
    expectedStatus: 200,
    body: { username: 'test', password: 'test' },
  },
  { path: '/api/auth/me', method: 'GET', expectedStatus: 200 },
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Emergency-Assistance-Smoke-Test/1.0',
        ...options.headers,
      },
      timeout: TIMEOUT,
    };

    const req = client.request(requestOptions, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            raw: data,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            raw: data,
            parseError: error.message,
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  const startTime = Date.now();

  try {
    console.log(
      `\n${colorize('Testing:', 'blue')} ${endpoint.method} ${endpoint.path}`
    );

    const response = await makeRequest(url, {
      method: endpoint.method,
      body: endpoint.body,
    });

    const duration = Date.now() - startTime;
    const isSuccess = response.status === endpoint.expectedStatus;

    if (isSuccess) {
      console.log(
        `${colorize('✅ PASS', 'green')} ${response.status} (${duration}ms)`
      );
      console.log(
        `   Response: ${JSON.stringify(response.data).substring(0, 100)}...`
      );
    } else {
      console.log(
        `${colorize('❌ FAIL', 'red')} Expected ${endpoint.expectedStatus}, got ${response.status} (${duration}ms)`
      );
      console.log(
        `   Response: ${JSON.stringify(response.data).substring(0, 200)}...`
      );
    }

    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      success: isSuccess,
      status: response.status,
      expectedStatus: endpoint.expectedStatus,
      duration,
      data: response.data,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(
      `${colorize('❌ ERROR', 'red')} ${error.message} (${duration}ms)`
    );

    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      success: false,
      error: error.message,
      duration,
    };
  }
}

async function runSmokeTest() {
  console.log(`${colorize('🚀 Emergency Assistance Smoke Test', 'cyan')}`);
  console.log(`${colorize('Base URL:', 'yellow')} ${BASE_URL}`);
  console.log(`${colorize('Timeout:', 'yellow')} ${TIMEOUT}ms`);
  console.log(`${colorize('Endpoints:', 'yellow')} ${ENDPOINTS.length}`);

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);

    if (result.success) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  console.log(`\n${colorize('📊 Test Summary', 'magenta')}`);
  console.log(`${colorize('Total:', 'yellow')} ${results.length}`);
  console.log(`${colorize('Passed:', 'green')} ${passed}`);
  console.log(`${colorize('Failed:', 'red')} ${failed}`);

  if (failed === 0) {
    console.log(`\n${colorize('🎉 All tests passed!', 'green')}`);
    process.exit(0);
  } else {
    console.log(`\n${colorize('❌ Some tests failed', 'red')}`);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Emergency Assistance Smoke Test

Usage: node scripts/smoke.js [options]

Options:
  --help, -h     Show this help message
  --url <url>    Set the base URL for testing (default: http://localhost:3001)
  --timeout <ms> Set the timeout for requests (default: 10000)

Environment Variables:
  SMOKE_TEST_URL Base URL for testing

Examples:
  node scripts/smoke.js
  node scripts/smoke.js --url https://your-app.azurewebsites.net
  SMOKE_TEST_URL=https://your-app.azurewebsites.net node scripts/smoke.js
`);
  process.exit(0);
}

// Parse command line arguments
const urlIndex = process.argv.indexOf('--url');
if (urlIndex !== -1 && process.argv[urlIndex + 1]) {
  process.env.SMOKE_TEST_URL = process.argv[urlIndex + 1];
}

const timeoutIndex = process.argv.indexOf('--timeout');
if (timeoutIndex !== -1 && process.argv[timeoutIndex + 1]) {
  const timeout = parseInt(process.argv[timeoutIndex + 1]);
  if (!isNaN(timeout)) {
    TIMEOUT = timeout;
  }
}

// Run the smoke test
runSmokeTest().catch(error => {
  console.error(`${colorize('💥 Smoke test failed:', 'red')} ${error.message}`);
  process.exit(1);
});
