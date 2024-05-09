// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./interfaces/IIrrevocableVestingFactory.sol";
import "./IrrevocableVesting.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Contract that deploys a IrrevocableVesting implementation and allows
/// it to be cloned to create vestings
contract IrrevocableVestingFactory is IIrrevocableVestingFactory {
    /// @notice Api3Token address
    address public immutable override api3Token;

    /// @notice IrrevocableVesting implementation address
    address public immutable override irrevocableVestingImplementation;

    /// @param _api3Token Api3Token address
    /// @param _api3Pool Api3Pool address
    constructor(address _api3Token, address _api3Pool) {
        require(_api3Token != address(0), "Api3Token address zero");
        api3Token = _api3Token;
        irrevocableVestingImplementation = address(
            new IrrevocableVesting(_api3Token, _api3Pool)
        );
    }

    /// @notice Deploys a IrrevocableVesting clone and transfers the vesting
    /// amount to it from the sender
    /// @dev The sender needs to approve `amount` API3 tokens to this contract
    /// before calling this.
    /// The sender will be the owner of the IrrevocableVesting clone, allowing it
    /// to revoke the vesting.
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
                    amount,
                    msg.sender
                )
            )
        );
        IERC20(api3Token).transferFrom(msg.sender, irrevocableVesting, amount);
        IIrrevocableVesting(irrevocableVesting).initialize(
            msg.sender,
            beneficiary,
            startTimestamp,
            endTimestamp,
            amount
        );
        emit DeployedIrrevocableVesting(
            msg.sender,
            beneficiary,
            startTimestamp,
            endTimestamp,
            amount
        );
    }
}
