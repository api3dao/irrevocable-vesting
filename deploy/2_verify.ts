import { config, deployments, ethers, getUnnamedAccounts, network, run } from 'hardhat';

const { api3TokenAddress } = require('../src/index');

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
