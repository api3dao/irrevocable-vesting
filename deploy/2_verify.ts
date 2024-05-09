import { config, deployments, ethers, getUnnamedAccounts, network, run } from 'hardhat';

const api3TokenAddress = '0x0b38210ea11411557c13457D4dA7dC6ea731B88a';

module.exports = async () => {
  const accounts = await getUnnamedAccounts();
  const [deployer] = await ethers.getSigners();

  const IrrevocableVestingFactory = await deployments.get('IrrevocableVestingFactory');
  await run('verify:verify', {
    address: IrrevocableVestingFactory.address,
    constructorArguments: [api3TokenAddress],
  });
};
module.exports.tags = ['verify'];
