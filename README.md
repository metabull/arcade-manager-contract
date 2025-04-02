# Arcade Manager Smart Contract

A minimalist Ethereum smart contract for arcade management that handles token-to-credit conversion and gameplay transactions.

## Features

- Deposit $BULL tokens to receive arcade credits
- Spend credits to play games
- Award winnings to players (admin only)
- Withdraw credits back to $BULL tokens
- Fixed conversion rate: 1 $BULL = 100 credits

## Smart Contract Architecture

This project contains two main contracts:

1. **ArcadeManager.sol**: The main contract that provides the arcade credit management functionality
2. **MockBullToken.sol**: A mock implementation of the $BULL token for local testing

The ArcadeManager contract is designed to interact with the existing $BULL token at address `0x9f95e17b2668afe01f8fbd157068b0a4405cc08d` on the Polygon network.

## Security Features

- Uses OpenZeppelin's ReentrancyGuard to prevent re-entrancy attacks
- Implements Ownable for admin-only functions
- Properly validates inputs and checks balances before operations

## Pre-requisites

- Node.js (v14 or newer)
- NPM or Yarn
- Hardhat
- An Ethereum wallet with a private key (for deployments)
- MATIC tokens for gas (for Polygon Mumbai testnet deployment)

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Set up your environment variables:

```bash
cp .env.example .env
# Edit the .env file to include your private key and RPC URLs
```

## Development and Testing

### Compiling Contracts

To compile the smart contracts:

```bash
node compile.js
```

This will create the contract artifacts in the `artifacts/` directory.

### Running Tests

Start the local Hardhat node:

```bash
npm run hardhat-node
# or directly
npx hardhat node
```

In another terminal, run the tests:

```bash
node run-tests.js
```

### Local Deployment

To deploy to a local Hardhat node (for development):

```bash
node deploy.js
# Then select option 1: Local (Hardhat node)
```

This will deploy both the MockBullToken and ArcadeManager contracts to your local Hardhat network.

## Deployment to Polygon Mumbai Testnet

To deploy to the Polygon Mumbai testnet:

1. Make sure your `.env` file contains a valid private key with sufficient MATIC for gas
2. Run the deployment script:

```bash
node deploy.js
# Then select option 2: Polygon Mumbai Testnet
```

3. Once deployed, the contract address will be displayed and saved to `deployment-mumbai.json`

## Interacting with the Contract

### Using the ArcadeManager Contract

The ArcadeManager contract provides the following main functions:

- `deposit(uint256 bullAmount)`: Convert BULL tokens to arcade credits
- `spendCredits(uint256 amount)`: Spend credits to play games
- `awardWinnings(address player, uint256 amount)`: Award credits to players (admin only)
- `withdraw(uint256 creditAmount)`: Convert credits back to BULL tokens
- `getCredits(address user)`: Get the credit balance of a user

### Example JavaScript Interaction

```javascript
// Sample code to interact with the deployed contract
const ethers = require('ethers');
const ArcadeManagerABI = require('./artifacts/contracts/ArcadeManager.json').abi;
const BullTokenABI = require('./artifacts/contracts/MockBullToken.json').abi;

// Connect to the network
const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
const privateKey = 'YOUR_PRIVATE_KEY';
const wallet = new ethers.Wallet(privateKey, provider);

// Contract addresses
const arcadeManagerAddress = 'YOUR_DEPLOYED_CONTRACT_ADDRESS';
const bullTokenAddress = '0x9f95e17b2668afe01f8fbd157068b0a4405cc08d'; // Real BULL token address

// Contract instances
const arcadeManager = new ethers.Contract(arcadeManagerAddress, ArcadeManagerABI, wallet);
const bullToken = new ethers.Contract(bullTokenAddress, BullTokenABI, wallet);

// Example: Approve and deposit BULL tokens
async function depositTokens(amount) {
  const tokenAmount = ethers.utils.parseEther(amount.toString());
  
  // First approve the tokens
  const approveTx = await bullToken.approve(arcadeManagerAddress, tokenAmount);
  await approveTx.wait();
  console.log('Tokens approved');
  
  // Then deposit
  const depositTx = await arcadeManager.deposit(tokenAmount);
  await depositTx.wait();
  console.log(`Deposited ${amount} BULL tokens`);
  
  // Check credits
  const credits = await arcadeManager.getCredits(wallet.address);
  console.log(`Credit balance: ${credits}`);
}

// Example: Spend credits
async function spendCredits(amount) {
  const tx = await arcadeManager.spendCredits(amount);
  await tx.wait();
  console.log(`Spent ${amount} credits`);
}

// Run examples
// depositTokens(10).catch(console.error);
// spendCredits(500).catch(console.error);
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.