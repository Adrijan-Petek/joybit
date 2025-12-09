const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '..', 'lib', 'contracts', 'extracted-abis');
const outputFile = path.join(__dirname, '..', 'lib', 'contracts', 'abis.ts');

const contracts = [
  { name: 'Treasury', export: 'TREASURY_ABI' },
  { name: 'Match3Game', export: 'MATCH3_GAME_ABI' },
  { name: 'CardGame', export: 'CARD_GAME_ABI' },
  { name: 'DailyClaim', export: 'DAILY_CLAIM_ABI' }
];

console.log('📝 Generating abis.ts file...\n');

let output = '// Auto-generated ABIs from contracts\n\n';

contracts.forEach(({ name, export: exportName }) => {
  const abiPath = path.join(inputDir, `${name}.json`);
  
  if (!fs.existsSync(abiPath)) {
    console.log(`❌ ABI file not found: ${name}.json`);
    return;
  }

  const abi = fs.readFileSync(abiPath, 'utf8');
  output += `export const ${exportName} = ${abi} as const;\n\n`;
  console.log(`✅ Added ${name} (${exportName})`);
});

fs.writeFileSync(outputFile, output);

console.log(`\n✨ Generated abis.ts successfully!`);
console.log(`📁 Output: ${outputFile}`);
