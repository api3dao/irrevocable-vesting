const hre = require('hardhat');
const references = require('../deployments/references.json');

module.exports = async ({ deployments }) => {
  const IrrevocableVestingFactory = await deployments.get('IrrevocableVestingFactory');
  await hre.run('verify:verify', {
    address: IrrevocableVestingFactory.address,
    constructorArguments: [references.Api3Token, references.Api3Pool],
  });
  const irrevocableVestingFactory = new hre.ethers.Contract(
    IrrevocableVestingFactory.address,
    IrrevocableVestingFactory.abi,
    hre.ethers.provider
  );
  const irrevocableVestingImplementationAddress = await irrevocableVestingFactory.irrevocableVestingImplementation();
  await hre.run('verify:verify', {
    address: irrevocableVestingImplementationAddress,
    constructorArguments: [references.Api3Token, references.Api3Pool],
  });
};
module.exports.tags = ['verify'];
