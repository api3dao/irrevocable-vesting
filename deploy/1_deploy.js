const hre = require('hardhat');
const references = require('../deployments/references.json');

module.exports = async ({ getUnnamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const accounts = await getUnnamedAccounts();

  const irrevocableVestingFactory = await deploy('IrrevocableVestingFactory', {
    from: accounts[0],
    args: [references.Api3Token, references.Api3Pool],
    log: true,
    deterministicDeployment: hre.ethers.constants.HashZero,
  });
  log(`Deployed IrrevocableVestingFactory at ${irrevocableVestingFactory.address}`);
};
module.exports.tags = ['deploy'];
