// Script for deploying to local Hardhat node (for testing)
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Deploying ArcadeManager to local Hardhat node');
  
  // Set up provider for local Hardhat node
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  
  // Get the first account from Hardhat node as deployer
  const deployerSigner = provider.getSigner(0);
  const deployerAddress = await deployerSigner.getAddress();
  console.log(`Deploying from address: ${deployerAddress}`);
  
  // 1. We will first deploy a mock BULL token for local testing
  console.log('Deploying MockBullToken first...');
  
  // Load artifacts
  if (!fs.existsSync(path.resolve('artifacts', 'contracts', 'MockBullToken.json'))) {
    console.error('MockBullToken artifacts not found. Run compilation first.');
    process.exit(1);
  }
  
  if (!fs.existsSync(path.resolve('artifacts', 'contracts', 'ArcadeManager.json'))) {
    console.error('ArcadeManager artifacts not found. Run compilation first.');
    process.exit(1);
  }
  
  // Load contract artifacts
  const mockBullArtifact = JSON.parse(
    fs.readFileSync(path.resolve('artifacts', 'contracts', 'MockBullToken.json'), 'utf8')
  );
  
  const arcadeManagerArtifact = JSON.parse(
    fs.readFileSync(path.resolve('artifacts', 'contracts', 'ArcadeManager.json'), 'utf8')
  );
  
  // Deploy MockBullToken with initial supply
  const MockBullFactory = new ethers.ContractFactory(
    mockBullArtifact.abi,
    mockBullArtifact.bytecode,
    deployerSigner
  );
  
  const initialSupply = ethers.utils.parseEther('1000000'); // 1 million tokens
  const mockBullToken = await MockBullFactory.deploy(initialSupply);
  await mockBullToken.deployed();
  
  console.log(`MockBullToken deployed at: ${mockBullToken.address}`);
  
  // 2. Now deploy the ArcadeManager with the MockBullToken address
  console.log('Deploying ArcadeManager contract...');
  
  const ArcadeManagerFactory = new ethers.ContractFactory(
    arcadeManagerArtifact.abi,
    arcadeManagerArtifact.bytecode,
    deployerSigner
  );
  
  const arcadeManager = await ArcadeManagerFactory.deploy(mockBullToken.address);
  await arcadeManager.deployed();
  
  console.log(`ArcadeManager deployed at: ${arcadeManager.address}`);
  console.log(`BULL token address: ${mockBullToken.address}`);
  
  // 3. Output deployment information to a file
  const deploymentInfo = {
    network: 'localhost',
    mockBullToken: mockBullToken.address,
    arcadeManager: arcadeManager.address,
    deployer: deployerAddress,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    'deployment-local.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log('Deployment information saved to deployment-local.json');
  return { mockBullToken, arcadeManager };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment error:', error);
    process.exit(1);
  });