# `irrevocable-vesting`

Install the dependencies and build

```sh
pnpm i
pnpm build
```

Test the contracts and get test coverage

```sh
pnpm test
# Outputs to `./coverage`
pnpm test:coverage
```

To derive the expected address of an IrrevocableVesting deployment

```sh
BENEFICIARY=0x07b589f06bD0A5324c4E2376d66d2F4F25921DE1 \
  START_TIMESTAMP=1 \
  END_TIMESTAMP=2 \
  AMOUNT=1 \
  pnpm print-irrevocable-vesting-address
```
_It is required that you also have a MNEMONIC environment variable set before runnning this script_

See the [`beneficiary` guide](./beneficiary-guide.md) for instructions
