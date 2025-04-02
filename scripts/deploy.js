// Import required dependencies
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("Starting deployment to Polygon Mumbai...");

  // Address of the BULL token on the network (this is a real token address on Polygon)
  const bullTokenAddress = "0x9f95e17b2668afe01f8fbd157068b0a4405cc08d";
  
  // Check if the private key is available in .env and validate it
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY not found in .env file");
    console.error("Please add a valid PRIVATE_KEY to your .env file.");
    process.exit(1);
  }
  
  // Check if the private key is a valid hex string
  const formattedKey = privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey;
  if (!/^[0-9a-f]{64}$/i.test(formattedKey)) {
    console.error("Error: PRIVATE_KEY is not a valid Ethereum private key");
    console.error("It should be a 64-character hex string with or without the 0x prefix");
    process.exit(1);
  }

  // Check if we have an RPC URL
  const rpcUrl = process.env.POLYGON_MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com";
  console.log(`Using RPC URL: ${rpcUrl}`);

  try {
    // Test the connection to the RPC endpoint
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork().catch(e => {
      throw new Error(`Failed to connect to network at ${rpcUrl}: ${e.message}`);
    });
    console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
    
    // Validate we're on the correct network (Mumbai testnet has chainId 80001)
    if (network.chainId !== 80001) {
      console.warn(`Warning: Connected to chainId ${network.chainId}, but Mumbai testnet is 80001`);
      const continueDeployment = false; // Set to true to force deployment on any network
      if (!continueDeployment) {
        console.error("Aborting deployment to prevent deploying to the wrong network");
        console.error("If you want to deploy to this network anyway, modify the script");
        process.exit(1);
      }
    }
    
    // Load the contract artifacts
    const artifactPath = path.resolve("artifacts/contracts/ArcadeManager.json");
    if (!fs.existsSync(artifactPath)) {
      console.error("Error: Artifact file not found. Run 'node compile.js' first.");
      process.exit(1);
    }
    
    // Load the contract artifacts
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    
    // Set up wallet with the private key
    const fullPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const wallet = new ethers.Wallet(fullPrivateKey, provider);
    
    // Check wallet balance
    const balance = await wallet.getBalance();
    const balanceInMATIC = ethers.utils.formatEther(balance);
    console.log(`Deploying from address: ${wallet.address}`);
    console.log(`Account balance: ${balanceInMATIC} MATIC`);
    
    if (balance.eq(0)) {
      console.error("Error: Your account has 0 MATIC. You need MATIC to deploy contracts.");
      console.error("Get testnet MATIC from https://faucet.polygon.technology/");
      process.exit(1);
    }
    
    if (balance.lt(ethers.utils.parseEther("0.01"))) {
      console.warn("Warning: Your account balance is low. You may need more MATIC for deployment.");
    }
    
    // Estimate gas price for deployment
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = ethers.utils.formatUnits(gasPrice, "gwei");
    console.log(`Current gas price: ${gasPriceGwei} Gwei`);
    
    // Create a contract factory
    const factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      wallet
    );
    
    // Estimate gas limit for deployment (with a buffer for safety)
    console.log("Estimating gas for deployment...");
    const estimatedGas = await factory.signer.estimateGas(
      factory.getDeployTransaction(bullTokenAddress)
    ).catch(e => {
      console.error("Error estimating gas:", e.message);
      return ethers.BigNumber.from(1500000); // Fallback gas limit
    });
    
    // Add 20% buffer to gas limit
    const gasLimit = estimatedGas.mul(120).div(100);
    console.log(`Estimated gas: ${estimatedGas.toString()} (using limit: ${gasLimit.toString()})`);
    
    // Deploy the contract
    console.log("Deploying ArcadeManager contract to Polygon Mumbai...");
    const arcadeManager = await factory.deploy(bullTokenAddress, {
      gasLimit,
      gasPrice: gasPrice.mul(110).div(100) // 10% higher gas price for faster inclusion
    });
    
    console.log(`Deployment transaction hash: ${arcadeManager.deployTransaction.hash}`);
    console.log("Waiting for transaction to be mined (this may take a few minutes)...");
    
    await arcadeManager.deployed();
    
    // Save deployment information
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId,
      contractAddress: arcadeManager.address,
      bullTokenAddress: bullTokenAddress,
      deployer: wallet.address,
      deploymentTxHash: arcadeManager.deployTransaction.hash,
      timestamp: new Date().toISOString()
    };
    
    // Write deployment info to a file
    const deploymentFilePath = 'deployment-mumbai.json';
    fs.writeFileSync(
      deploymentFilePath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("======== Deployment Successful ========");
    console.log(`ArcadeManager deployed to: ${arcadeManager.address}`);
    console.log(`BULL token address: ${bullTokenAddress}`);
    console.log(`Deployment saved to: ${deploymentFilePath}`);
    console.log("");
    console.log("Next steps:");
    console.log("1. Verify your contract on PolygonScan (optional)");
    console.log("2. Test your contract with real transactions");
    console.log("3. Share your contract address with users");
    
    return arcadeManager;
  } catch (error) {
    console.error("========== Deployment Failed ==========");
    console.error(`Error: ${error.message}`);
    
    // Provide more context based on the error
    if (error.message.includes("insufficient funds")) {
      console.error("Your wallet doesn't have enough MATIC to pay for gas");
      console.error("Get testnet MATIC from https://faucet.polygon.technology/");
    } else if (error.message.includes("nonce")) {
      console.error("There might be a pending transaction from this account");
      console.error("Check your account on Mumbai PolygonScan and wait for pending transactions");
    } else if (error.message.includes("already known")) {
      console.error("This transaction was already submitted");
      console.error("Check PolygonScan for your deployment transaction");
    } else if (error.message.includes("network")) {
      console.error("Network connection issue - check your RPC URL and internet connection");
    }
    
    process.exit(1);
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
