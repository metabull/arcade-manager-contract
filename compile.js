const fs = require('fs');
const path = require('path');
const solc = require('solc');

function findImports(importPath) {
  // Map OpenZeppelin imports to node_modules
  if (importPath.startsWith('@openzeppelin/')) {
    const npmPath = path.resolve('node_modules', importPath);
    try {
      return { contents: fs.readFileSync(npmPath, 'utf8') };
    } catch (e) {
      console.error(`Error: Could not find ${npmPath}`);
      return { error: `File not found: ${importPath}` };
    }
  }
  
  // Handle local imports
  try {
    const localPath = path.resolve('contracts', importPath);
    return { contents: fs.readFileSync(localPath, 'utf8') };
  } catch (e) {
    return { error: `File not found: ${importPath}` };
  }
}

function compile(contractName) {
  const contractPath = path.resolve('contracts', `${contractName}.sol`);
  const source = fs.readFileSync(contractPath, 'utf8');
  
  // Create compiler input
  const input = {
    language: 'Solidity',
    sources: {
      [contractName]: {
        content: source
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      },
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  };
  
  console.log(`Compiling ${contractName}...`);
  
  try {
    // Compile the contract
    const output = JSON.parse(
      solc.compile(JSON.stringify(input), { import: findImports })
    );
    
    // Check for errors
    if (output.errors) {
      output.errors.forEach(error => {
        console.error(error.formattedMessage);
      });
      
      // Exit if there are serious errors
      const hasErrors = output.errors.some(e => e.severity === 'error');
      if (hasErrors) {
        console.error('Compilation failed due to errors.');
        process.exit(1);
      }
    }
    
    // Ensure the artifacts directory exists
    const artifactDir = path.resolve('artifacts', 'contracts');
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }
    
    // Write output to file
    const contractOutput = output.contracts[contractName][contractName];
    const artifact = {
      contractName,
      abi: contractOutput.abi,
      bytecode: contractOutput.evm.bytecode.object
    };
    
    fs.writeFileSync(
      path.resolve(artifactDir, `${contractName}.json`),
      JSON.stringify(artifact, null, 2)
    );
    
    console.log(`Successfully compiled ${contractName} to ${path.resolve(artifactDir, `${contractName}.json`)}`);
    return artifact;
  } catch (error) {
    console.error('Compilation error:', error);
    process.exit(1);
  }
}

// Compile all contracts
compile('ArcadeManager');
compile('MockBullToken');