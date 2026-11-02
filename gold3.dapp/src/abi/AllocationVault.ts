import { parseAbi } from "viem";

// AllocationVault - holds the 84M GG at mint and releases the three buckets
// once each. isReleased is keyed by keccak256 of the bucket name.
export const ALLOCATION_VAULT_ABI = parseAbi([
    "function INITIAL_LIQUIDITY() view returns (uint256)",
    "function INSURANCE_RESERVE() view returns (uint256)",
    "function EMISSION_BUDGET() view returns (uint256)",
    "function isReleased(bytes32) view returns (bool)",
]);
