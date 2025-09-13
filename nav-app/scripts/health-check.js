const http = require('http');

const options = {
  hostname: process.env.APP_HOST || 'localhost',
  port: process.env.APP_PORT || 4200,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const checkHealth = () => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log(`✓ Health check passed - Status: ${res.statusCode}`);
        resolve(true);
      } else {
        reject(new Error(`Health check failed with status: ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(new Error(`Health check request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timed out'));
    });

    req.setTimeout(options.timeout);
    req.end();
  });
};

const waitForApp = async (maxRetries = 30, delay = 2000) => {
  console.log(`Waiting for application at ${options.hostname}:${options.port}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await checkHealth();
      console.log('✓ Application is healthy and ready!');
      process.exit(0);
    } catch (error) {
      console.log(`⚠ Health check attempt ${i + 1}/${maxRetries} failed: ${error.message}`);
      if (i < maxRetries - 1) {
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('✗ Application failed to become healthy within the timeout period');
  process.exit(1);
};

// Handle script termination
process.on('SIGINT', () => {
  console.log('\nHealth check interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\nHealth check terminated');
  process.exit(1);
});

// Start health check
waitForApp().catch((error) => {
  console.error('✗ Health check failed:', error.message);
  process.exit(1);
});
