import * as ethers from 'ethers';
import type { AddressLike, BigNumberish } from 'ethers';

export const api3TokenAddress = '0x0b38210ea11411557c13457D4dA7dC6ea731B88a';

export function deriveIrrevocableVestingAddress(
  irrevocableVestingFactoryAddress: AddressLike,
  beneficiaryAddress: AddressLike,
  startTimestamp: BigNumberish,
  endTimestamp: BigNumberish,
  amount: BigNumberish
) {
  const irrevocableVestingImplementationAddress = ethers.getCreateAddress({
    from: irrevocableVestingFactoryAddress as string,
    nonce: 1,
  });
  return ethers.getCreate2Address(
    irrevocableVestingFactoryAddress as string,
    ethers.solidityPackedKeccak256(
      ['address', 'uint32', 'uint32', 'uint192'],
      [beneficiaryAddress, startTimestamp, endTimestamp, amount]
    ),
    ethers.solidityPackedKeccak256(
      ['bytes', 'bytes', 'bytes', 'bytes'],
      [
        '0x3d602d80600a3d3981f3', // This is an optimized constructor implementation
        '0x363d3d373d3d3d363d73', // The rest is the minimal proxy contract as specified by EIP-1167
        irrevocableVestingImplementationAddress,
        '0x5af43d82803e903d91602b57fd5bf3',
      ]
    )
  );
}
