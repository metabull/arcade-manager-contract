const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ArcadeManager", function () {
  let arcadeManager;
  let bullToken;
  let owner;
  let user1;
  let user2;
  
  // Constants
  const CREDIT_RATE = 100;
  const INITIAL_TOKEN_SUPPLY = ethers.utils.parseEther("1000");
  const DEPOSIT_AMOUNT = ethers.utils.parseEther("10");
  const CREDIT_AMOUNT = DEPOSIT_AMOUNT.mul(CREDIT_RATE);
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy a mock BULL token for testing
    const MockToken = await ethers.getContractFactory("MockBullToken");
    bullToken = await MockToken.deploy(INITIAL_TOKEN_SUPPLY);
    await bullToken.deployed();
    
    // Deploy ArcadeManager with mock token
    const ArcadeManager = await ethers.getContractFactory("ArcadeManager");
    arcadeManager = await ArcadeManager.deploy(bullToken.address);
    await arcadeManager.deployed();
    
    // Transfer tokens to user1 for testing
    await bullToken.transfer(user1.address, DEPOSIT_AMOUNT.mul(2));
    
    // Approve ArcadeManager to spend user1's tokens
    await bullToken.connect(user1).approve(arcadeManager.address, DEPOSIT_AMOUNT.mul(2));
  });
  
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await arcadeManager.owner()).to.equal(owner.address);
    });
    
    it("Should set the correct token address", async function () {
      expect(await arcadeManager.bullToken()).to.equal(bullToken.address);
    });
  });
  
  describe("Deposit", function () {
    it("Should convert BULL tokens to credits correctly", async function () {
      await arcadeManager.connect(user1).deposit(DEPOSIT_AMOUNT);
      
      // Check user credits
      expect(await arcadeManager.userCredits(user1.address)).to.equal(CREDIT_AMOUNT);
      
      // Check token balances
      expect(await bullToken.balanceOf(user1.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await bullToken.balanceOf(arcadeManager.address)).to.equal(DEPOSIT_AMOUNT);
    });
    
    it("Should emit Deposit event", async function () {
      await expect(arcadeManager.connect(user1).deposit(DEPOSIT_AMOUNT))
        .to.emit(arcadeManager, "Deposit")
        .withArgs(user1.address, DEPOSIT_AMOUNT, CREDIT_AMOUNT);
    });
    
    it("Should revert if amount is zero", async function () {
      await expect(arcadeManager.connect(user1).deposit(0))
        .to.be.revertedWith("Amount must be greater than zero");
    });
  });
  
  describe("SpendCredits", function () {
    beforeEach(async function () {
      // First deposit tokens
      await arcadeManager.connect(user1).deposit(DEPOSIT_AMOUNT);
    });
    
    it("Should reduce user's credit balance", async function () {
      const spendAmount = 50;
      await arcadeManager.connect(user1).spendCredits(spendAmount);
      
      const expectedBalance = CREDIT_AMOUNT.sub(spendAmount);
      expect(await arcadeManager.userCredits(user1.address)).to.equal(expectedBalance);
    });
    
    it("Should emit CreditsSpent event", async function () {
      const spendAmount = 50;
      await expect(arcadeManager.connect(user1).spendCredits(spendAmount))
        .to.emit(arcadeManager, "CreditsSpent")
        .withArgs(user1.address, spendAmount);
    });
    
    it("Should revert if user doesn't have enough credits", async function () {
      const tooManyCredits = CREDIT_AMOUNT.add(1);
      await expect(arcadeManager.connect(user1).spendCredits(tooManyCredits))
        .to.be.revertedWith("Insufficient credits");
    });
  });
  
  describe("AwardWinnings", function () {
    it("Should add credits to user balance", async function () {
      const awardAmount = 500;
      await arcadeManager.awardWinnings(user1.address, awardAmount);
      
      expect(await arcadeManager.userCredits(user1.address)).to.equal(awardAmount);
    });
    
    it("Should emit WinningsAwarded event", async function () {
      const awardAmount = 500;
      await expect(arcadeManager.awardWinnings(user1.address, awardAmount))
        .to.emit(arcadeManager, "WinningsAwarded")
        .withArgs(user1.address, awardAmount);
    });
    
    it("Should revert if called by non-owner", async function () {
      const awardAmount = 500;
      await expect(arcadeManager.connect(user1).awardWinnings(user2.address, awardAmount))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  
  describe("Withdraw", function () {
    beforeEach(async function () {
      // First deposit tokens
      await arcadeManager.connect(user1).deposit(DEPOSIT_AMOUNT);
    });
    
    it("Should convert credits back to BULL tokens", async function () {
      const withdrawCredits = CREDIT_AMOUNT.div(2);
      const expectedBullTokens = withdrawCredits.div(CREDIT_RATE);
      
      const initialUserTokenBalance = await bullToken.balanceOf(user1.address);
      const initialContractTokenBalance = await bullToken.balanceOf(arcadeManager.address);
      
      await arcadeManager.connect(user1).withdraw(withdrawCredits);
      
      // Check user credits reduced
      expect(await arcadeManager.userCredits(user1.address)).to.equal(CREDIT_AMOUNT.sub(withdrawCredits));
      
      // Check token balances updated
      expect(await bullToken.balanceOf(user1.address)).to.equal(initialUserTokenBalance.add(expectedBullTokens));
      expect(await bullToken.balanceOf(arcadeManager.address)).to.equal(initialContractTokenBalance.sub(expectedBullTokens));
    });
    
    it("Should emit Withdrawal event", async function () {
      const withdrawCredits = CREDIT_AMOUNT.div(2);
      const expectedBullTokens = withdrawCredits.div(CREDIT_RATE);
      
      await expect(arcadeManager.connect(user1).withdraw(withdrawCredits))
        .to.emit(arcadeManager, "Withdrawal")
        .withArgs(user1.address, withdrawCredits, expectedBullTokens);
    });
    
    it("Should revert if user doesn't have enough credits", async function () {
      const tooManyCredits = CREDIT_AMOUNT.add(1);
      await expect(arcadeManager.connect(user1).withdraw(tooManyCredits))
        .to.be.revertedWith("Insufficient credits");
    });
  });
});

// MockBullToken tests can be added as a separate describe block if needed
