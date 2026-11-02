import { parseAbi } from "viem";

// ReserveVault / ProtectionVault (USDT) and InsuranceTreasury (GG) share the
// balance() view; the counters differ per vault.
export const RESERVE_VAULT_ABI = parseAbi([
    "function balance() view returns (uint256)",
    "function totalDeposited() view returns (uint256)",
    "function totalWithdrawn() view returns (uint256)",
]);

export const PROTECTION_VAULT_ABI = parseAbi([
    "function balance() view returns (uint256)",
    "function totalDeposited() view returns (uint256)",
    "function totalSpent() view returns (uint256)",
]);

export const INSURANCE_TREASURY_ABI = parseAbi([
    "function balance() view returns (uint256)",
    "function totalCredited() view returns (uint256)",
    "function totalPaid() view returns (uint256)",
]);
