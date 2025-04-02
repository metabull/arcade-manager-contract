const { spawn } = require('child_process');
const fs = require('fs');

// Write a temporary .yarnrc file that disables the interactive mode
fs.writeFileSync('./.hardhatrc.json', JSON.stringify({ enabled: false }));

// Set environment variable to disable telemetry
process.env.HARDHAT_TELEMETRY_OPTOUT = 1;

// Run hardhat compile with environment variables set
const compile = spawn('npx', ['hardhat', 'compile'], {
  env: { ...process.env, HARDHAT_TELEMETRY_OPTOUT: '1' },
  stdio: 'inherit'
});

compile.on('close', (code) => {
  console.log(`Compilation process exited with code ${code}`);
});