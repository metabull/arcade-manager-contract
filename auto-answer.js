// This script will automatically answer "yes" to the Hardhat telemetry prompt
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Monkey-patch readline.question to automatically answer 'y' to telemetry question
rl._questionOriginal = rl.question;
rl.question = function(query, cb) {
  if (query.includes('Help us improve Hardhat with anonymous crash reports & basic usage data?')) {
    console.log('Automatically answering yes to telemetry prompt');
    cb('y');
  } else {
    this._questionOriginal(query, cb);
  }
};

// Keep the process alive until it's terminated
process.stdin.resume();