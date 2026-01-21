const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../..');
const backendPath = path.join(projectRoot, 'backend');

console.log('🚀 Initiating Ult Trading System Startup Sequence...');

// 1. Backend
console.log('Starting Backend (Uvicorn)...');
const backendEnv = { ...process.env, PYTHONPATH: backendPath };
const backendProcess = spawn('powershell', [
  '-NoExit', 
  '-Command', 
  `cd "${backendPath}"; uvicorn src.main:app --reload --port 8000`
], {
  cwd: projectRoot,
  env: backendEnv,
  detached: true,
  stdio: 'ignore', // Detach completely
  shell: true
});
backendProcess.unref();

// 2. Frontend
console.log('Starting Frontend (Next.js)...');
const frontendProcess = spawn('powershell', [
  '-NoExit', 
  '-Command', 
  'npm run dev'
], {
  cwd: projectRoot,
  detached: true,
  stdio: 'ignore',
  shell: true
});
frontendProcess.unref();

console.log('✅ Startup commands issued. Please check the new windows.');
console.log('Backend: http://localhost:8000');
console.log('Frontend: http://localhost:3000');
