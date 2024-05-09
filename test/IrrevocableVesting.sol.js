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
    amount: ethers.parseEther('100' + '000'),
  };
}

describe('IrrevocableVesting', function () {
  async function eoaDeployIrrevocableVesting() {
    const accounts = await ethers.getSigners();
    const roles = {
      deployer: accounts[0],
      beneficiary: accounts[1],
      randomPerson: accounts[9],
    };
    const vestingParameters = getVestingParameters();
    const MockApi3TokenFactory = await ethers.getContractFactory('MockApi3Token', roles.deployer);
    const mockApi3Token = await MockApi3TokenFactory.deploy();
    const IrrevocableVestingFactory = await ethers.getContractFactory('IrrevocableVesting', roles.deployer);
    const irrevocableVesting = await IrrevocableVestingFactory.deploy(mockApi3Token.getAddress());
    return { roles, vestingParameters, mockApi3Token, irrevocableVesting };
  }

  async function factoryDeployIrrevocableVesting() {
    const accounts = await ethers.getSigners();
    const roles = {
      deployer: accounts[0],
      beneficiary: accounts[1],
      randomPerson: accounts[9],
    };
    const vestingParameters = getVestingParameters();
    const MockApi3TokenFactory = await ethers.getContractFactory('MockApi3Token', roles.deployer);
    const mockApi3Token = await MockApi3TokenFactory.deploy();
    const IrrevocableVestingFactoryFactory = await ethers.getContractFactory(
      'IrrevocableVestingFactory',
      roles.deployer
    );
    const irrevocableVestingFactory = await IrrevocableVestingFactoryFactory.deploy(mockApi3Token.getAddress());
    await mockApi3Token
      .connect(roles.deployer)
      .approve(irrevocableVestingFactory.getAddress(), vestingParameters.amount);
    const irrevocableVestingAddress = await irrevocableVestingFactory
      .connect(roles.deployer)
      .deployIrrevocableVesting.staticCall(
        roles.beneficiary.address,
        vestingParameters.startTimestamp,
        vestingParameters.endTimestamp,
        vestingParameters.amount
      );
    await irrevocableVestingFactory
      .connect(roles.deployer)
      .deployIrrevocableVesting(
        roles.beneficiary.address,
        vestingParameters.startTimestamp,
        vestingParameters.endTimestamp,
        vestingParameters.amount
      );
    const IrrevocableVesting = await artifacts.readArtifact('IrrevocableVesting');
    const irrevocableVesting = new ethers.Contract(irrevocableVestingAddress, IrrevocableVesting.abi, roles.deployer);
    return { roles, vestingParameters, mockApi3Token, irrevocableVesting };
  }

  describe('constructor', function () {
    context('Api3Token address is not zero', function () {
      it('constructs uninitializable IrrevocableVesting', async function () {
        const { roles, vestingParameters, mockApi3Token, irrevocableVesting } =
          await helpers.loadFixture(eoaDeployIrrevocableVesting);
        expect(await irrevocableVesting.api3Token()).to.equal(await mockApi3Token.getAddress());
        expect(await irrevocableVesting.beneficiary()).to.equal('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF');
        await expect(
          irrevocableVesting.initialize(
            roles.beneficiary.address,
            vestingParameters.startTimestamp,
            vestingParameters.endTimestamp,
            vestingParameters.amount
          )
        ).to.be.revertedWith('Already initialized');
      });
    });
    context('Api3Token address is zero', function () {
      it('reverts', async function () {
        const { roles } = await helpers.loadFixture(eoaDeployIrrevocableVesting);
        const IrrevocableVestingFactory = await ethers.getContractFactory('IrrevocableVesting', roles.deployer);
        await expect(IrrevocableVestingFactory.deploy(ethers.ZeroAddress)).to.be.revertedWith('Api3Token address zero');
      });
    });
  });

  // See IrrevocableVestingFactory tests for the happy path
  describe('initialize', function () {
    context('Token balance is not equal to vesting amount', function () {
      it('reverts', async function () {
        const { roles, vestingParameters, mockApi3Token } = await helpers.loadFixture(eoaDeployIrrevocableVesting);
        const BadIrrevocableVestingFactoryFactory = await ethers.getContractFactory(
          'BadIrrevocableVestingFactory',
          roles.deployer
        );
        const badIrrevocableVestingFactory = await BadIrrevocableVestingFactoryFactory.deploy(
          mockApi3Token.getAddress()
        );
        await expect(
          badIrrevocableVestingFactory
            .connect(roles.deployer)
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

  describe('withdrawAsBeneficiary', function () {
    context('Sender is beneficiary', function () {
      context('Balance is not zero', function () {
        context('There are vested tokens in balance', function () {
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
              .withArgs((vestingParameters.amount * 3n) / 4n);
            const beneficiaryBalanceAfterWithdrawal = await mockApi3Token.balanceOf(roles.beneficiary.address);
            expect(beneficiaryBalanceAfterWithdrawal - beneficiaryBalanceBeforeWithdrawal).to.equal(
              (vestingParameters.amount * 3n) / 4n
            );
            expect(await mockApi3Token.balanceOf(irrevocableVesting.getAddress())).to.equal(
              vestingParameters.amount / 4n
            );
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
          const { roles, vestingParameters, irrevocableVesting } = await helpers.loadFixture(
            factoryDeployIrrevocableVesting
          );
          await helpers.time.setNextBlockTimestamp(vestingParameters.endTimestamp);
          await irrevocableVesting.connect(roles.beneficiary).withdrawAsBeneficiary();
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
        expect(await irrevocableVesting.unvestedAmount()).to.equal(vestingParameters.amount / 4n);
      });
    });
  });
});
