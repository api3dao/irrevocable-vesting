// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./interfaces/IIrrevocableVesting.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Contract that implements an irrevocable vesting of API3 tokens
/// allocated to a beneficiary
/// @notice This contract is an implementation that is required to be cloned by
/// a IrrevocableVestingFactory contract. The beneficiary of the vesting is
/// expected to interact with this contract through a generic, ABI-based UI
/// such as Etherscan's. See the repo's README for instructions.
contract IrrevocableVesting is IIrrevocableVesting {
    struct Vesting {
        uint32 startTimestamp;
        uint32 endTimestamp;
        uint192 amount;
    }

    /// @notice Api3Token address
    address public immutable override api3Token;

    /// @notice Beneficiary of the vesting
    address public override beneficiary;

    /// @notice Vesting parameters, including the schedule and the amount
    Vesting public override vesting;

    /// @dev Prevents tokens from being locked by setting an unreasonably late
    /// vesting end timestamp. The vesting periods are expected to be 4 years,
    /// and we have 1 year of buffer here in case the vesting is required to
    /// start in the future.
    uint256
        private constant MAXIMUM_TIME_BETWEEN_INITIALIZATION_AND_VESTING_END =
        5 * 365 days;

    /// @dev Reverts if the sender is not the beneficiary
    modifier onlyBeneficiary() {
        require(msg.sender == beneficiary, "Sender not beneficiary");
        _;
    }

    /// @dev This contract is means to be an implementation for
    /// IrrevocableVestingFactory to clone. To prevent the implementation from
    /// being used, the contract is rendered uninitializable.
    /// @param _api3Token Api3Token address
    constructor(address _api3Token) {
        require(_api3Token != address(0), "Api3Token address zero");
        api3Token = _api3Token;
        beneficiary = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;
    }

    /// @notice Initializes a newly cloned IrrevocableVesting
    /// @dev Since beneficiary is required to be zero address, only clones of
    /// this contract can be initialized.
    /// Anyone can initialize a IrrevocableVesting clone. The user is required
    /// to prevent others from initializing their clones, for example, by
    /// initializing the clone in the same transaction as it is deployed in.
    /// The IrrevocableVesting needs to have exactly `_amount` API3 tokens.
    /// @param _beneficiary Beneficiary of the vesting
    /// @param _startTimestamp Starting timestamp of the vesting
    /// @param _endTimestamp Ending timestamp of the vesting
    /// @param _amount Amount of tokens to be vested over the period
    function initialize(
        address _beneficiary,
        uint32 _startTimestamp,
        uint32 _endTimestamp,
        uint192 _amount
    ) external override {
        require(beneficiary == address(0), "Already initialized");
        require(_beneficiary != address(0), "Beneficiary address zero");
        require(_startTimestamp != 0, "Start timestamp zero");
        require(_endTimestamp > _startTimestamp, "End not later than start");
        require(
            _endTimestamp <=
                block.timestamp +
                    MAXIMUM_TIME_BETWEEN_INITIALIZATION_AND_VESTING_END,
            "End is too far in the future"
        );
        require(_amount != 0, "Amount zero");
        require(
            IERC20(api3Token).balanceOf(address(this)) == _amount,
            "Balance is not vesting amount"
        );
        beneficiary = _beneficiary;
        vesting = Vesting({
            startTimestamp: _startTimestamp,
            endTimestamp: _endTimestamp,
            amount: _amount
        });
    }

    /// @notice Called by the beneficiary to withdraw as many tokens the
    /// vesting schedule allows
    function withdrawAsBeneficiary() external override onlyBeneficiary {
        uint256 balance = IERC20(api3Token).balanceOf(address(this));
        require(balance != 0, "Balance zero");
        uint256 unvestedAmountInBalance = unvestedAmount();
        require(
            balance > unvestedAmountInBalance,
            "Tokens in balance not vested yet"
        );
        uint256 withdrawalAmount = balance - unvestedAmountInBalance;
        IERC20(api3Token).transfer(msg.sender, withdrawalAmount);
        emit WithdrawnAsBeneficiary(withdrawalAmount);
    }

    /// @notice Returns the amount of tokens that are yet to be vested based on
    /// the schedule
    /// @return Amount of unvested tokens
    function unvestedAmount() public view override returns (uint256) {
        (uint32 startTimestamp, uint32 endTimestamp, uint192 amount) = (
            vesting.startTimestamp,
            vesting.endTimestamp,
            vesting.amount
        );
        if (block.timestamp <= startTimestamp) {
            return amount;
        } else if (block.timestamp >= endTimestamp) {
            return 0;
        } else {
            uint256 passedTime = block.timestamp - startTimestamp;
            uint256 totalTime = endTimestamp - startTimestamp;
            return amount - (amount * passedTime) / totalTime;
        }
    }
}
