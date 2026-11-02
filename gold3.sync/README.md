# gold3.sync

Chain event -> PostgreSQL sync services and keepers for GOLDEN PACT GG. One
long-running listener per contract group, each writing into its own table;
four keepers that send transactions on a tick loop.

## Layout

```
config/          env + address book (addresses.json is generated, do not hand-edit)
                 services.js is the registry every tool reads
abi/             event-only ABIs (generated from gold3.contract artifacts, npm run sync-abi)
model/           sequelize connection + one model file per table
utils/           redis client, block cursor, service heartbeat, BaseListener core,
                 protocol time, keeper plumbing, tag table, token decimals
listeners/       one runnable service per contract group (event -> DB)
keepers/         scheduled services that SEND transactions (no cursor, no table)
scripts/         schema, address/abi sync, cursor tooling, status dump
```

`config/services.js` is the single source of truth for what runs: pm2
(`ecosystem.config.js`), `set-cursor` and `show-status` all read it.

## Protocol time

Everything is keyed by the protocol day of `EmissionController.sol`, mirrored
off chain by `utils/protocolTime.js`. Genesis is an SGT 12:00 (UTC 04:00)
timestamp read from the contract at startup (`genesisTimestamp()`); day 1 is
`[genesis, genesis + 86400)`. Never compute a day from `Date` arithmetic
inline - use that module.

## Listeners and tables

| service     | contract(s)                                                                                    | events                                                                                      | table                                              |
| ----------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `position`  | `COMPUTING_VAULT_ADDRESS`                                                                      | PositionCreated, TokensBurned, HoldingRewardClaimed; HoldingRewardNotified                  | `gold3_position_records`, `gold3_holding_days`     |
| `emission`  | `EMISSION_CONTROLLER_ADDRESS`                                                                  | DailySettled, GenesisSet                                                                    | `gold3_emission_days`                              |
| `community` | `COMMUNITY_ENGINE_ADDRESS`                                                                     | CommunityBudgetAllocated, CommunityDayClosed; CommunityCredited, CommunityPaid              | `gold3_community_days`, `gold3_community_credits`  |
| `tier`      | `TIER_STAKING_ADDRESS`                                                                         | TierStaked, TierUnstaked, TierChanged                                                       | `gold3_tier_records`                               |
| `rights`    | `NFT_RIGHTS_LEDGER_ADDRESS`, `CLAIM_CONTROLLER_ADDRESS`                                        | RightsCreated, RightsConsumed, TokensBurned; CommunityGGClaimed                             | `gold3_rights_records`                             |
| `fee`       | `FEE_ROUTER_ADDRESS`, `BUYBACK_EXECUTOR_ADDRESS`                                               | FeeRouted; BuybackFunded, BuybackExecuted, TokensBurned                                     | `gold3_fee_records`                                |
| `treasury`  | `INSURANCE_TREASURY_ADDRESS`, `RESERVE_VAULT_ADDRESS`, `PROTECTION_VAULT_ADDRESS`, `ALLOCATION_VAULT_ADDRESS` | TreasuryCredited, TreasuryPaid; ReserveDeposited, ReserveWithdrawn; ProtectionDeposited, ProtectionBuyExecuted, ProtectionWithdrawn; AllocationReleased | `gold3_treasury_flows` |

Every event table shares the same base shape (`model/columns.js`): `method`
(the event name), `block`, `tx`, `log_index`, `ts` (block timestamp) and a
unique index on `(tx, log_index)`. Tables whose events carry a user and one
primary amount add `address` (stored exactly as the chain returns it,
checksummed, never lowercased), `amount_raw` (the exact uint256 as a string)
and `amount` (DECIMAL(78,18) in the token's own units, read from the token's
`decimals()` by `utils/tokenDecimals.js`). The day-keyed tables carry no
address. bytes32 tags are stored as hex with the name resolved through
`utils/tags.js`; an unknown tag keeps its row with the name null.

Rows are append-only. Every insert goes through `insertIgnore` (ON CONFLICT
DO NOTHING on the unique index), no listener ever updates a row.

## Keepers

| keeper                 | calls                                                             | gate                                                              | key                                |
| ---------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| `oracle-updater`       | `OracleAdapter.update()`                                          | any registered token's observation older than `twapWindowSeconds` | `ORACLE_UPDATER_PK`, permissionless |
| `daily-settlement`     | `EmissionController.settleUpTo(SETTLE_MAX_DAYS_PER_TICK)`         | `lastSettledDay + 1` has ended on chain time                      | `SETTLEMENT_PK`, KEEPER_ROLE       |
| `buyback`              | `BuybackExecutor.executeBuyback(path, amountIn, minOut)`          | `budgetOf(purpose, tokenIn) >= BUYBACK_MIN_BUDGET`                | `BUYBACK_PK`, KEEPER_ROLE          |
| `community-accountant` | `CommunityEngine.credit(day, bucket, accounts[], amounts[])`, `closeDay(day)` | rows in `gold3_community_queue`                       | `ACCOUNTANT_PK`, ACCOUNTANT_ROLE   |

The first three treat the contract as the idempotency key and store nothing
off chain. The accountant drains `gold3_community_queue` /
`gold3_community_queue_days` (`model/models/CommunityQueue.js` documents the
row lifecycle); what fills that queue - the community assessment of the three
30% buckets - is off chain and not part of this module. `--dry-run` reads,
decides and sends nothing.

## Running

```
cp .env.sample .env
npm install
npm run sync-addresses          # after every deploy that changes an address
npm run sync-abi                # after every contract change that touches events (needs compiled artifacts)
npm run init-schema             # once, before the listeners start
node keepers/daily-settlement.js --dry-run
pm2 start ecosystem.config.js
npm run status
```

Address keys read from `config/addresses.json[NETWORK]`: the contract keys in
the tables above plus `ORACLE_ADAPTER_ADDRESS`, `GG_ADDRESS`, `USDT_ADDRESS`
and `BUYBACK_PATHS` (one array of address-book keys per purpose, see the
header of `keepers/buyback.js`).
