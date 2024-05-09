// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "../IrrevocableVesting.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BadIrrevocableVestingFactory {
    address public immutable api3Token;

    address public immutable irrevocableVestingImplementation;

    constructor(address _api3Token, address _api3Pool) {
        api3Token = _api3Token;
        irrevocableVestingImplementation = address(
            new IrrevocableVesting(_api3Token, _api3Pool)
        );
    }

    function deployIrrevocableVestingWithZeroOwner(
        address beneficiary,
        uint32 startTimestamp,
        uint32 endTimestamp,
        uint192 amount
    ) external returns (address irrevocableVesting) {
        irrevocableVesting = Clones.clone(irrevocableVestingImplementation);
        IERC20(api3Token).transferFrom(msg.sender, irrevocableVesting, amount);
        IIrrevocableVesting(irrevocableVesting).initialize(
            address(0),
            beneficiary,
            startTimestamp,
            endTimestamp,
            amount
        );
    }

    function deployIrrevocableVestingWithoutTransferringTokens(
        address beneficiary,
        uint32 startTimestamp,
        uint32 endTimestamp,
        uint192 amount
    ) external returns (address irrevocableVesting) {
        irrevocableVesting = Clones.clone(irrevocableVestingImplementation);
        IIrrevocableVesting(irrevocableVesting).initialize(
            msg.sender,
            beneficiary,
            startTimestamp,
            endTimestamp,
            amount
        );
    }
}
