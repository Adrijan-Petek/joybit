const fs = require('fs');
const path = require('path');

// Contract names to extract
const contracts = ['Treasury', 'Match3Game', 'CardGame', 'DailyClaim', 'AchievementNFT'];

// Output directory
const outputDir = path.join(__dirname, '..', 'lib', 'contracts', 'extracted-abis');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🔍 Extracting ABIs from compiled contracts...\n');

contracts.forEach(contractName => {
  try {
    const artifactPath = path.join(
      __dirname,
      '..',
      'artifacts',
      'contracts',
      `${contractName}.sol`,
      `${contractName}.json`
    );

    if (!fs.existsSync(artifactPath)) {
      console.log(`❌ Artifact not found for ${contractName}`);
      return;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;

    // Write ABI to file
    const outputPath = path.join(outputDir, `${contractName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));

    console.log(`✅ Extracted ${contractName} ABI (${abi.length} functions)`);
  } catch (error) {
    console.log(`❌ Error extracting ${contractName}: ${error.message}`);
  }
});

console.log('\n✨ ABI extraction complete!');
console.log(`📁 ABIs saved to: ${outputDir}`);
