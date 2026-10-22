import { parseAbi } from "viem";

// Gold3Fundraise - the USDT raise ledger (gold3.contract/contracts/Gold3Fundraise.sol).
// stats() is the header in one call; a limit reads back as 0 when it is off.
// remainingOf() is type(uint256).max when the per-address cap is off.
// startTime() is the unix time before which subscribe() reverts; 0 = none.
export const GOLD3_FUNDRAISE_ABI = parseAbi([
    "function stats() view returns (uint256 raised, uint256 target, uint256 minContribution, uint256 maxPerAddress, uint256 records, bool closed)",
    "function startTime() view returns (uint256)",
    "function totalUsdtOf(address) view returns (uint256)",
    "function userRecordCount(address) view returns (uint256)",
    "function remainingOf(address) view returns (uint256)",
    // ---- Writes ----
    "function subscribe(uint256 amount)",
]);
