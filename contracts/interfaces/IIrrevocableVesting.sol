// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IIrrevocableVesting {
    event WithdrawnAsBeneficiary(uint256 amount);

    function initialize(
        address beneficiary_,
        uint32 startTimestamp,
        uint32 endTimestamp,
        uint192 amount
    ) external;

    function withdrawAsBeneficiary() external;

    function unvestedAmount() external view returns (uint256);

    function api3Token() external returns (address);

    function beneficiary() external returns (address);

    function vesting()
        external
        returns (uint32 startTimestamp, uint32 endTimestamp, uint192 amount);
}
