const { ethers, artifacts } = require('hardhat');
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');

module.exports = {
  getVestingParameters,
};

function getVestingParameters() {
  const timestampNow = Math.floor(Date.now() / 1000);
  const timestampOneWeekFromNow = timestampNow + 7 * 24 * 60 * 60;
  const timestampOneWeekAndFourYearsFromNow = timestampOneWeekFromNow + 4 * 365 * 24 * 60 * 60;
  return {
    startTimestamp: timestampOneWeekFromNow,
    endTimestamp: timestampOneWeekAndFourYearsFromNow,
    amount: ethers.utils.parseEther('100' + '000'),
  };
}

describe('IrrevocableVesting', function () {
  async function eoaDeployIrrevocableVesting() {
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
    const IrrevocableVestingFactory = await ethers.getContractFactory('IrrevocableVesting', roles.deployer);
    const irrevocableVesting = await IrrevocableVestingFactory.deploy(mockApi3Token.address, api3Pool.address);
    return { roles, vestingParameters, mockApi3Token, api3Pool, irrevocableVesting };
  }

  async function factoryDeployIrrevocableVesting() {
    const accounts = await ethers.getSigners();
    const roles = {
      deployer: accounts[0],
      owner: accounts[1],
      mockTimelockManager: accounts[2],
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
    await mockApi3Token.connect(roles.owner).approve(irrevocableVestingFactory.address, vestingParameters.amount);
    const irrevocableVestingAddress = await irrevocableVestingFactory
      .connect(roles.owner)
      .callStatic.deployIrrevocableVesting(
        roles.beneficiary.address,
        vestingParameters.startTimestamp,
        vestingParameters.endTimestamp,
        vestingParameters.amount
      );
    await irrevocableVestingFactory
      .connect(roles.owner)
      .deployIrrevocableVesting(
        roles.beneficiary.address,
        vestingParameters.startTimestamp,
        vestingParameters.endTimestamp,
        vestingParameters.amount
      );
    const IrrevocableVesting = await artifacts.readArtifact('IrrevocableVesting');
    const irrevocableVesting = new ethers.Contract(irrevocableVestingAddress, IrrevocableVesting.abi, roles.deployer);
    return { roles, vestingParameters, mockApi3Token, api3Pool, irrevocableVesting };
  }

  describe('constructor', function () {
    context('Api3Token address is not zero', function () {
      context('Api3Pool address is not zero', function () {
        it('constructs uninitializable IrrevocableVesting', async function () {
          const { roles, vestingParameters, mockApi3Token, api3Pool, irrevocableVesting } =
            await helpers.loadFixture(eoaDeployIrrevocableVesting);
          expect(await irrevocableVesting.owner()).to.equal(ethers.constants.AddressZero);
          expect(await irrevocableVesting.api3Token()).to.equal(mockApi3Token.address);
          expect(await irrevocableVesting.api3Pool()).to.equal(api3Pool.address);
          expect(await irrevocableVesting.beneficiary()).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
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
      context('Api3Pool address is zero', function () {
        it('reverts', async function () {
          const { roles, mockApi3Token } = await helpers.loadFixture(eoaDeployIrrevocableVesting);
          const IrrevocableVestingFactory = await ethers.getContractFactory('IrrevocableVesting', roles.deployer);
          await expect(
            IrrevocableVestingFactory.deploy(mockApi3Token.address, ethers.constants.AddressZero)
          ).to.be.revertedWith('Api3Pool address zero');
        });
      });
    });
    context('Api3Token address is zero', function () {
      it('reverts', async function () {
        const { roles, api3Pool } = await helpers.loadFixture(eoaDeployIrrevocableVesting);
        const IrrevocableVestingFactory = await ethers.getContractFactory('IrrevocableVesting', roles.deployer);
        await expect(
          IrrevocableVestingFactory.deploy(ethers.constants.AddressZero, api3Pool.address)
        ).to.be.revertedWith('Api3Token address zero');
      });
    });
  });

  // See IrrevocableVestingFactory tests for the happy path
  describe('initialize', function () {
    context('Owner address is zero', function () {
      it('reverts', async function () {
        const { roles, vestingParameters, mockApi3Token, api3Pool } =
          await helpers.loadFixture(eoaDeployIrrevocableVesting);
        const BadIrrevocableVestingFactoryFactory = await ethers.getContractFactory(
          'BadIrrevocableVestingFactory',
          roles.deployer
        );
        const badIrrevocableVestingFactory = await BadIrrevocableVestingFactoryFactory.deploy(
          mockApi3Token.address,
          api3Pool.address
        );
        await mockApi3Token
          .connect(roles.owner)
          .approve(badIrrevocableVestingFactory.address, vestingParameters.amount);
        await expect(
          badIrrevocableVestingFactory
            .connect(roles.owner)
            .deployIrrevocableVestingWithZeroOwner(
              roles.beneficiary.address,
              vestingParameters.startTimestamp,
              vestingParameters.endTimestamp,
              vestingParameters.amount
            )
        ).to.be.revertedWith('Owner address zero');
      });
    });
    context('Token balance is not equal to vesting amount', function () {
      it('reverts', async function () {
        const { roles, vestingParameters, mockApi3Token, api3Pool } =
          await helpers.loadFixture(eoaDeployIrrevocableVesting);
        const BadIrrevocableVestingFactoryFactory = await ethers.getContractFactory(
          'BadIrrevocableVestingFactory',
          roles.deployer
        );
        const badIrrevocableVestingFactory = await BadIrrevocableVestingFactoryFactory.deploy(
          mockApi3Token.address,
          api3Pool.address
        );
        await expect(
          badIrrevocableVestingFactory
            .connect(roles.owner)
            .deployIrrevocableVestingWithoutTransferringTokens(
              roles.beneficiary.address,
              vestingParameters.startTimestamp,
              vestingParameters.endTimestamp,
              vestingParameters.amount
            )
        ).to.be.revertedWith('Balance is not vesting amount');
      });
    });
  });

  describe('setBeneficiary', function () {
    context('Sender is owner', function () {
      context('Beneficiary address is not zero', function () {
        it('sets beneficiary', async function () {
          const { roles, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
          await expect(irrevocableVesting.connect(roles.owner).setBeneficiary(roles.randomPerson.address))
            .to.emit(irrevocableVesting, 'SetBeneficiary')
            .withArgs(roles.randomPerson.address);
          expect(await irrevocableVesting.beneficiary()).to.equal(roles.randomPerson.address);
        });
      });
      context('Beneficiary address is zero', function () {
        it('reverts', async function () {
          const { roles, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
          await expect(
            irrevocableVesting.connect(roles.owner).setBeneficiary(ethers.constants.AddressZero)
          ).to.be.revertedWith('Beneficiary address zero');
        });
      });
    });
    context('Sender is not owner', function () {
      it('reverts', async function () {
        const { roles, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
        await expect(
          irrevocableVesting.connect(roles.randomPerson).setBeneficiary(roles.randomPerson.address)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
    });
  });

  describe('withdrawAsOwner', function () {
    context('Sender is owner', function () {
      context('Balance is not zero', function () {
        it('withdraws entire balance', async function () {
          const { roles, vestingParameters, mockApi3Token, irrevocableVesting } = await helpers.loadFixture(
            factoryDeployIrrevocableVesting
          );
          const ownerBalanceBeforeWithdrawal = await mockApi3Token.balanceOf(roles.owner.address);
          await expect(irrevocableVesting.connect(roles.owner).withdrawAsOwner())
            .to.emit(irrevocableVesting, 'WithdrawnAsOwner')
            .withArgs(vestingParameters.amount);
          const ownerBalanceAfterWithdrawal = await mockApi3Token.balanceOf(roles.owner.address);
          expect(ownerBalanceAfterWithdrawal.sub(ownerBalanceBeforeWithdrawal)).to.equal(vestingParameters.amount);
          expect(await mockApi3Token.balanceOf(irrevocableVesting.address)).to.equal(0);
        });
      });
      context('Balance is zero', function () {
        it('reverts', async function () {
          const { roles, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
          await irrevocableVesting.connect(roles.owner).withdrawAsOwner();
          await expect(irrevocableVesting.connect(roles.owner).withdrawAsOwner()).to.be.revertedWith(
            'No balance to withdraw'
          );
        });
      });
    });
    context('Sender is not owner', function () {
      it('reverts', async function () {
        const { roles, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
        await expect(irrevocableVesting.connect(roles.randomPerson).withdrawAsOwner()).to.be.revertedWith(
          'Ownable: caller is not the owner'
        );
      });
    });
  });

  describe('withdrawAsBeneficiary', function () {
    context('Sender is beneficiary', function () {
      context('Balance is not zero', function () {
        context('There are vested tokens in balance', function () {
          context('Vested amount is not smaller than balance', function () {
            it('withdraws entire balance', async function () {
              const { roles, vestingParameters, mockApi3Token, irrevocableVesting } = await helpers.loadFixture(
                factoryDeployIrrevocableVesting
              );
              // Deposit half of the balance to the pool
              await irrevocableVesting.connect(roles.beneficiary).depositAtPool(vestingParameters.amount.div(2));
              // 3/4 of the vesting time has elapsed
              await helpers.time.setNextBlockTimestamp(
                vestingParameters.startTimestamp +
                  0.75 * (vestingParameters.endTimestamp - vestingParameters.startTimestamp)
              );
              // Beneficiary should receive the entire balance
              const beneficiaryBalanceBeforeWithdrawal = await mockApi3Token.balanceOf(roles.beneficiary.address);
              await expect(irrevocableVesting.connect(roles.beneficiary).withdrawAsBeneficiary())
                .to.emit(irrevocableVesting, 'WithdrawnAsBeneficiary')
                .withArgs(vestingParameters.amount.div(2));
              const beneficiaryBalanceAfterWithdrawal = await mockApi3Token.balanceOf(roles.beneficiary.address);
              expect(beneficiaryBalanceAfterWithdrawal.sub(beneficiaryBalanceBeforeWithdrawal)).to.equal(
                vestingParameters.amount.div(2)
              );
              expect(await mockApi3Token.balanceOf(irrevocableVesting.address)).to.equal(0);
            });
          });
          context('Vested amount is smaller than balance', function () {
            it('withdraws vested amount', async function () {
              const { roles, vestingParameters, mockApi3Token, irrevocableVesting } = await helpers.loadFixture(
                factoryDeployIrrevocableVesting
              );
              // 3/4 of the vesting time has elapsed
              await helpers.time.setNextBlockTimestamp(
                vestingParameters.startTimestamp +
                  0.75 * (vestingParameters.endTimestamp - vestingParameters.startTimestamp)
              );
              // Beneficiary should receive 3/4 of the balance
              const beneficiaryBalanceBeforeWithdrawal = await mockApi3Token.balanceOf(roles.beneficiary.address);
              await expect(irrevocableVesting.connect(roles.beneficiary).withdrawAsBeneficiary())
                .to.emit(irrevocableVesting, 'WithdrawnAsBeneficiary')
                .withArgs(vestingParameters.amount.mul(3).div(4));
              const beneficiaryBalanceAfterWithdrawal = await mockApi3Token.balanceOf(roles.beneficiary.address);
              expect(beneficiaryBalanceAfterWithdrawal.sub(beneficiaryBalanceBeforeWithdrawal)).to.equal(
                vestingParameters.amount.mul(3).div(4)
              );
              expect(await mockApi3Token.balanceOf(irrevocableVesting.address)).to.equal(
                vestingParameters.amount.div(4)
              );
            });
          });
        });
        context('There are no vested tokens in balance', function () {
          it('reverts', async function () {
            const { roles, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
            await expect(irrevocableVesting.connect(roles.beneficiary).withdrawAsBeneficiary()).to.be.revertedWith(
              'Tokens in balance not vested yet'
            );
          });
        });
      });
      context('Balance is zero', function () {
        it('reverts', async function () {
          const { roles, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
          await irrevocableVesting.connect(roles.owner).withdrawAsOwner();
          await expect(irrevocableVesting.connect(roles.beneficiary).withdrawAsBeneficiary()).to.be.revertedWith(
            'Balance zero'
          );
        });
      });
    });
    context('Sender is not beneficiary', function () {
      it('reverts', async function () {
        const { roles, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
        await expect(irrevocableVesting.connect(roles.randomPerson).withdrawAsBeneficiary()).to.be.revertedWith(
          'Sender not beneficiary'
        );
      });
    });
  });

  describe('depositAtPool', function () {
    context('Sender is beneficiary', function () {
      it('approves tokens and deposits', async function () {
        const { roles, vestingParameters, mockApi3Token, api3Pool, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        const irrevocableVestingBalanceBeforeDeposit = await mockApi3Token.balanceOf(irrevocableVesting.address);
        await expect(
          irrevocableVesting.connect(roles.beneficiary).depositAtPool(vestingParameters.amount.div(2))
        ).to.emit(api3Pool, 'Deposited');
        const irrevocableVestingBalanceAfterDeposit = await mockApi3Token.balanceOf(irrevocableVesting.address);
        expect(irrevocableVestingBalanceBeforeDeposit.sub(irrevocableVestingBalanceAfterDeposit)).to.equal(
          vestingParameters.amount.div(2)
        );
        expect(await mockApi3Token.balanceOf(api3Pool.address)).to.equal(vestingParameters.amount.div(2));
      });
    });
    context('Sender is not beneficiary', function () {
      it('reverts', async function () {
        const { roles, vestingParameters, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        await expect(
          irrevocableVesting.connect(roles.randomPerson).depositAtPool(vestingParameters.amount.div(2))
        ).to.be.revertedWith('Sender not beneficiary');
      });
    });
  });

  describe('withdrawAtPool', function () {
    context('Sender is beneficiary', function () {
      it('withdraws', async function () {
        const { roles, vestingParameters, mockApi3Token, api3Pool, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        await irrevocableVesting.connect(roles.beneficiary).depositAtPool(vestingParameters.amount.div(2));
        const irrevocableVestingBalanceBeforeWithdrawal = await mockApi3Token.balanceOf(irrevocableVesting.address);
        await expect(
          irrevocableVesting.connect(roles.beneficiary).withdrawAtPool(vestingParameters.amount.div(2))
        ).to.emit(api3Pool, 'Withdrawn');
        const irrevocableVestingBalanceAfterWithdrawal = await mockApi3Token.balanceOf(irrevocableVesting.address);
        expect(irrevocableVestingBalanceAfterWithdrawal.sub(irrevocableVestingBalanceBeforeWithdrawal)).to.equal(
          vestingParameters.amount.div(2)
        );
        expect(await mockApi3Token.balanceOf(api3Pool.address)).to.equal(0);
      });
    });
    context('Sender is not beneficiary', function () {
      it('reverts', async function () {
        const { roles, vestingParameters, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        await expect(
          irrevocableVesting.connect(roles.randomPerson).withdrawAtPool(vestingParameters.amount.div(2))
        ).to.be.revertedWith('Sender not beneficiary');
      });
    });
  });

  describe('withdrawPrecalculatedAtPool', function () {
    context('Sender is beneficiary', function () {
      it('withdraws precalculated amount', async function () {
        const { roles, vestingParameters, mockApi3Token, api3Pool, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        await irrevocableVesting.connect(roles.beneficiary).depositAtPool(vestingParameters.amount.div(2));
        const irrevocableVestingBalanceBeforeWithdrawal = await mockApi3Token.balanceOf(irrevocableVesting.address);
        // Anyone can call `precalculateUserLocked()` for IrrevocableVesting
        await api3Pool.connect(roles.randomPerson).precalculateUserLocked(irrevocableVesting.address, 10);
        await expect(
          irrevocableVesting.connect(roles.beneficiary).withdrawPrecalculatedAtPool(vestingParameters.amount.div(2))
        ).to.emit(api3Pool, 'Withdrawn');
        const irrevocableVestingBalanceAfterWithdrawal = await mockApi3Token.balanceOf(irrevocableVesting.address);
        expect(irrevocableVestingBalanceAfterWithdrawal.sub(irrevocableVestingBalanceBeforeWithdrawal)).to.equal(
          vestingParameters.amount.div(2)
        );
        expect(await mockApi3Token.balanceOf(api3Pool.address)).to.equal(0);
      });
    });
    context('Sender is not beneficiary', function () {
      it('reverts', async function () {
        const { roles, vestingParameters, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        await expect(
          irrevocableVesting.connect(roles.randomPerson).withdrawPrecalculatedAtPool(vestingParameters.amount.div(2))
        ).to.be.revertedWith('Sender not beneficiary');
      });
    });
  });

  describe('stakeAtPool', function () {
    context('Sender is beneficiary', function () {
      it('stakes', async function () {
        const { roles, vestingParameters, api3Pool, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        await irrevocableVesting.connect(roles.beneficiary).depositAtPool(vestingParameters.amount.div(2));
        await expect(
          irrevocableVesting.connect(roles.beneficiary).stakeAtPool(vestingParameters.amount.div(2))
        ).to.emit(api3Pool, 'Staked');
        expect(await api3Pool.userStake(irrevocableVesting.address)).to.equal(vestingParameters.amount.div(2));
      });
    });
    context('Sender is not beneficiary', function () {
      it('reverts', async function () {
        const { roles, vestingParameters, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        await expect(
          irrevocableVesting.connect(roles.randomPerson).stakeAtPool(vestingParameters.amount.div(2))
        ).to.be.revertedWith('Sender not beneficiary');
      });
    });
  });

  describe('scheduleUnstakeAtPool', function () {
    context('Sender is beneficiary', function () {
      it('schedules unstake', async function () {
        const { roles, vestingParameters, api3Pool, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        await irrevocableVesting.connect(roles.beneficiary).depositAtPool(vestingParameters.amount.div(2));
        await irrevocableVesting.connect(roles.beneficiary).stakeAtPool(vestingParameters.amount.div(2));
        await expect(
          irrevocableVesting.connect(roles.beneficiary).scheduleUnstakeAtPool(vestingParameters.amount.div(2))
        ).to.emit(api3Pool, 'ScheduledUnstake');
        const user = await api3Pool.getUser(irrevocableVesting.address);
        expect(user.unstakeAmount).to.equal(vestingParameters.amount.div(2));
      });
    });
    context('Sender is not beneficiary', function () {
      it('reverts', async function () {
        const { roles, vestingParameters, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        await expect(
          irrevocableVesting.connect(roles.randomPerson).scheduleUnstakeAtPool(vestingParameters.amount.div(2))
        ).to.be.revertedWith('Sender not beneficiary');
      });
    });
  });

  describe('unstakeAtPool', function () {
    it('unstakes', async function () {
      const { roles, vestingParameters, api3Pool, irrevocableVesting } = await helpers.loadFixture(
        factoryDeployIrrevocableVesting
      );
      await irrevocableVesting.connect(roles.beneficiary).depositAtPool(vestingParameters.amount.div(2));
      await irrevocableVesting.connect(roles.beneficiary).stakeAtPool(vestingParameters.amount.div(2));
      await irrevocableVesting.connect(roles.beneficiary).scheduleUnstakeAtPool(vestingParameters.amount.div(2));
      // Wait for the unstaking to mature
      await helpers.time.increase(7 * 24 * 60 * 60);
      await expect(irrevocableVesting.connect(roles.randomPerson).unstakeAtPool()).to.emit(api3Pool, 'Unstaked');
      expect(await api3Pool.userStake(irrevocableVesting.address)).to.equal(0);
    });
  });

  describe('delegateAtPool', function () {
    context('Sender is beneficiary', function () {
      it('delegates', async function () {
        const { roles, vestingParameters, api3Pool, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        await irrevocableVesting.connect(roles.beneficiary).depositAtPool(vestingParameters.amount.div(2));
        await irrevocableVesting.connect(roles.beneficiary).stakeAtPool(vestingParameters.amount.div(2));
        await expect(irrevocableVesting.connect(roles.beneficiary).delegateAtPool(roles.randomPerson.address)).to.emit(
          api3Pool,
          'Delegated'
        );
        expect(await api3Pool.userDelegate(irrevocableVesting.address)).to.equal(roles.randomPerson.address);
      });
    });
    context('Sender is not beneficiary', function () {
      it('reverts', async function () {
        const { roles, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
        await expect(
          irrevocableVesting.connect(roles.randomPerson).delegateAtPool(roles.randomPerson.address)
        ).to.be.revertedWith('Sender not beneficiary');
      });
    });
  });

  describe('undelegateAtPool', function () {
    context('Sender is beneficiary', function () {
      it('undelegates', async function () {
        const { roles, vestingParameters, api3Pool, irrevocableVesting } = await helpers.loadFixture(
          factoryDeployIrrevocableVesting
        );
        await irrevocableVesting.connect(roles.beneficiary).depositAtPool(vestingParameters.amount.div(2));
        await irrevocableVesting.connect(roles.beneficiary).stakeAtPool(vestingParameters.amount.div(2));
        await irrevocableVesting.connect(roles.beneficiary).delegateAtPool(roles.randomPerson.address);
        // Delegations cannot be updated frequently
        await helpers.time.increase(7 * 24 * 60 * 60);
        await expect(irrevocableVesting.connect(roles.beneficiary).undelegateAtPool()).to.emit(api3Pool, 'Undelegated');
        expect(await api3Pool.userDelegate(irrevocableVesting.address)).to.equal(ethers.constants.AddressZero);
      });
    });
    context('Sender is not beneficiary', function () {
      it('reverts', async function () {
        const { roles, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
        await expect(irrevocableVesting.connect(roles.randomPerson).undelegateAtPool()).to.be.revertedWith(
          'Sender not beneficiary'
        );
      });
    });
  });

  describe('stateAtPool', function () {
    it('returns state at pool', async function () {
      const { roles, vestingParameters, irrevocableVesting } = await helpers.loadFixture(
        factoryDeployIrrevocableVesting
      );
      await irrevocableVesting.connect(roles.beneficiary).depositAtPool(vestingParameters.amount);
      await irrevocableVesting.connect(roles.beneficiary).stakeAtPool(vestingParameters.amount.div(2));
      const currentTimestamp = await helpers.time.latest();
      await helpers.time.setNextBlockTimestamp(currentTimestamp + 1);
      await irrevocableVesting.connect(roles.beneficiary).delegateAtPool(roles.randomPerson.address);
      await helpers.time.setNextBlockTimestamp(currentTimestamp + 2);
      await irrevocableVesting.connect(roles.beneficiary).scheduleUnstakeAtPool(vestingParameters.amount.div(8));
      const state = await irrevocableVesting.connect(roles.randomPerson).stateAtPool();
      expect(state.unstaked).to.equal(vestingParameters.amount.div(2));
      expect(state.staked).to.equal(vestingParameters.amount.div(8).mul(3));
      expect(state.unstaking).to.equal(vestingParameters.amount.div(8));
      expect(state.unstakeScheduledFor).to.equal(currentTimestamp + 2 + 7 * 24 * 60 * 60);
      expect(state.lockedStakingRewards).to.equal(0);
      expect(state.delegate).to.equal(roles.randomPerson.address);
      expect(state.lastDelegationUpdateTimestamp).to.equal(currentTimestamp + 1);
    });
  });

  describe('unvestedAmount', function () {
    context('Called before vesting start', function () {
      it('returns vesting amount', async function () {
        const { vestingParameters, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
        expect(await irrevocableVesting.unvestedAmount()).to.equal(vestingParameters.amount);
      });
    });
    context('Called after vesting end', function () {
      it('returns zero', async function () {
        const { vestingParameters, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
        await helpers.time.increaseTo(vestingParameters.endTimestamp);
        expect(await irrevocableVesting.unvestedAmount()).to.equal(0);
      });
    });
    context('Called during vesting', function () {
      it('returns unvested amount', async function () {
        const { vestingParameters, irrevocableVesting } = await helpers.loadFixture(factoryDeployIrrevocableVesting);
        await helpers.time.increaseTo(
          vestingParameters.startTimestamp + 0.75 * (vestingParameters.endTimestamp - vestingParameters.startTimestamp)
        );
        expect(await irrevocableVesting.unvestedAmount()).to.equal(vestingParameters.amount.div(4));
      });
    });
  });
});
