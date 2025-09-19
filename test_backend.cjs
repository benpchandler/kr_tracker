const http = require('http');

console.log('Starting backend server...');
require('./server/index.cjs');

setTimeout(() => {
  console.log('Testing API endpoint...');

  http.get('http://localhost:3001/api/state', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('API Response Keys:', Object.keys(parsed).slice(0, 5));
        console.log('Organizations:', parsed.organizations?.length || 0);
        console.log('Teams:', parsed.teams?.length || 0);
        process.exit(0);
      } catch (e) {
        console.log('Response is not JSON:', data.substring(0, 200));
        process.exit(1);
      }
    });
  }).on('error', (err) => {
    console.error('Request failed:', err);
    process.exit(1);
  });
}, 1000);