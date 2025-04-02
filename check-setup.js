#!/usr/bin/env node

/**
 * This script checks if the environment is set up correctly for the ArcadeManager project.
 * It verifies:
 * 1. If all dependencies are installed
 * 2. If contracts compile successfully
 * 3. If .env file is set up correctly (without revealing sensitive data)
 * 4. If Hardhat node can be connected to (if running)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');
const net = require('net');

// ANSI color codes for better output formatting
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

console.log(`${colors.bright}Arcade Manager Smart Contract Setup Check${colors.reset}`);
console.log('=============================================\n');

// Check if .env file exists
function checkEnvFile() {
  console.log(`${colors.blue}Checking .env file...${colors.reset}`);
  
  if (!fs.existsSync('.env')) {
    console.log(`${colors.red}✗ .env file not found${colors.reset}`);
    console.log(`  Create a .env file with the following template:`);
    console.log(`  POLYGON_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com`);
    console.log(`  PRIVATE_KEY=your_private_key_here`);
    console.log(`  NODE_ENV=development`);
    return false;
  }
  
  // Load .env file
  dotenv.config();
  
  const requiredVars = ['POLYGON_MUMBAI_RPC_URL', 'PRIVATE_KEY'];
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.log(`${colors.yellow}⚠ Missing environment variables: ${missingVars.join(', ')}${colors.reset}`);
    return false;
  }
  
  // Check if private key is valid (without revealing it)
  const privateKey = process.env.PRIVATE_KEY;
  const formattedKey = privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey;
  
  if (!/^[0-9a-f]{64}$/i.test(formattedKey)) {
    console.log(`${colors.yellow}⚠ PRIVATE_KEY is not a valid Ethereum private key${colors.reset}`);
    console.log(`  It should be a 64-character hex string with or without the 0x prefix`);
    return false;
  }
  
  if (privateKey === '0000000000000000000000000000000000000000000000000000000000000000') {
    console.log(`${colors.yellow}⚠ PRIVATE_KEY is set to the placeholder value${colors.reset}`);
    console.log(`  Update it with a real private key before deploying to testnet`);
    return false;
  }
  
  console.log(`${colors.green}✓ .env file looks good${colors.reset}`);
  return true;
}

// Check if contracts compile successfully
function checkContracts() {
  console.log(`\n${colors.blue}Checking smart contracts...${colors.reset}`);
  
  // Check if contract files exist
  const contractFiles = ['ArcadeManager.sol', 'MockBullToken.sol'];
  const missingFiles = [];
  
  for (const file of contractFiles) {
    const filePath = path.join('contracts', file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.log(`${colors.red}✗ Missing contract files: ${missingFiles.join(', ')}${colors.reset}`);
    return false;
  }
  
  // Check if artifacts exist, or try to compile
  const artifactPaths = contractFiles.map(file => {
    const contractName = path.basename(file, '.sol');
    return path.join('artifacts', 'contracts', `${contractName}.json`);
  });
  
  const missingArtifacts = artifactPaths.filter(artifactPath => !fs.existsSync(artifactPath));
  
  if (missingArtifacts.length > 0) {
    console.log(`${colors.yellow}⚠ Some contract artifacts are missing. Trying to compile...${colors.reset}`);
    
    try {
      execSync('node compile.js', { stdio: 'inherit' });
      console.log(`${colors.green}✓ Contracts compiled successfully${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}✗ Failed to compile contracts${colors.reset}`);
      return false;
    }
  } else {
    console.log(`${colors.green}✓ Contract artifacts found${colors.reset}`);
  }
  
  return true;
}

// Check if Hardhat node is running
function checkHardhatNode() {
  console.log(`\n${colors.blue}Checking Hardhat node connection...${colors.reset}`);
  
  return new Promise((resolve) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      console.log(`${colors.yellow}⚠ Could not connect to Hardhat node${colors.reset}`);
      console.log(`  Start it with: node hardhat-node.js`);
      resolve(false);
    }, 1000);
    
    client.connect(8545, 'localhost', () => {
      clearTimeout(timeout);
      client.destroy();
      console.log(`${colors.green}✓ Connected to Hardhat node${colors.reset}`);
      resolve(true);
    });
    
    client.on('error', () => {
      clearTimeout(timeout);
      console.log(`${colors.yellow}⚠ Hardhat node is not running${colors.reset}`);
      console.log(`  Start it with: node hardhat-node.js`);
      resolve(false);
    });
  });
}

// Check if all dependencies are installed
function checkDependencies() {
  console.log(`\n${colors.blue}Checking dependencies...${colors.reset}`);
  
  // Key dependencies to check - use local package.json
  const dependencies = [
    'hardhat',
    'ethers',
    'solc',
    'dotenv'
  ];
  
  const missingDeps = [];
  
  for (const dep of dependencies) {
    try {
      require.resolve(dep);
    } catch (error) {
      missingDeps.push(dep);
    }
  }
  
  if (missingDeps.length > 0) {
    console.log(`${colors.red}✗ Missing dependencies: ${missingDeps.join(', ')}${colors.reset}`);
    console.log(`  Run npm install to install dependencies`);
    return false;
  }
  
  console.log(`${colors.green}✓ All dependencies are installed${colors.reset}`);
  return true;
}

// Print summary
function printSummary(results) {
  console.log(`\n${colors.bright}Summary${colors.reset}`);
  console.log('=======');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log(`${colors.green}${colors.bright}✓ Everything looks good! Your setup is complete.${colors.reset}`);
    console.log('\nNext steps:');
    console.log('1. Start Hardhat node:              node hardhat-node.js');
    console.log('2. Run tests:                       node run-tests.js');
    console.log('3. Deploy locally (for testing):    node deploy.js (select option 1)');
    console.log('4. Deploy to Mumbai (production):   node deploy.js (select option 2)');
  } else {
    console.log(`${colors.yellow}⚠ Some checks failed. Fix the issues above before proceeding.${colors.reset}`);
  }
}

// Run all checks
async function runChecks() {
  const results = {
    dependencies: checkDependencies(),
    contracts: checkContracts(),
    env: checkEnvFile(),
    hardhatNode: await checkHardhatNode()
  };
  
  printSummary(results);
}

runChecks();