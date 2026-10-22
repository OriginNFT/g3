# GOLDEN PACT · GG 黃金本位倉

Framework stage: contracts are signatures only, the dapp pages are static mock
data from the design boards. Nothing is wired to anything yet.

## Modules

| module | what it is |
| --- | --- |
| `gold3.contract` | the protocol skeleton: Solidity 0.8.24 (evm shanghai) + OpenZeppelin 5.4 upgradeable, hardhat 2 / ethers v6 |
| `gold3.dapp` | end-user dapp skeleton (vite + React + MUI + wagmi + RainbowKit + lingui, zh-TW) |

## Source of truth

- Contracts: `Golden_Pact_GG_智能合约技术开发规范_V1.0` (the spec).
- Pages: the design boards, copied as they are. Where the boards and the spec
  disagree (DAI vs USDT, P1–P7 vs G1–G7, the emission phase months, the 95/5
  split drawn over the 84M supply) the pages follow the boards for now.

## Differences from helix

1. Emission budget is monthly (120 months, five phases), not per epoch.
2. Participation funds: 95% to the protocol reserve (`ReserveVault`), 5% to the
   price-protection address (`ProtectionVault`), whose future whitelist buys
   on the market.
3. Tier (G1–G7) is set by GG locked in `TierStaking`, valued at the live price.
   A drop in value or an unlock downgrades. Locked GG is never released
   linearly and earns nothing.
4. No right helix. LP staking instead (`LPStakeVault`): staked LP earns a fee
   share and a GG airdrop; exiting burns part of the underlying pair by holding
   period (`LPExitBurn`).
