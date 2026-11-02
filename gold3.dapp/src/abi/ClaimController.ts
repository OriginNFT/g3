import { parseAbi } from "viem";

// ClaimController - claims community GG: consumes NFT rights at the live GG
// price and pays out through CommunityEngine (to the turbine).
export const CLAIM_CONTROLLER_ABI = parseAbi([
    "function claimable(address account) view returns (uint256)",
    // ---- Writes ----
    "function claimCommunityGG(uint256 amount)",
]);
