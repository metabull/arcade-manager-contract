#!/usr/bin/env node

/**
 * Script to start a Hardhat node with telemetry disabled
 * and auto-responding to the telemetry prompt.
 */

const { spawn } = require('child_process');

// Set environment variables to disable telemetry
process.env.HARDHAT_TELEMETRY_OPTOUT = 1;
process.env.HARDHAT_PROMPT = 'false';

console.log('Starting Hardhat node...');
console.log('Press Ctrl+C to stop the node.');

// Spawn the Hardhat node process
const hardhatProcess = spawn('npx', ['hardhat', 'node'], { 
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

// Handle process events
hardhatProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Hardhat node exited with code ${code}`);
  }
  process.exit(code);
});

// Handle SIGINT (Ctrl+C) to gracefully shut down
process.on('SIGINT', () => {
  console.log('\nGracefully stopping Hardhat node...');
  hardhatProcess.kill('SIGINT');
});