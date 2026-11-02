// ============ chain ============

export const ANUBIS_CHAIN_ID = 6714;
export const ANUBIS_RPC_URL: string = import.meta.env.VITE_APP_RPC_URL || "https://rpc2.anubispace.org";
export const ANUBIS_EXPLORER_URL = "https://anubisscan.io";

// ============ shared contracts ============

// The Anubis 2.0 Community of GOLDEN PACT (goldenpact/gp.contract
// config/addresses.json, anubis "2.0_COMMUNITY_ADDRESS"). gold3 has no referral
// tree of its own.
export const COMMUNITY_ADDRESS = "0xB824e39FAbA672bC0db2B5B006Cb7B9092923989";

// ============ tokens ============

export const USDT_ADDRESS = "0xDfb6a28BC6DC51fed17c27C880F2c66cDd040A3e";
// Anubis USDT has 6 decimals (BSC USDT has 18).
export const USDT_DECIMALS = 6;

// ============ gold3 contracts ============

// Gold3Fundraise. The zero address until it is deployed: the fundraise page
// then shows 尚未上線 and every action is disabled.
export const FUNDRAISE_ADDRESS: `0x${string}` = "0x57a2d3c5FBA1801562A5A15319AEfAe0a5E35b04";

// Left-helix contracts (gold3.contract/config/addresses.json, same keys).
// Zero until deployed: a page whose contracts are zero shows 尚未上線 and
// keeps every action disabled.
export const GG_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const GOT2_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const AUG_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const COMPUTING_VAULT_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const EMISSION_CONTROLLER_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const COMMUNITY_ENGINE_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const TIER_STAKING_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const NFT_RIGHTS_LEDGER_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const CLAIM_CONTROLLER_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const ORACLE_ADAPTER_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const ALLOCATION_VAULT_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const INSURANCE_TREASURY_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const RESERVE_VAULT_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";
export const PROTECTION_VAULT_ADDRESS: `0x${string}` = "0x0000000000000000000000000000000000000000";

// GG is 18 decimals; GOT2 / AUG decimals are read from the chain.
export const GG_DECIMALS = 18;
// OracleAdapter prices and values, ComputingVault power and NFT rights are all
// 1e18 = 1 USDT.
export const VALUE_DECIMALS = 18;
