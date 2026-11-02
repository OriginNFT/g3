import { parseAbi } from "viem";

// CommunityEngine - the community half of the daily emission. creditsOf is
// the GG credited to an account and not yet claimed.
export const COMMUNITY_ENGINE_ABI = parseAbi([
    "function creditsOf(address) view returns (uint256)",
    "function lastSettledDay() view returns (uint256)",
    "function communityBudgetOf(uint256) view returns (uint256)",
]);
