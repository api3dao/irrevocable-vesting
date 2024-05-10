const { deployments, ethers } = require('hardhat');
const { deriveIrrevocableVestingAddress } = require('../src');

async function main() {
  const deployment = await deployments.get('IrrevocableVestingFactory');
  const irrevocableVestingImplementationAddress = ethers.getCreateAddress({ from: deployment.address, nonce: 0 });
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
