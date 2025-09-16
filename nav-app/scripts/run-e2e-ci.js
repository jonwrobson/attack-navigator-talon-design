#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

console.log('Starting E2E CI tests...');

// Function to run a command and return a promise
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// Function to wait for server to be ready
function waitForServer(url, timeout = 60000) {
  return new Promise((resolve, reject) => {
    console.log(`Waiting for server at ${url}...`);
    const waitOn = require('wait-on');
    
    waitOn({
      resources: [url],
      timeout: timeout,
      interval: 1000,
      simultaneous: 1
    }, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Server is ready!');
        resolve();
      }
    });
  });
}

// Function to kill processes on specific port
function killProcessOnPort(port) {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const command = isWindows 
      ? `netstat -ano | findstr :${port} | for /f "tokens=5" %a in ('more') do taskkill /F /PID %a`
      : `lsof -ti:${port} | xargs kill -9`;
    
    exec(command, (error) => {
      if (error) {
        console.log(`No process found on port ${port} or error killing process`);
      } else {
        console.log(`Killed process on port ${port}`);
      }
      resolve();
    });
  });
}

async function runE2ECI() {
  let serverProcess = null;
  
  try {
    // Step 1: Build the application
    console.log('Step 1: Building application...');
    await runCommand('npm', ['run', 'build']);
    
    // Step 2: Kill any existing process on port 4200
    await killProcessOnPort(4200);
    
    // Step 3: Start the server in background
    console.log('Step 2: Starting development server...');
    serverProcess = spawn('npm', ['start'], {
      stdio: 'pipe',
      shell: true,
      detached: false
    });

    // Handle server process output
    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data.toString().trim()}`);
    });
    
    // Step 4: Wait for server to be ready
    console.log('Step 3: Waiting for server to be ready...');
    await waitForServer('http://localhost:4200', 60000);
    
    // Step 5: Run Cypress tests
    console.log('Step 4: Running Cypress E2E tests...');
    await runCommand('cypress', ['run', '--headless', '--browser', 'chrome', '--reporter', 'junit']);
    
    console.log('E2E tests completed successfully!');
    
  } catch (error) {
    console.error('E2E tests failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up: Kill the server process
    if (serverProcess && !serverProcess.killed) {
      console.log('Cleaning up server process...');
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t'], { shell: true });
      } else {
        serverProcess.kill('SIGTERM');
      }
    }
    
    // Also kill any process on port 4200 as backup
    await killProcessOnPort(4200);
  }
}

// Run the main function
runE2ECI();