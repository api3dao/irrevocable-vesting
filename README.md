# `irrevocable-vesting`

Install the dependencies and build

```sh
pnpm i
yarn build
```

Test the contracts and get test coverage

```sh
pnpm test
# Outputs to `./coverage`
pnpm test:coverage
```

To derive the expected address of an IrrevocableVesting deployment

```sh
BENEFICIARY=... \
  START_TIMESTAMP=...\
  END_TIMESTAMP=...\
  AMOUNT=...\
  pnpm derive-vesting-address
```

See the [`beneficiary` guide](./beneficiary-guide.md) for instructions
