const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

// Configure a local provider running at the standard port
// Use 0.0.0.0 instead of localhost to ensure it works in Replit
const provider = new ethers.providers.JsonRpcProvider('http://0.0.0.0:8545');

// Helper function to load contract artifacts
function loadArtifact(contractName) {
  const artifactPath = path.resolve('artifacts', 'contracts', `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    console.error(`Artifact not found: ${artifactPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
}

// Create a wallet with a private key (this will be automatically funded on Hardhat)
function createWallets(count = 3) {
  const wallets = [];
  for (let i = 0; i < count; i++) {
    const wallet = ethers.Wallet.createRandom().connect(provider);
    wallets.push(wallet);
  }
  return wallets;
}

// Main test function
async function runTests() {
  console.log('Starting ArcadeManager contract tests');
  
  try {
    // Create test wallets
    const [owner, user1, user2] = createWallets();
    console.log(`Test wallets created:`);
    console.log(`- Owner: ${owner.address}`);
    console.log(`- User1: ${user1.address}`);
    console.log(`- User2: ${user2.address}`);
    
    // Load artifacts
    const bullTokenArtifact = loadArtifact('MockBullToken');
    const arcadeManagerArtifact = loadArtifact('ArcadeManager');
    
    // Get the first signer from the provider (has ETH)
    const deployer = provider.getSigner(0);
    const deployerAddress = await deployer.getAddress();
    console.log(`Deployer address: ${deployerAddress}`);
    
    // Fund our test wallets with ETH
    console.log('Funding test wallets with ETH...');
    for (const wallet of [owner, user1, user2]) {
      const tx = await deployer.sendTransaction({
        to: wallet.address,
        value: ethers.utils.parseEther('1.0')
      });
      await tx.wait();
    }
    
    // Deploy MockBullToken
    console.log('Deploying MockBullToken...');
    const bullTokenFactory = new ethers.ContractFactory(
      bullTokenArtifact.abi,
      bullTokenArtifact.bytecode,
      owner
    );
    const bullToken = await bullTokenFactory.deploy(ethers.utils.parseEther('1000000'));
    await bullToken.deployed();
    console.log(`MockBullToken deployed at: ${bullToken.address}`);
    
    // Deploy ArcadeManager
    console.log('Deploying ArcadeManager...');
    const arcadeManagerFactory = new ethers.ContractFactory(
      arcadeManagerArtifact.abi,
      arcadeManagerArtifact.bytecode,
      owner
    );
    const arcadeManager = await arcadeManagerFactory.deploy(bullToken.address);
    await arcadeManager.deployed();
    console.log(`ArcadeManager deployed at: ${arcadeManager.address}`);
    
    // Transfer tokens to users
    console.log('Transferring BULL tokens to users...');
    await (await bullToken.transfer(user1.address, ethers.utils.parseEther('1000'))).wait();
    await (await bullToken.transfer(user2.address, ethers.utils.parseEther('1000'))).wait();
    
    // Test 1: Verify initial state
    console.log('\nTest 1: Verifying initial state');
    const tokenAddress = await arcadeManager.bullToken();
    console.log(`- Bull token address: ${tokenAddress}`);
    const contractOwner = await arcadeManager.owner();
    console.log(`- Contract owner: ${contractOwner}`);
    
    if (tokenAddress === bullToken.address) {
      console.log('✅ Bull token address is correct');
    } else {
      console.log('❌ Bull token address is incorrect');
    }
    
    if (contractOwner === owner.address) {
      console.log('✅ Owner is correct');
    } else {
      console.log('❌ Owner is incorrect');
    }
    
    // Test 2: Deposit function
    console.log('\nTest 2: Testing deposit function');
    const depositAmount = ethers.utils.parseEther('10');
    const expectedCredits = depositAmount.mul(100); // CREDIT_RATE = 100
    
    // Approve tokens first
    await (await bullToken.connect(user1).approve(arcadeManager.address, depositAmount)).wait();
    
    // Record initial balances
    const user1InitialCredits = await arcadeManager.userCredits(user1.address);
    const contractInitialBalance = await bullToken.balanceOf(arcadeManager.address);
    
    console.log(`- User1 initial credits: ${user1InitialCredits}`);
    console.log(`- Contract initial BULL balance: ${ethers.utils.formatEther(contractInitialBalance)}`);
    
    // Make deposit
    await (await arcadeManager.connect(user1).deposit(depositAmount)).wait();
    
    // Check final balances
    const user1FinalCredits = await arcadeManager.userCredits(user1.address);
    const contractFinalBalance = await bullToken.balanceOf(arcadeManager.address);
    
    console.log(`- User1 final credits: ${user1FinalCredits}`);
    console.log(`- Contract final BULL balance: ${ethers.utils.formatEther(contractFinalBalance)}`);
    
    if (user1FinalCredits.sub(user1InitialCredits).eq(expectedCredits)) {
      console.log('✅ User received correct number of credits');
    } else {
      console.log('❌ User received incorrect number of credits');
    }
    
    if (contractFinalBalance.sub(contractInitialBalance).eq(depositAmount)) {
      console.log('✅ Contract received correct number of tokens');
    } else {
      console.log('❌ Contract received incorrect number of tokens');
    }
    
    // Test 3: Spend credits
    console.log('\nTest 3: Testing spendCredits function');
    const spendAmount = 500; // credits
    
    // Record initial credits
    const initialCredits = await arcadeManager.userCredits(user1.address);
    console.log(`- User1 initial credits: ${initialCredits}`);
    
    // Spend credits
    await (await arcadeManager.connect(user1).spendCredits(spendAmount)).wait();
    
    // Check final credits
    const finalCredits = await arcadeManager.userCredits(user1.address);
    console.log(`- User1 final credits: ${finalCredits}`);
    
    if (initialCredits.sub(finalCredits).eq(spendAmount)) {
      console.log('✅ Credits spent correctly');
    } else {
      console.log('❌ Credits spent incorrectly');
    }
    
    // Test 4: Award winnings
    console.log('\nTest 4: Testing awardWinnings function');
    const awardAmount = 500; // credits
    
    // Record initial credits
    const user2InitialCredits = await arcadeManager.userCredits(user2.address);
    console.log(`- User2 initial credits: ${user2InitialCredits}`);
    
    // Award credits
    await (await arcadeManager.connect(owner).awardWinnings(user2.address, awardAmount)).wait();
    
    // Check final credits
    const user2FinalCredits = await arcadeManager.userCredits(user2.address);
    console.log(`- User2 final credits: ${user2FinalCredits}`);
    
    if (user2FinalCredits.sub(user2InitialCredits).eq(awardAmount)) {
      console.log('✅ Winnings awarded correctly');
    } else {
      console.log('❌ Winnings awarded incorrectly');
    }
    
    // Test 5: Withdraw credits
    console.log('\nTest 5: Testing withdraw function');
    const withdrawAmount = 500; // credits
    const expectedTokens = ethers.utils.parseEther('5'); // 500 / 100 = 5 BULL
    
    // Record initial balances
    const user2InitialTokens = await bullToken.balanceOf(user2.address);
    const user2WithdrawInitialCredits = await arcadeManager.userCredits(user2.address);
    const contractWithdrawInitialBalance = await bullToken.balanceOf(arcadeManager.address);
    
    console.log(`- User2 initial credits: ${user2WithdrawInitialCredits}`);
    console.log(`- User2 initial BULL: ${ethers.utils.formatEther(user2InitialTokens)}`);
    console.log(`- Contract initial BULL: ${ethers.utils.formatEther(contractWithdrawInitialBalance)}`);
    
    // Withdraw credits
    await (await arcadeManager.connect(user2).withdraw(withdrawAmount)).wait();
    
    // Check final balances
    const user2FinalTokens = await bullToken.balanceOf(user2.address);
    const user2WithdrawFinalCredits = await arcadeManager.userCredits(user2.address);
    const contractWithdrawFinalBalance = await bullToken.balanceOf(arcadeManager.address);
    
    console.log(`- User2 final credits: ${user2WithdrawFinalCredits}`);
    console.log(`- User2 final BULL: ${ethers.utils.formatEther(user2FinalTokens)}`);
    console.log(`- Contract final BULL: ${ethers.utils.formatEther(contractWithdrawFinalBalance)}`);
    
    if (user2WithdrawInitialCredits.sub(user2WithdrawFinalCredits).eq(withdrawAmount)) {
      console.log('✅ Credits reduced correctly');
    } else {
      console.log('❌ Credits reduced incorrectly');
    }
    
    if (user2FinalTokens.sub(user2InitialTokens).eq(expectedTokens)) {
      console.log('✅ Tokens received correctly');
    } else {
      console.log('❌ Tokens received incorrectly');
    }
    
    console.log('\nAll tests completed!');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Need a running Hardhat node
const netVersion = provider.send('net_version', [])
  .then(() => {
    console.log('Connected to Ethereum node');
    runTests();
  })
  .catch(error => {
    console.error('Could not connect to Ethereum node. Is Hardhat running?');
    console.error('Start Hardhat with: npx hardhat node');
    process.exit(1);
  });