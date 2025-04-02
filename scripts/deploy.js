const hre = require("hardhat");

async function main() {
  console.log("Deploying ArcadeManager contract...");

  // Address of the BULL token on the network
  // Using the provided address for the $BULL token
  const bullTokenAddress = "0x9f95e17b2668afe01f8fbd157068b0a4405cc08d";
  
  // Deploy the ArcadeManager contract
  const ArcadeManager = await hre.ethers.getContractFactory("ArcadeManager");
  const arcadeManager = await ArcadeManager.deploy(bullTokenAddress);

  await arcadeManager.deployed();

  console.log("ArcadeManager deployed to:", arcadeManager.address);
  console.log("BULL token address:", bullTokenAddress);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
