import { parseAbi } from "viem";

// EmissionController - the 67.2M GG / 120-month plan. genesisTimestamp is 0
// until set; cumulativeBudget() and dayStart() revert before that.
export const EMISSION_CONTROLLER_ABI = parseAbi([
    "function genesisTimestamp() view returns (uint256)",
    "function lastSettledDay() view returns (uint256)",
    "function currentDay() view returns (uint256)",
    "function phaseEndDay(uint256) view returns (uint256)",
    "function cumulativeBudget(uint256 dayId) view returns (uint256)",
    "function dayBudget(uint256 dayId) view returns (uint256)",
    "function TOTAL_BUDGET() view returns (uint256)",
    "function PHASE1_BUDGET() view returns (uint256)",
    "function PHASE2_BUDGET() view returns (uint256)",
    "function PHASE3_BUDGET() view returns (uint256)",
    "function PHASE4_BUDGET() view returns (uint256)",
    "function PHASE5_BUDGET() view returns (uint256)",
]);
