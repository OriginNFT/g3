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
