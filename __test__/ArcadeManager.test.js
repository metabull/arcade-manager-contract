// Use dynamic import for chai
const chai = import('chai').then(module => module.default);
let expect;

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Initialize expect before tests
before(async () => {
  const chaiModule = await chai;
  expect = chaiModule.expect;
});

// Test constants
const BULL_INITIAL_SUPPLY = ethers.utils.parseEther('1000000'); // 1 million BULL tokens
const CREDIT_RATE = 100; // 1 BULL = 100 credits

// Helper function to get contract artifacts
function getArtifact(contractName) {
  const artifactPath = path.resolve('artifacts', 'contracts', `${contractName}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath}. Run 'node compile.js' first.`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
}

describe('ArcadeManager Contract Unit Tests', function() {
  // Test variables
  let provider;
  let owner;
  let user1;
  let user2;
  let bullToken;
  let arcadeManager;
  
  before(async function() {
    // This is a long running test, so we need to increase the timeout
    this.timeout(10000);
    
    // Create a local provider
    provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    
    // Get signers
    const signers = await getSigners();
    owner = signers[0];
    user1 = signers[1];
    user2 = signers[2];
    
    // Deploy MockBullToken
    console.log('Deploying MockBullToken...');
    const bullTokenArtifact = getArtifact('MockBullToken');
    const BullTokenFactory = new ethers.ContractFactory(
      bullTokenArtifact.abi,
      bullTokenArtifact.bytecode,
      owner
    );
    bullToken = await BullTokenFactory.deploy(BULL_INITIAL_SUPPLY);
    await bullToken.deployed();
    console.log('MockBullToken deployed at:', bullToken.address);
    
    // Deploy ArcadeManager
    console.log('Deploying ArcadeManager...');
    const arcadeManagerArtifact = getArtifact('ArcadeManager');
    const ArcadeManagerFactory = new ethers.ContractFactory(
      arcadeManagerArtifact.abi,
      arcadeManagerArtifact.bytecode,
      owner
    );
    arcadeManager = await ArcadeManagerFactory.deploy(bullToken.address);
    await arcadeManager.deployed();
    console.log('ArcadeManager deployed at:', arcadeManager.address);
    
    // Transfer some tokens to the users
    await bullToken.transfer(user1.address, ethers.utils.parseEther('1000'));
    await bullToken.transfer(user2.address, ethers.utils.parseEther('1000'));
  });
  
  // Helper function to get the signers
  async function getSigners() {
    const signers = [];
    // Get the first 5 accounts from the provider
    for (let i = 0; i < 5; i++) {
      const privateKey = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Fund the wallet with some ETH for transactions
      const fundTx = {
        to: wallet.address,
        value: ethers.utils.parseEther('10')
      };
      
      await provider.getSigner(0).sendTransaction(fundTx);
      signers.push(wallet);
    }
    return signers;
  }
  
  describe('Initialization', function() {
    it('should set the correct bull token address', async function() {
      const tokenAddress = await arcadeManager.bullToken();
      expect(tokenAddress).to.equal(bullToken.address);
    });
    
    it('should set the owner correctly', async function() {
      const contractOwner = await arcadeManager.owner();
      expect(contractOwner).to.equal(owner.address);
    });
  });
  
  describe('Deposit Function', function() {
    it('should revert when trying to deposit 0 tokens', async function() {
      try {
        await arcadeManager.connect(user1).deposit(0);
        expect.fail('Transaction should revert');
      } catch (error) {
        expect(error.message).to.include('Amount must be greater than zero');
      }
    });
    
    it('should transfer tokens and credit arcade credits', async function() {
      const depositAmount = ethers.utils.parseEther('10'); // 10 BULL tokens
      const expectedCredits = depositAmount.mul(CREDIT_RATE);
      
      // Approve tokens first
      await bullToken.connect(user1).approve(arcadeManager.address, depositAmount);
      
      // Get the initial balances
      const initialContractBalance = await bullToken.balanceOf(arcadeManager.address);
      const initialUserCredits = await arcadeManager.userCredits(user1.address);
      
      // Make the deposit
      await arcadeManager.connect(user1).deposit(depositAmount);
      
      // Check updated balances
      const finalContractBalance = await bullToken.balanceOf(arcadeManager.address);
      const finalUserCredits = await arcadeManager.userCredits(user1.address);
      
      expect(finalContractBalance.sub(initialContractBalance)).to.equal(depositAmount);
      expect(finalUserCredits.sub(initialUserCredits)).to.equal(expectedCredits);
    });
  });
  
  describe('SpendCredits Function', function() {
    it('should revert when trying to spend 0 credits', async function() {
      try {
        await arcadeManager.connect(user1).spendCredits(0);
        expect.fail('Transaction should revert');
      } catch (error) {
        expect(error.message).to.include('Amount must be greater than zero');
      }
    });
    
    it('should revert when trying to spend more credits than owned', async function() {
      const userCredits = await arcadeManager.userCredits(user1.address);
      const spendAmount = userCredits.add(1); // One more than the user has
      
      try {
        await arcadeManager.connect(user1).spendCredits(spendAmount);
        expect.fail('Transaction should revert');
      } catch (error) {
        expect(error.message).to.include('Insufficient credits');
      }
    });
    
    it('should reduce credits when spending', async function() {
      const spendAmount = 100; // 100 credits
      
      // Get initial credits
      const initialCredits = await arcadeManager.userCredits(user1.address);
      
      // Spend credits
      await arcadeManager.connect(user1).spendCredits(spendAmount);
      
      // Check updated credits
      const finalCredits = await arcadeManager.userCredits(user1.address);
      
      expect(initialCredits.sub(finalCredits)).to.equal(spendAmount);
    });
  });
  
  describe('AwardWinnings Function', function() {
    it('should revert when non-owner tries to award winnings', async function() {
      try {
        await arcadeManager.connect(user1).awardWinnings(user2.address, 100);
        expect.fail('Transaction should revert');
      } catch (error) {
        expect(error.message).to.include('caller is not the owner');
      }
    });
    
    it('should revert when trying to award 0 credits', async function() {
      try {
        await arcadeManager.connect(owner).awardWinnings(user2.address, 0);
        expect.fail('Transaction should revert');
      } catch (error) {
        expect(error.message).to.include('Amount must be greater than zero');
      }
    });
    
    it('should revert when using zero address', async function() {
      try {
        await arcadeManager.connect(owner).awardWinnings(ethers.constants.AddressZero, 100);
        expect.fail('Transaction should revert');
      } catch (error) {
        expect(error.message).to.include('Invalid player address');
      }
    });
    
    it('should increase user credits when awarding winnings', async function() {
      const awardAmount = 500; // 500 credits
      
      // Get initial credits
      const initialCredits = await arcadeManager.userCredits(user2.address);
      
      // Award winnings
      await arcadeManager.connect(owner).awardWinnings(user2.address, awardAmount);
      
      // Check updated credits
      const finalCredits = await arcadeManager.userCredits(user2.address);
      
      expect(finalCredits.sub(initialCredits)).to.equal(awardAmount);
    });
  });
  
  describe('Withdraw Function', function() {
    it('should revert when trying to withdraw 0 credits', async function() {
      try {
        await arcadeManager.connect(user2).withdraw(0);
        expect.fail('Transaction should revert');
      } catch (error) {
        expect(error.message).to.include('Amount must be greater than zero');
      }
    });
    
    it('should revert when trying to withdraw more credits than owned', async function() {
      const userCredits = await arcadeManager.userCredits(user2.address);
      const withdrawAmount = userCredits.add(1); // One more than the user has
      
      try {
        await arcadeManager.connect(user2).withdraw(withdrawAmount);
        expect.fail('Transaction should revert');
      } catch (error) {
        expect(error.message).to.include('Insufficient credits');
      }
    });
    
    it('should convert credits to tokens and transfer correctly', async function() {
      // For user 2 with 500 credits (from previous test)
      const creditAmount = 500;
      const expectedTokenAmount = creditAmount / CREDIT_RATE; // 5 BULL tokens
      
      // Get initial balances
      const initialUserCredits = await arcadeManager.userCredits(user2.address);
      const initialUserTokens = await bullToken.balanceOf(user2.address);
      const initialContractTokens = await bullToken.balanceOf(arcadeManager.address);
      
      // Withdraw credits
      await arcadeManager.connect(user2).withdraw(creditAmount);
      
      // Check updated balances
      const finalUserCredits = await arcadeManager.userCredits(user2.address);
      const finalUserTokens = await bullToken.balanceOf(user2.address);
      const finalContractTokens = await bullToken.balanceOf(arcadeManager.address);
      
      expect(initialUserCredits.sub(finalUserCredits)).to.equal(creditAmount);
      expect(finalUserTokens.sub(initialUserTokens)).to.equal(ethers.utils.parseEther(expectedTokenAmount.toString()));
      expect(initialContractTokens.sub(finalContractTokens)).to.equal(ethers.utils.parseEther(expectedTokenAmount.toString()));
    });
  });
});