import * as fs from 'node:fs';
import * as path from 'node:path';

import { go } from '@api3/promise-utils';
import { config, deployments, ethers } from 'hardhat';

// https://github.com/Arachnid/deterministic-deployment-proxy/tree/be3c5974db5028d502537209329ff2e730ed336c#proxy-address
const CREATE2_FACTORY_ADDRESS = '0x4e59b44847b379578588920cA78FbF26c0B4956C';

async function main() {
  const network = 'ethereum';
  const contractName = 'IrrevocableVestingFactory';
  const provider = new ethers.JsonRpcProvider((config.networks[network] as any).url);
  const deployment = JSON.parse(fs.readFileSync(path.join('deployments', network, `${contractName}.json`), 'utf8'));
  const artifact = await deployments.getArtifact(contractName);
  const constructor = artifact.abi.find((method) => method.type === 'constructor');
  const expectedEncodedConstructorArguments = constructor
    ? ethers.AbiCoder.defaultAbiCoder().encode(
        constructor.inputs.map((input: any) => input.type),
        deployment.args
      )
    : '0x';
  const salt = ethers.ZeroHash;
  const expectedDeterministicDeploymentAddress = ethers.getCreate2Address(
    CREATE2_FACTORY_ADDRESS,
    salt,
    ethers.solidityPackedKeccak256(['bytes', 'bytes'], [artifact.bytecode, expectedEncodedConstructorArguments])
  );
  if (deployment.address === expectedDeterministicDeploymentAddress) {
    const goFetchContractCode = await go(async () => provider.getCode(deployment.address), {
      retries: 5,
      attemptTimeoutMs: 10_000,
      totalTimeoutMs: 50_000,
      delay: {
        type: 'random',
        minDelayMs: 2000,
        maxDelayMs: 5000,
      },
    });
    if (!goFetchContractCode.success || !goFetchContractCode.data) {
      throw new Error(`${network} ${contractName} (deterministic) contract code could not be fetched`);
    }
    if (goFetchContractCode.data === '0x') {
      throw new Error(`${network} ${contractName} (deterministic) contract code does not exist`);
    }
  } else {
    throw new Error(`${network} ${contractName} is not deployed deterministically`);
  }
}

/* eslint-disable */
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
