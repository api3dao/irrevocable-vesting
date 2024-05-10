import { deployments, ethers, run } from 'hardhat';

import { api3TokenAddress } from '../src/index';

module.exports = async () => {
  const IrrevocableVestingFactory = await deployments.get('IrrevocableVestingFactory');
  await run('verify:verify', {
    address: IrrevocableVestingFactory.address,
    constructorArguments: [api3TokenAddress],
  });

  const irrevocableVestingImplementationAddress = ethers.getCreateAddress({
    from: IrrevocableVestingFactory.address,
    nonce: 1,
  });
  await run('verify:verify', {
    address: irrevocableVestingImplementationAddress,
    constructorArguments: [api3TokenAddress],
  });
};
module.exports.tags = ['verify'];
