# gold3.contract

Smart contracts for GOLDEN PACT (GG). Solidity 0.8.24 (evm shanghai),
OpenZeppelin 5.4 upgradeable (`AccessControlEnumerable`, pinned `~5.4.0`
because 5.5+ needs cancun's MCOPY), Hardhat 2 with ethers v6 and
`@openzeppelin/hardhat-upgrades`, transparent proxies. Node 20+ (`.nvmrc` = 22).

**Stage: skeleton.** Constants, storage, events and function signatures only;
function bodies are empty, except Gold3Fundraise (implemented). No deploy /
config / upgrade scripts yet.

Source of truth: `Golden_Pact_GG_智能合约技术开发规范_V1.0` (section numbers
below refer to it).

## Layout

```
contracts/              one contract per file
contracts/interface/    one interface per contract (IGGToken is the consumer view of GGToken; ICommunity is the shared Community)
contracts/mocks/        MockERC20 for USDT / GOT2 / AUG on localhost
```

## Contracts

| Contract | Role |
| --- | --- |
| GGToken | Fixed 84,000,000 GG, all minted once to AllocationVault, burnable, no mint function (§02) |
| AllocationVault | Releases 8% initial liquidity / 12% InsuranceTreasury / 80% EmissionController, once each (§02) |
| EmissionController | 67.2M over 120 **months** in five phases (1–12 / 13–37 / 38–68 / 69–95 / 96–120 = 8/23/30/23/16%), daily `settleDay(dayId)`: holding 50% / community 50%, unused to InsuranceTreasury (§03) |
| ComputingVault | `participate(asset, amount, minPower)`: USDT 2.5×, GOT2 burn 2×, GG burn 2.5×; received cash 95% ReserveVault / 5% ProtectionVault (§04) |
| CommunityEngine | Community 50% split 30/30/30/5/5 (§02) |
| TierStaking | G1–G7 stake tier by GG locked at the live USDT price; value drop or unlock downgrades; no yield, no linear release (§05) |
| NFTRightsLedger | `burnForNFTRights(asset, amount)`: GOT2 2×, GG 3× of the burn-time USDT value, cumulative (§06) |
| ClaimController | `claimCommunityGG(amount)`: deducts amount × live GG price from the rights, atomically (§06) |
| LPStakeVault | `stakeLP` / `exitLP` for GOT2/GG and AUG/GG; fee share + GG airdrop by USDT LP weight (§07, §08) |
| LPWeightOracle | Manipulation-resistant USDT value of LP (§07) |
| LPExitBurn | Remove LP, burn both underlying tokens 25/20/15/10% by 30/60/90/120 days, 5% forever from day 121 (§09) |
| FeeRouter | Turbine 2.5% (0.5/0.5/0.5 buyback-burn + 1 LP), sell 3% (1 eco reserve + 1 community + 1 LP) (§08, §10) |
| BuybackExecutor | Buyback and burn with slippage limit, path whitelist, per-call cap (§10) |
| InsuranceTreasury | 10.08M initial GG + unused emission; supplies the LP airdrop (§10) |
| ReserveVault | Protocol reserve pool, 95% of received participation funds (§04) |
| ProtectionVault | Price-protection pool, 5% of received participation funds; `BUYER_ROLE` whitelist buys on the market (§04) |
| OracleAdapter | USDT prices of GG / GOT2 / AUG (§07) |
| Gold3Fundraise | USDT raise ledger ported from origin's AnubisFundraise: `subscribe(amount)`, target / min / per-address limits (0 = off), `closed` switch, funds held until admin `withdraw` |

## Shared contracts

| Contract | Anubis address | Source |
| --- | --- | --- |
| Community | `0xB824e39FAbA672bC0db2B5B006Cb7B9092923989` | `goldenpact/gp.contract` `contracts/invitation/Community.sol` (`2.0_COMMUNITY_ADDRESS`) |

gold3 reads the referral tree from it through `ICommunity` and deploys no
community contract of its own. The community condition of each tier (three
zones of 50k…4M USDT, G6 = three G5, G7 = three G6, §05) and the effective
tier are computed off-chain.

## Open items

Spec §13 lists what must be confirmed before implementation: Anubis asset
addresses and the existing AMM / turbine, emission start time / timezone /
month boundaries, power validity and holding-reward formula, community
snapshot, NFT carrier, LP price source and fee asset, the GG airdrop formula,
the reserve injection plan and price-protection trigger, and the
upgrade / multisig / timelock / pause policy.
