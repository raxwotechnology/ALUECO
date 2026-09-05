/**
 * Test script to call the migration endpoint
 * Usage: node testMigration.js
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/alu/migrations/add-specs',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // You'll need to replace this with a valid token
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
