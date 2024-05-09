import { deployments, ethers, network } from 'hardhat';

const api3TokenAddress = '0x0b38210ea11411557c13457D4dA7dC6ea731B88a';

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
