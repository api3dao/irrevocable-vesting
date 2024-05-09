// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IIrrevocableVestingFactory {
    event DeployedIrrevocableVesting(
        address indexed deployer,
        address indexed beneficiary,
        uint32 startTimestamp,
        uint32 endTimestamp,
        uint192 amount
    );

    function deployIrrevocableVesting(
        address beneficiary,
        uint32 startTimestamp,
        uint32 endTimestamp,
        uint192 amount
    ) external returns (address irrevocableVesting);

    function api3Token() external returns (address);

    function irrevocableVestingImplementation() external returns (address);
}
