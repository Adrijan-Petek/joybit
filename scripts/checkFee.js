const { ethers } = require('hardhat');

async function main() {
  const gameAddress = '0x398bD08a83C0f0011d1d3eF6ADcBB8fC823FC06b';
  
  const game = await ethers.getContractAt('JoybitGame', gameAddress);
  
  const fee = await game.paidGameFee();
  console.log('Current paidGameFee on contract:', ethers.formatEther(fee), 'ETH');
  console.log('In wei:', fee.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
