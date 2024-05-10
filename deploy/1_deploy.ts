import { deployments, ethers } from 'hardhat';

import {
  api3TokenAddress,
  deriveIrrevocableVestingAddress,
  ERC20__factory,
  type IrrevocableVestingFactory,
  type ERC20,
} from '../src/index';

module.exports = async () => {
  const { deploy, log } = deployments;
  const [deployer] = await ethers.getSigners();

  const { address: irrevocableVestingFactoryAddress, abi: irrevocableVestingFactoryAbi } = await deploy(
    'IrrevocableVestingFactory',
    {
      from: deployer!.address,
      args: [api3TokenAddress],
      log: true,
      deterministicDeployment: ethers.ZeroHash,
    }
  );

  const exampleVesting = {
    startTimestamp: 1,
    endTimestamp: 2,
    amount: 1,
  };

  const exampleIrrevocableVestingAddress = deriveIrrevocableVestingAddress(
    irrevocableVestingFactoryAddress,
    deployer!.address,
    exampleVesting.startTimestamp,
    exampleVesting.endTimestamp,
    exampleVesting.amount
  );

  if ((await ethers.provider.getCode(exampleIrrevocableVestingAddress)) === '0x') {
    log(`Deploying example IrrevocableVesting at ${exampleIrrevocableVestingAddress}`);
    const api3Token = new ethers.Contract(api3TokenAddress, ERC20__factory.abi, deployer) as unknown as ERC20;
    if ((await api3Token.allowance(deployer!.address, irrevocableVestingFactoryAddress)) < exampleVesting.amount) {
      log('Approving 1 (Wei) API3 to IrrevocableVestingFactory');
      await api3Token.approve(irrevocableVestingFactoryAddress, exampleVesting.amount);
    }
    const irrevocableVestingFactory = new ethers.Contract(
      irrevocableVestingFactoryAddress,
      irrevocableVestingFactoryAbi,
      deployer
    ) as unknown as IrrevocableVestingFactory;
    await irrevocableVestingFactory.deployIrrevocableVesting(
      deployer!.address,
      exampleVesting.startTimestamp,
      exampleVesting.endTimestamp,
      exampleVesting.amount
    );
  }
};
module.exports.tags = ['deploy'];
