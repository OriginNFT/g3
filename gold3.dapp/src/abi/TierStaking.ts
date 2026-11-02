import { parseAbi } from "viem";

// TierStaking - the GG lock behind the community tier (G1-G7 by USDT value
// of the locked GG). Stake and unstake any time.
export const TIER_STAKING_ABI = parseAbi([
    "function lockedOf(address) view returns (uint256)",
    "function totalLocked() view returns (uint256)",
    "function lockedValueUSDT(address account) view returns (uint256)",
    "function stakeTierOf(address account) view returns (uint8)",
    "function G1_STAKE_USDT() view returns (uint256)",
    "function G2_STAKE_USDT() view returns (uint256)",
    "function G3_STAKE_USDT() view returns (uint256)",
    "function G4_STAKE_USDT() view returns (uint256)",
    "function G5_STAKE_USDT() view returns (uint256)",
    "function G6_STAKE_USDT() view returns (uint256)",
    "function G7_STAKE_USDT() view returns (uint256)",
    // ---- Writes ----
    "function stakeTierGG(uint256 amount)",
    "function unstakeTierGG(uint256 amount)",
]);
