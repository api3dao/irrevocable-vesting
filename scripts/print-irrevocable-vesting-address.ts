import { deployments, ethers } from 'hardhat';

import { deriveIrrevocableVestingAddress } from '../src';

async function main() {
  const deployment = await deployments.get('IrrevocableVestingFactory');
  const irrevocableVestingImplementationAddress = ethers.getCreateAddress({ from: deployment.address, nonce: 0 });
  if (!process.env.BENEFICIARY) {
    throw new Error('Environment variable BENEFICIARY is not defined');
  }
  if (!process.env.START_TIMESTAMP) {
    throw new Error('Environment variable START_TIMESTAMP is not defined');
  }
  if (!process.env.END_TIMESTAMP) {
    throw new Error('Environment variable END_TIMESTAMP is not defined');
  }
  if (!process.env.AMOUNT) {
    throw new Error('Environment variable AMOUNT is not defined');
  }
  // eslint-disable-next-line no-console
  console.log(
    deriveIrrevocableVestingAddress(
      deployment.address,
      irrevocableVestingImplementationAddress,
      process.env.BENEFICIARY,
      process.env.START_TIMESTAMP,
      process.env.END_TIMESTAMP,
      process.env.AMOUNT
    )
  );
}

/* eslint-disable */
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
