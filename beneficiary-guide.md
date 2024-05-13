# IrrevocableVesting beneficiary guide

You will be vested tokens through a IrrevocableVesting contract dedicated to you.
To act on your vesting, you need to interact with your IrrevocableVesting contract using your `beneficiary` account (i.e., the account whose address you have provided).

## ⚠️ WARNING ⚠️

- You will need to send transactions to your IrrevocableVesting contract through your `beneficiary` account.
  For this reason, `beneficiary` must not belong to a custodial wallet, e.g. it cannot be a crypto exchange deposit address.

- You are recommended to use a hardware wallet or a [Safe](https://safe.global/) multisig as the `beneficiary` account.

- Whenever you are sending transactions to your IrrevocableVesting contract, verify on the interface of your wallet that the address to which the transaction is being sent matches your IrrevocableVesting contract address

Initially, your entire allocation will be in your IrrevocableVesting contract.
You can simply call the `withdrawAsBeneficiary()` function of your IrrevocableVesting contract whenever you want to withdraw the vested portion.
To do that, find your IrrevocableVesting contract on Etherscan, click "Contract", click "Write Contract as Proxy", click "Connect to Web3", and connect the wallet with `beneficiary` as the address.
Then, expand `withdrawAsBeneficiary()`, click "Write", and send the transaction.
When the transaction is confirmed, you will have received your vested tokens.
You can repeat this whenever you want.
