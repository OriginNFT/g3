import { parseAbi } from "viem";

// ComputingVault - 本位倉 (gold3.contract/contracts/ComputingVault.sol).
// participate() takes USDT (deposited 95/5 into the reserve / protection
// vaults, x2.5 power), GOT2 (burned, x2) or GG (burned, x2.5); every path
// pulls through allowance (transferFrom / burnFrom). claimHoldingReward()
// sends the pending GG to the turbine, never to the wallet.
export const COMPUTING_VAULT_ABI = parseAbi([
    "struct Position { address owner; address asset; uint256 inputAmount; uint256 usdtValue; uint256 power; uint64 createdAt; uint8 status; }",
    "function powerOf(address) view returns (uint256)",
    "function totalPower() view returns (uint256)",
    "function pendingHoldingReward(address account) view returns (uint256)",
    "function positionIdsOf(address account) view returns (uint256[])",
    "function getPosition(uint256 positionId) view returns (Position)",
    "function turbine() view returns (address)",
    "function USDT_POWER_BPS() view returns (uint256)",
    "function GOT2_BURN_POWER_BPS() view returns (uint256)",
    "function GG_BURN_POWER_BPS() view returns (uint256)",
    // ---- Writes ----
    "function participate(address asset, uint256 amount, uint256 minPower) returns (uint256 positionId)",
    "function claimHoldingReward() returns (uint256 amount)",
]);
