#!/usr/bin/env node

/**
 * Main deployment script for the ArcadeManager contract
 * This script handles compiling contracts first if needed,
 * then checks if we're deploying locally or to a testnet.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// First, check if artifacts exist, if not compile the contracts
if (!fs.existsSync(path.resolve('artifacts', 'contracts', 'ArcadeManager.json'))) {
  console.log('📦 Artifacts not found. Compiling contracts first...');
  require('./compile');
}

// Determine the deployment target
async function determineDeploymentTarget() {
  return new Promise((resolve) => {
    console.log('\n🚀 ArcadeManager Deployment');
    console.log('========================');
    console.log('1. Local (Hardhat node)');
    console.log('2. Polygon Mumbai Testnet');
    console.log('3. Cancel');
    
    rl.question('\nWhere would you like to deploy? (1-3): ', (answer) => {
      if (answer === '1') {
        resolve('local');
      } else if (answer === '2') {
        resolve('mumbai');
      } else {
        resolve('cancel');
      }
    });
  });
}

// Check if Hardhat node is running for local deployment
async function checkHardhatNode() {
  return new Promise((resolve) => {
    const net = require('net');
    const client = new net.Socket();
    
    // Try to connect to the Hardhat node
    client.connect(8545, 'localhost', () => {
      client.destroy();
      resolve(true);
    });
    
    client.on('error', () => {
      resolve(false);
    });
  });
}

// Check if private key is valid for testnet deployment
function isValidPrivateKey() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === '0000000000000000000000000000000000000000000000000000000000000000') {
    return false;
  }
  
  const formattedKey = privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey;
  return /^[0-9a-f]{64}$/i.test(formattedKey);
}

// Execute a command as a promise
function executeCommand(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { 
      stdio: 'inherit',
      shell: true
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
  });
}

// Main function
async function main() {
  try {
    const target = await determineDeploymentTarget();
    
    if (target === 'cancel') {
      console.log('Deployment canceled.');
      process.exit(0);
    }
    
    if (target === 'local') {
      // Check if Hardhat node is running
      const nodeRunning = await checkHardhatNode();
      if (!nodeRunning) {
        console.log('❌ Hardhat node is not running.');
        console.log('Please start it with: npx hardhat node');
        process.exit(1);
      }
      
      console.log('\n🔄 Deploying to local Hardhat node...');
      await executeCommand('node', ['deploy-local.js']);
      console.log('✅ Local deployment complete!');
      
    } else if (target === 'mumbai') {
      // Check for valid private key
      if (!isValidPrivateKey()) {
        console.log('❌ Invalid or missing private key in .env file.');
        console.log('Please add a valid PRIVATE_KEY to your .env file before deploying to testnet.');
        process.exit(1);
      }
      
      // Set NODE_ENV to production for the deployment
      process.env.NODE_ENV = 'production';
      
      console.log('\n🔄 Deploying to Polygon Mumbai Testnet...');
      await executeCommand('node', ['scripts/deploy.js']);
      console.log('✅ Mumbai testnet deployment complete!');
    }
    
  } catch (error) {
    console.error(`\n❌ Deployment failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the main function
main();