#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const venvPython = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
const venvPythonUnix = path.join(__dirname, 'venv', 'bin', 'python');

// Check if virtual environment exists
let pythonCmd = 'python';
if (fs.existsSync(venvPython)) {
  pythonCmd = venvPython;
} else if (fs.existsSync(venvPythonUnix)) {
  pythonCmd = venvPythonUnix;
} else {
  console.warn('Virtual environment not found. Using system Python.');
  console.warn('Run: python -m venv venv && venv\\Scripts\\pip install -r requirements.txt');
}

// Start the FastAPI server
const args = ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'];

console.log(`Starting FastAPI server with: ${pythonCmd} ${args.join(' ')}`);

const proc = spawn(pythonCmd, args, {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

proc.on('error', (err) => {
  console.error('Failed to start FastAPI server:', err);
  process.exit(1);
});

proc.on('exit', (code) => {
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  proc.kill('SIGINT');
});

process.on('SIGTERM', () => {
  proc.kill('SIGTERM');
});
