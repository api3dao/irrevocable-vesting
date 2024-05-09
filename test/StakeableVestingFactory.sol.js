const { ethers, artifacts } = require('hardhat');
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const { getVestingParameters } = require('./IrrevocableVesting.sol');
const { deriveIrrevocableVestingAddress } = require('../src');

describe('IrrevocableVestingFactory', function () {
  async function deployIrrevocableVestingFactory() {
    const accounts = await ethers.getSigners();
    const roles = {
      deployer: accounts[0],
      mockTimelockManager: accounts[1],
      owner: accounts[2],
      beneficiary: accounts[3],
      randomPerson: accounts[9],
    };
    const vestingParameters = getVestingParameters();
    const MockApi3TokenFactory = await ethers.getContractFactory('MockApi3Token', roles.deployer);
    const mockApi3Token = await MockApi3TokenFactory.deploy();
    await mockApi3Token
      .connect(roles.deployer)
      .transfer(roles.owner.address, await mockApi3Token.balanceOf(roles.deployer.address));
    const Api3PoolFactory = await ethers.getContractFactory('Api3Pool', roles.deployer);
    const api3Pool = await Api3PoolFactory.deploy(mockApi3Token.address, roles.mockTimelockManager.address);
    const IrrevocableVestingFactoryFactory = await ethers.getContractFactory(
      'IrrevocableVestingFactory',
      roles.deployer
    );
    const irrevocableVestingFactory = await IrrevocableVestingFactoryFactory.deploy(
      mockApi3Token.address,
      api3Pool.address
    );
    return { roles, vestingParameters, mockApi3Token, api3Pool, irrevocableVestingFactory };
  }

  describe('constructor', function () {
    context('Api3Token address is not zero', function () {
      context('Api3Pool address is not zero', function () {
        it('deploys with initialized IrrevocableVesting implementation', async function () {
          const { roles, vestingParameters, mockApi3Token, api3Pool, irrevocableVestingFactory } =
            await helpers.loadFixture(deployIrrevocableVestingFactory);
          expect(await irrevocableVestingFactory.api3Token()).to.equal(mockApi3Token.address);
          const irrevocableVestingImplementationAddress =
            await irrevocableVestingFactory.irrevocableVestingImplementation();
          const eoaDeployedIrrevocableVesting = await (
            await ethers.getContractFactory('IrrevocableVesting', roles.deployer)
          ).deploy(mockApi3Token.address, api3Pool.address);
          expect(await ethers.provider.getCode(irrevocableVestingImplementationAddress)).to.equal(
            await ethers.provider.getCode(eoaDeployedIrrevocableVesting.address)
          );

          const IrrevocableVesting = await artifacts.readArtifact('IrrevocableVesting');
          const irrevocableVestingImplementation = new ethers.Contract(
            irrevocableVestingImplementationAddress,
            IrrevocableVesting.abi,
            roles.deployer
          );
          expect(await irrevocableVestingImplementation.api3Token()).to.equal(mockApi3Token.address);
          expect(await irrevocableVestingImplementation.api3Pool()).to.equal(api3Pool.address);
          expect(await irrevocableVestingImplementation.owner()).to.equal(ethers.constants.AddressZero);
          expect(await irrevocableVestingImplementation.beneficiary()).to.equal(
            '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'
          );
          await expect(
            irrevocableVestingImplementation.initialize(
              roles.owner.address,
              roles.beneficiary.address,
              vestingParameters.startTimestamp,
              vestingParameters.endTimestamp,
              vestingParameters.amount
            )
          ).to.be.revertedWith('Already initialized');
        });
      });
      context('Api3Pool address is zero', function () {
        it('reverts', async function () {
          const { roles, mockApi3Token } = await helpers.loadFixture(deployIrrevocableVestingFactory);
          const IrrevocableVestingFactoryFactory = await ethers.getContractFactory(
            'IrrevocableVestingFactory',
            roles.deployer
          );
          await expect(
            IrrevocableVestingFactoryFactory.deploy(mockApi3Token.address, ethers.constants.AddressZero)
          ).to.be.revertedWith('Api3Pool address zero');
        });
      });
    });
    context('Api3Token address is zero', function () {
      it('reverts', async function () {
        const { roles, api3Pool } = await helpers.loadFixture(deployIrrevocableVestingFactory);
        const IrrevocableVestingFactoryFactory = await ethers.getContractFactory(
          'IrrevocableVestingFactory',
          roles.deployer
        );
        await expect(
          IrrevocableVestingFactoryFactory.deploy(ethers.constants.AddressZero, api3Pool.address)
        ).to.be.revertedWith('Api3Token address zero');
      });
    });
  });

  describe('deployIrrevocableVesting', function () {
    context('Amount is not zero', function () {
      context('Owner has approved at least the vesting amount', function () {
        context('Owner owns at least the vesting amount', function () {
          context('Beneficiary address is not zero', function () {
            context('Start timestamp is not zero', function () {
              context('End is later than start', function () {
                context('Time between initialization and vesting end does not exceed the limit', function () {
                  context('Same arguments were not used in a previous deployment', function () {
                    it('deploys initialized IrrevocableVesting', async function () {
                      const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } =
                        await helpers.loadFixture(deployIrrevocableVestingFactory);
                      const calculatedIrrevocableVestingAddress = deriveIrrevocableVestingAddress(
                        irrevocableVestingFactory.address,
                        await irrevocableVestingFactory.irrevocableVestingImplementation(),
                        roles.beneficiary.address,
                        vestingParameters.startTimestamp,
                        vestingParameters.endTimestamp,
                        vestingParameters.amount,
                        roles.owner.address
                      );

                      await mockApi3Token
                        .connect(roles.owner)
                        .approve(irrevocableVestingFactory.address, vestingParameters.amount);
                      const irrevocableVestingAddress = await irrevocableVestingFactory
                        .connect(roles.owner)
                        .callStatic.deployIrrevocableVesting(
                          roles.beneficiary.address,
                          vestingParameters.startTimestamp,
                          vestingParameters.endTimestamp,
                          vestingParameters.amount
                        );
                      expect(irrevocableVestingAddress).to.equal(calculatedIrrevocableVestingAddress);

                      await expect(
                        irrevocableVestingFactory
                          .connect(roles.owner)
                          .deployIrrevocableVesting(
                            roles.beneficiary.address,
                            vestingParameters.startTimestamp,
                            vestingParameters.endTimestamp,
                            vestingParameters.amount
                          )
                      )
                        .to.emit(irrevocableVestingFactory, 'DeployedIrrevocableVesting')
                        .withArgs(
                          roles.owner.address,
                          roles.beneficiary.address,
                          vestingParameters.startTimestamp,
                          vestingParameters.endTimestamp,
                          vestingParameters.amount
                        );

                      const IrrevocableVesting = await artifacts.readArtifact('IrrevocableVesting');
                      const irrevocableVesting = new ethers.Contract(
                        irrevocableVestingAddress,
                        IrrevocableVesting.abi,
                        roles.deployer
                      );
                      expect(await irrevocableVesting.api3Token()).to.equal(mockApi3Token.address);
                      expect(await irrevocableVesting.owner()).to.equal(roles.owner.address);
                      expect(await irrevocableVesting.beneficiary()).to.equal(roles.beneficiary.address);
                      const vesting = await irrevocableVesting.vesting();
                      expect(vesting.startTimestamp).to.equal(vestingParameters.startTimestamp);
                      expect(vesting.endTimestamp).to.equal(vestingParameters.endTimestamp);
                      expect(vesting.amount).to.equal(vestingParameters.amount);
                      await expect(
                        irrevocableVesting.initialize(
                          roles.owner.address,
                          roles.beneficiary.address,
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
                        .connect(roles.owner)
                        .approve(irrevocableVestingFactory.address, vestingParameters.amount);
                      await irrevocableVestingFactory
                        .connect(roles.owner)
                        .deployIrrevocableVesting(
                          roles.beneficiary.address,
                          vestingParameters.startTimestamp,
                          vestingParameters.endTimestamp,
                          vestingParameters.amount
                        );
                      await expect(
                        irrevocableVestingFactory
                          .connect(roles.owner)
                          .deployIrrevocableVesting(
                            roles.beneficiary.address,
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
                      .connect(roles.owner)
                      .approve(irrevocableVestingFactory.address, vestingParameters.amount);
                    const currentTimestamp = await helpers.time.latest();
                    const nextTimestamp = currentTimestamp + 1;
                    await helpers.time.setNextBlockTimestamp(nextTimestamp);
                    const startTimestamp = nextTimestamp;
                    const endTimestamp = nextTimestamp + 5 * 365 * 24 * 60 * 60 + 1;
                    await expect(
                      irrevocableVestingFactory
                        .connect(roles.owner)
                        .deployIrrevocableVesting(
                          roles.beneficiary.address,
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
                    .connect(roles.owner)
                    .approve(irrevocableVestingFactory.address, vestingParameters.amount);
                  await expect(
                    irrevocableVestingFactory
                      .connect(roles.owner)
                      .deployIrrevocableVesting(
                        roles.beneficiary.address,
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
                  .connect(roles.owner)
                  .approve(irrevocableVestingFactory.address, vestingParameters.amount);
                await expect(
                  irrevocableVestingFactory
                    .connect(roles.owner)
                    .deployIrrevocableVesting(
                      roles.beneficiary.address,
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
                .connect(roles.owner)
                .approve(irrevocableVestingFactory.address, vestingParameters.amount);
              await expect(
                irrevocableVestingFactory
                  .connect(roles.owner)
                  .deployIrrevocableVesting(
                    ethers.constants.AddressZero,
                    vestingParameters.startTimestamp,
                    vestingParameters.endTimestamp,
                    vestingParameters.amount
                  )
              ).to.be.revertedWith('Beneficiary address zero');
            });
          });
        });
        context('Owner owns at least the vesting amount', function () {
          it('reverts', async function () {
            const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } = await helpers.loadFixture(
              deployIrrevocableVestingFactory
            );
            await mockApi3Token
              .connect(roles.owner)
              .approve(irrevocableVestingFactory.address, vestingParameters.amount);
            const ownerApi3TokenBalance = await mockApi3Token.balanceOf(roles.owner.address);
            await mockApi3Token
              .connect(roles.owner)
              .transfer(roles.randomPerson.address, ownerApi3TokenBalance.sub(vestingParameters.amount).add(1));
            await expect(
              irrevocableVestingFactory
                .connect(roles.owner)
                .deployIrrevocableVesting(
                  roles.beneficiary.address,
                  vestingParameters.startTimestamp,
                  vestingParameters.endTimestamp,
                  vestingParameters.amount
                )
            ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
          });
        });
      });
      context('Owner has not approved at least the vesting amount', function () {
        it('reverts', async function () {
          const { roles, vestingParameters, mockApi3Token, irrevocableVestingFactory } = await helpers.loadFixture(
            deployIrrevocableVestingFactory
          );
          await mockApi3Token
            .connect(roles.owner)
            .approve(irrevocableVestingFactory.address, vestingParameters.amount.sub(1));
          await expect(
            irrevocableVestingFactory
              .connect(roles.owner)
              .deployIrrevocableVesting(
                roles.beneficiary.address,
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
            .connect(roles.owner)
            .deployIrrevocableVesting(
              roles.beneficiary.address,
              vestingParameters.startTimestamp,
              vestingParameters.endTimestamp,
              0
            )
        ).to.be.revertedWith('Amount zero');
      });
    });
  });
});
