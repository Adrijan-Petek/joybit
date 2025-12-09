const fs = require('fs');
const path = require('path');

const contracts = [
  'JoybitGame',
  'CardGame',
  'DailyClaim',
  'BoosterShop',
  'Treasury',
  'TestERC20',
  'JoybitAccessControl'
];

let output = '';

contracts.forEach(name => {
  const artifactPath = path.join(__dirname, `artifacts/contracts/${name}.sol/${name}.json`);
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = JSON.stringify(artifact.abi, null, 2);
    const constName = name.replace(/([A-Z])/g, '_$1').toUpperCase().substring(1) + '_ABI';
    output += `export const ${constName} = ${abi} as const\n\n`;
  }
});

// Special case for TestERC20 (JoybitToken)
const tokenPath = path.join(__dirname, 'artifacts/contracts/mocks/TestERC20.sol/TestERC20.json');
if (fs.existsSync(tokenPath)) {
  const artifact = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const abi = JSON.stringify(artifact.abi, null, 2);
  output += `export const JOYBIT_TOKEN_ABI = ${abi} as const\n\n`;
}

// Special case for AccessControl
const accessPath = path.join(__dirname, 'artifacts/contracts/AccessControl.sol/JoybitAccessControl.json');
if (fs.existsSync(accessPath)) {
  const artifact = JSON.parse(fs.readFileSync(accessPath, 'utf8'));
  const abi = JSON.stringify(artifact.abi, null, 2);
  output += `export const ACCESS_CONTROL_ABI = ${abi} as const\n\n`;
}

// GameSettings
const settingsPath = path.join(__dirname, 'artifacts/contracts/GameSettings.sol/GameSettings.json');
if (fs.existsSync(settingsPath)) {
  const artifact = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const abi = JSON.stringify(artifact.abi, null, 2);
  output += `export const GAME_SETTINGS_ABI = ${abi} as const\n`;
}

fs.writeFileSync(path.join(__dirname, 'lib/contracts/abis.ts'), output);
console.log('✅ ABIs extracted successfully!');
