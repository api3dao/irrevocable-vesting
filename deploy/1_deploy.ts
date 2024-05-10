import { deployments, ethers, network } from 'hardhat';

const { api3TokenAddress } = require('../src/index');

module.exports = async () => {
  const { deploy, log } = deployments;
  const [deployer] = await ethers.getSigners();

  const irrevocableVestingFactory = await deploy('IrrevocableVestingFactory', {
    from: deployer!.address,
    args: [api3TokenAddress],
    log: true,
    deterministicDeployment: ethers.ZeroHash,
  });
};
module.exports.tags = ['deploy'];
