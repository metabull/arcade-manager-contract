// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ArcadeManager
 * @dev A minimalist Ethereum smart contract for arcade management
 * Handles token-to-credit conversion and gameplay transactions
 */
contract ArcadeManager is Ownable, ReentrancyGuard {
    // The BULL token interface
    IERC20 public bullToken;
    
    // Mapping of user address to their credit balance
    mapping(address => uint256) public userCredits;
    
    // Conversion rate: 1 $BULL = 100 credits
    uint256 public constant CREDIT_RATE = 100;
    
    // Events
    event Deposit(address indexed user, uint256 bullAmount, uint256 creditAmount);
    event CreditsSpent(address indexed user, uint256 amount);
    event WinningsAwarded(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 creditAmount, uint256 bullAmount);
    
    /**
     * @dev Constructor sets the BULL token address
     * @param _bullToken Address of the BULL token contract
     */
    constructor(address _bullToken) {
        require(_bullToken != address(0), "Token address cannot be zero");
        bullToken = IERC20(_bullToken);
    }
    
    /**
     * @dev Deposit BULL tokens to receive arcade credits
     * @param bullAmount Amount of BULL tokens to deposit
     */
    function deposit(uint256 bullAmount) external nonReentrant {
        require(bullAmount > 0, "Amount must be greater than zero");
        
        // Transfer BULL tokens from user to contract
        require(bullToken.transferFrom(msg.sender, address(this), bullAmount), "Token transfer failed");
        
        // Calculate and credit the user's arcade credits
        uint256 creditAmount = bullAmount * CREDIT_RATE;
        userCredits[msg.sender] += creditAmount;
        
        emit Deposit(msg.sender, bullAmount, creditAmount);
    }
    
    /**
     * @dev Spend credits to play games
     * @param amount Amount of credits to spend
     */
    function spendCredits(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        require(userCredits[msg.sender] >= amount, "Insufficient credits");
        
        userCredits[msg.sender] -= amount;
        
        emit CreditsSpent(msg.sender, amount);
    }
    
    /**
     * @dev Award winnings to players (admin only)
     * @param player Address of the player to award credits to
     * @param amount Amount of credits to award
     */
    function awardWinnings(address player, uint256 amount) external onlyOwner {
        require(player != address(0), "Invalid player address");
        require(amount > 0, "Amount must be greater than zero");
        
        userCredits[player] += amount;
        
        emit WinningsAwarded(player, amount);
    }
    
    /**
     * @dev Withdraw credits back to BULL tokens
     * @param creditAmount Amount of credits to withdraw
     */
    function withdraw(uint256 creditAmount) external nonReentrant {
        require(creditAmount > 0, "Amount must be greater than zero");
        require(userCredits[msg.sender] >= creditAmount, "Insufficient credits");
        
        // Calculate BULL amount
        uint256 bullAmount = creditAmount / CREDIT_RATE;
        require(bullAmount > 0, "Resulting token amount too small");
        
        // Ensure contract has enough BULL tokens
        require(bullToken.balanceOf(address(this)) >= bullAmount, "Insufficient contract balance");
        
        // Deduct credits first
        userCredits[msg.sender] -= creditAmount;
        
        // Transfer BULL tokens to user
        require(bullToken.transfer(msg.sender, bullAmount), "Token transfer failed");
        
        emit Withdrawal(msg.sender, creditAmount, bullAmount);
    }
    
    /**
     * @dev Get the credit balance of a user
     * @param user Address of the user
     * @return Credit balance
     */
    function getCredits(address user) external view returns (uint256) {
        return userCredits[user];
    }
}
