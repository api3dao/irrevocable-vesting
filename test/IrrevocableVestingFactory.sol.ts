import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import * as helpers from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { artifacts, ethers } from 'hardhat';

import { deriveIrrevocableVestingAddress } from '../src/index';

import { getVestingParameters } from './IrrevocableVesting.sol';

describe('IrrevocableVestingFactory', function () {
  async function deployIrrevocableVestingFactory() {
    const roleNames = ['deployer', 'beneficiary', 'randomPerson'];
    const accounts = await ethers.getSigners();
    const roles: Record<string, HardhatEthersSigner> = roleNames.reduce((acc, roleName, index) => {
      return { ...acc, [roleName]: accounts[index] };
    }, {});
    const vestingParameters = getVestingParameters();
    const MockApi3TokenFactory = await ethers.getContractFactory('MockApi3Token', roles.deployer);
    const mockApi3Token = await MockApi3TokenFactory.deploy();
    const IrrevocableVestingFactoryFactory = await ethers.getContractFactory(
      'IrrevocableVestingFactory',
      roles.deployer
    );
    const irrevocableVestingFactory = await IrrevocableVestingFactoryFactory.deploy(mockApi3Token.getAddress());
    return { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory };
  }

  describe('constructor', function () {
    context('Api3Token address is not zero', function () {
      it('deploys with initialized IrrevocableVesting implementation', async function () {
        const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } = await helpers.loadFixture(
          deployIrrevocableVestingFactory
        );
        expect(await irrevocableVestingFactory.api3Token()).to.equal(await mockApi3Token.getAddress());
        const irrevocableVestingImplementationAddress =
          await irrevocableVestingFactory.irrevocableVestingImplementation();
        expect(irrevocableVestingImplementationAddress).to.equal(
          ethers.getCreateAddress({ from: await irrevocableVestingFactory.getAddress(), nonce: 1 })
        );
        const irrevocableVestingContractFactory = await ethers.getContractFactory('IrrevocableVesting', roles.deployer);
        const eoaDeployedIrrevocableVesting = await irrevocableVestingContractFactory.deploy(
          mockApi3Token.getAddress()
        );
        expect(await ethers.provider.getCode(irrevocableVestingImplementationAddress)).to.equal(
          await ethers.provider.getCode(await eoaDeployedIrrevocableVesting.getAddress())
        );

        const IrrevocableVesting = await artifacts.readArtifact('IrrevocableVesting');
        const irrevocableVestingImplementation: any = new ethers.Contract(
          irrevocableVestingImplementationAddress,
          IrrevocableVesting.abi,
          roles.deployer
        );
        expect(await irrevocableVestingImplementation.api3Token()).to.equal(await mockApi3Token.getAddress());
        expect(await irrevocableVestingImplementation.beneficiary()).to.equal(
          '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'
        );
        await expect(
          irrevocableVestingImplementation.initialize(
            roles.beneficiary!.address,
            vestingParameters.startTimestamp,
            vestingParameters.endTimestamp,
            vestingParameters.amount
          )
        ).to.be.revertedWith('Already initialized');
      });
    });
    context('Api3Token address is zero', function () {
      it('reverts', async function () {
        const { roles } = await helpers.loadFixture(deployIrrevocableVestingFactory);
        const IrrevocableVestingFactoryFactory = await ethers.getContractFactory(
          'IrrevocableVestingFactory',
          roles.deployer
        );
        await expect(IrrevocableVestingFactoryFactory.deploy(ethers.ZeroAddress)).to.be.revertedWith(
          'Api3Token address zero'
        );
      });
    });
  });

  describe('deployIrrevocableVesting', function () {
    context('Amount is not zero', function () {
      context('Sender has approved at least the vesting amount', function () {
        context('Sender owns at least the vesting amount', function () {
          context('Beneficiary address is not zero', function () {
            context('Start timestamp is not zero', function () {
              context('End is later than start', function () {
                context('Time between initialization and vesting end does not exceed the limit', function () {
                  context('Same arguments were not used in a previous deployment', function () {
                    it('deploys initialized IrrevocableVesting', async function () {
                      const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } =
                        await helpers.loadFixture(deployIrrevocableVestingFactory);
                      const calculatedIrrevocableVestingAddress = deriveIrrevocableVestingAddress(
                        await irrevocableVestingFactory.getAddress(),
                        roles.beneficiary!.address,
                        vestingParameters.startTimestamp,
                        vestingParameters.endTimestamp,
                        vestingParameters.amount
                      );

                      await mockApi3Token
                        .connect(roles.deployer)
                        .approve(irrevocableVestingFactory.getAddress(), vestingParameters.amount);
                      const irrevocableVestingAddress = await irrevocableVestingFactory
                        .connect(roles.deployer)
                        .deployIrrevocableVesting.staticCall(
                          roles.beneficiary!.address,
                          vestingParameters.startTimestamp,
                          vestingParameters.endTimestamp,
                          vestingParameters.amount
                        );
                      expect(irrevocableVestingAddress).to.equal(calculatedIrrevocableVestingAddress);

                      await expect(
                        irrevocableVestingFactory
                          .connect(roles.deployer)
                          .deployIrrevocableVesting(
                            roles.beneficiary!.address,
                            vestingParameters.startTimestamp,
                            vestingParameters.endTimestamp,
                            vestingParameters.amount
                          )
                      )
                        .to.emit(irrevocableVestingFactory, 'DeployedIrrevocableVesting')
                        .withArgs(
                          roles.beneficiary!.address,
                          vestingParameters.startTimestamp,
                          vestingParameters.endTimestamp,
                          vestingParameters.amount
                        );

                      const IrrevocableVesting = await artifacts.readArtifact('IrrevocableVesting');
                      const irrevocableVesting: any = new ethers.Contract(
                        irrevocableVestingAddress,
                        IrrevocableVesting.abi,
                        roles.deployer
                      );
                      expect(await irrevocableVesting.api3Token()).to.equal(await mockApi3Token.getAddress());
                      expect(await irrevocableVesting.beneficiary()).to.equal(roles.beneficiary!.address);
                      const vesting = await irrevocableVesting.vesting();
                      expect(vesting.startTimestamp).to.equal(vestingParameters.startTimestamp);
                      expect(vesting.endTimestamp).to.equal(vestingParameters.endTimestamp);
                      expect(vesting.amount).to.equal(vestingParameters.amount);
                      await expect(
                        irrevocableVesting.initialize(
                          roles.beneficiary!.address,
                          vestingParameters.startTimestamp,
                          vestingParameters.endTimestamp,
                          vestingParameters.amount
                        )
                      ).to.be.revertedWith('Already initialized');
                    });
                  });
                  context('Same arguments were used in a previous deployment', function () {
                    it('reverts', async function () {
                      const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } =
                        await helpers.loadFixture(deployIrrevocableVestingFactory);
                      await mockApi3Token
                        .connect(roles.deployer)
                        .approve(irrevocableVestingFactory.getAddress(), vestingParameters.amount);
                      await irrevocableVestingFactory
                        .connect(roles.deployer)
                        .deployIrrevocableVesting(
                          roles.beneficiary!.address,
                          vestingParameters.startTimestamp,
                          vestingParameters.endTimestamp,
                          vestingParameters.amount
                        );
                      await expect(
                        irrevocableVestingFactory
                          .connect(roles.deployer)
                          .deployIrrevocableVesting(
                            roles.beneficiary!.address,
                            vestingParameters.startTimestamp,
                            vestingParameters.endTimestamp,
                            vestingParameters.amount
                          )
                      ).to.be.revertedWith('ERC1167: create2 failed');
                    });
                  });
                });
                context('Time between initialization and vesting end exceeds the limit', function () {
                  it('reverts', async function () {
                    const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } =
                      await helpers.loadFixture(deployIrrevocableVestingFactory);
                    await mockApi3Token
                      .connect(roles.deployer)
                      .approve(irrevocableVestingFactory.getAddress(), vestingParameters.amount);
                    const currentTimestamp = await helpers.time.latest();
                    const nextTimestamp = currentTimestamp + 1;
                    await helpers.time.setNextBlockTimestamp(nextTimestamp);
                    const startTimestamp = nextTimestamp;
                    const endTimestamp = nextTimestamp + 5 * 365 * 24 * 60 * 60 + 1;
                    await expect(
                      irrevocableVestingFactory
                        .connect(roles.deployer)
                        .deployIrrevocableVesting(
                          roles.beneficiary!.address,
                          startTimestamp,
                          endTimestamp,
                          vestingParameters.amount
                        )
                    ).to.be.revertedWith('End is too far in the future');
                  });
                });
              });
              context('End is not later than start', function () {
                it('reverts', async function () {
                  const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } =
                    await helpers.loadFixture(deployIrrevocableVestingFactory);
                  await mockApi3Token
                    .connect(roles.deployer)
                    .approve(irrevocableVestingFactory.getAddress(), vestingParameters.amount);
                  await expect(
                    irrevocableVestingFactory
                      .connect(roles.deployer)
                      .deployIrrevocableVesting(
                        roles.beneficiary!.address,
                        vestingParameters.startTimestamp,
                        vestingParameters.startTimestamp,
                        vestingParameters.amount
                      )
                  ).to.be.revertedWith('End not later than start');
                });
              });
            });
            context('Start timestamp is zero', function () {
              it('reverts', async function () {
                const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } =
                  await helpers.loadFixture(deployIrrevocableVestingFactory);
                await mockApi3Token
                  .connect(roles.deployer)
                  .approve(irrevocableVestingFactory.getAddress(), vestingParameters.amount);
                await expect(
                  irrevocableVestingFactory
                    .connect(roles.deployer)
                    .deployIrrevocableVesting(
                      roles.beneficiary!.address,
                      0,
                      vestingParameters.endTimestamp,
                      vestingParameters.amount
                    )
                ).to.be.revertedWith('Start timestamp zero');
              });
            });
          });
          context('Beneficiary address is zero', function () {
            it('reverts', async function () {
              const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } = await helpers.loadFixture(
                deployIrrevocableVestingFactory
              );
              await mockApi3Token
                .connect(roles.deployer)
                .approve(irrevocableVestingFactory.getAddress(), vestingParameters.amount);
              await expect(
                irrevocableVestingFactory
                  .connect(roles.deployer)
                  .deployIrrevocableVesting(
                    ethers.ZeroAddress,
                    vestingParameters.startTimestamp,
                    vestingParameters.endTimestamp,
                    vestingParameters.amount
                  )
              ).to.be.revertedWith('Beneficiary address zero');
            });
          });
        });
        context('Sender owns at least the vesting amount', function () {
          it('reverts', async function () {
            const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } = await helpers.loadFixture(
              deployIrrevocableVestingFactory
            );
            await mockApi3Token
              .connect(roles.deployer)
              .approve(irrevocableVestingFactory.getAddress(), vestingParameters.amount);
            const senderApi3TokenBalance = await mockApi3Token.balanceOf(roles.deployer!.address);
            await mockApi3Token
              .connect(roles.deployer)
              .transfer(roles.randomPerson!.address, senderApi3TokenBalance - vestingParameters.amount + 1n);
            await expect(
              irrevocableVestingFactory
                .connect(roles.deployer)
                .deployIrrevocableVesting(
                  roles.beneficiary!.address,
                  vestingParameters.startTimestamp,
                  vestingParameters.endTimestamp,
                  vestingParameters.amount
                )
            ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
          });
        });
      });
      context('Sender has not approved at least the vesting amount', function () {
        it('reverts', async function () {
          const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } = await helpers.loadFixture(
            deployIrrevocableVestingFactory
          );
          await mockApi3Token
            .connect(roles.deployer)
            .approve(irrevocableVestingFactory.getAddress(), vestingParameters.amount - 1n);
          await expect(
            irrevocableVestingFactory
              .connect(roles.deployer)
              .deployIrrevocableVesting(
                roles.beneficiary!.address,
                vestingParameters.startTimestamp,
                vestingParameters.endTimestamp,
                vestingParameters.amount
              )
          ).to.be.revertedWith('ERC20: insufficient allowance');
        });
      });
    });
    context('Amount is zero', function () {
      it('reverts', async function () {
        const { roles, vestingParameters, irrevocableVestingFactory } = await helpers.loadFixture(
          deployIrrevocableVestingFactory
        );
        await expect(
          irrevocableVestingFactory
            .connect(roles.deployer)
            .deployIrrevocableVesting(
              roles.beneficiary!.address,
              vestingParameters.startTimestamp,
              vestingParameters.endTimestamp,
              0
            )
        ).to.be.revertedWith('Amount zero');
      });
    });
  });

  describe('predictIrrevocableVesting', function () {
    it('predicts IrrevocableVesting address', async function () {
      const { roles, vestingParameters, irrevocableVestingFactory } = await helpers.loadFixture(
        deployIrrevocableVestingFactory
      );
      expect(
        await irrevocableVestingFactory.predictIrrevocableVesting(
          roles.beneficiary!.address,
          vestingParameters.startTimestamp,
          vestingParameters.endTimestamp,
          vestingParameters.amount
        )
      ).to.equal(
        deriveIrrevocableVestingAddress(
          await irrevocableVestingFactory.getAddress(),
          roles.beneficiary!.address,
          vestingParameters.startTimestamp,
          vestingParameters.endTimestamp,
          vestingParameters.amount
        )
      );
    });
  });
});
