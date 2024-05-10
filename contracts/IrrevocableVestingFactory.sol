// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./interfaces/IIrrevocableVestingFactory.sol";
import "./IrrevocableVesting.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Contract that deploys an IrrevocableVesting implementation and
/// allows it to be cloned to create vestings
contract IrrevocableVestingFactory is IIrrevocableVestingFactory {
    /// @notice Api3Token address
    address public immutable override api3Token;

    /// @notice IrrevocableVesting implementation address
    address public immutable override irrevocableVestingImplementation;

    /// @param api3Token_ Api3Token address
    constructor(address api3Token_) {
        require(api3Token_ != address(0), "Api3Token address zero");
        api3Token = api3Token_;
        irrevocableVestingImplementation = address(
            new IrrevocableVesting(api3Token_)
        );
    }

    /// @notice Deploys an IrrevocableVesting clone and transfers the vesting
    /// amount to it from the sender
    /// @dev The sender needs to approve `amount` API3 tokens to this contract
    /// before calling this function
    /// @param beneficiary Beneficiary of the vesting
    /// @param startTimestamp Starting timestamp of the vesting
    /// @param endTimestamp Ending timestamp of the vesting
    /// @param amount Amount of tokens to be vested over the period
    /// @return irrevocableVesting IrrevocableVesting clone address
    function deployIrrevocableVesting(
        address beneficiary,
        uint32 startTimestamp,
        uint32 endTimestamp,
        uint192 amount
    ) external override returns (address irrevocableVesting) {
        irrevocableVesting = Clones.cloneDeterministic(
            irrevocableVestingImplementation,
            keccak256(
                abi.encodePacked(
                    beneficiary,
                    startTimestamp,
                    endTimestamp,
                    amount
                )
            )
        );
        IERC20(api3Token).transferFrom(msg.sender, irrevocableVesting, amount);
        IIrrevocableVesting(irrevocableVesting).initialize(
            beneficiary,
            startTimestamp,
            endTimestamp,
            amount
        );
        emit DeployedIrrevocableVesting(
            beneficiary,
            startTimestamp,
            endTimestamp,
            amount
        );
    }

    /// @notice Predicts the address of the IrrevocableVesting clone that would
    /// be deployed by this contract
    /// @param beneficiary Beneficiary of the vesting
    /// @param startTimestamp Starting timestamp of the vesting
    /// @param endTimestamp Ending timestamp of the vesting
    /// @param amount Amount of tokens to be vested over the period
    /// @return irrevocableVesting IrrevocableVesting clone address
    function predictIrrevocableVesting(
        address beneficiary,
        uint32 startTimestamp,
        uint32 endTimestamp,
        uint192 amount
    ) external view override returns (address irrevocableVesting) {
        irrevocableVesting = Clones.predictDeterministicAddress(
            irrevocableVestingImplementation,
            keccak256(
                abi.encodePacked(
                    beneficiary,
                    startTimestamp,
                    endTimestamp,
                    amount
                )
            )
        );
    }
}
