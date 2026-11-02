import { parseAbi } from "viem";

// NFTRightsLedger - NFT 權益額度 in USDT (1e18). burnForNFTRights() burns GG
// (x3) or GOT2 (x2) through burnFrom, so the ledger needs allowance first.
export const NFT_RIGHTS_LEDGER_ABI = parseAbi([
    "function rightsOf(address) view returns (uint256)",
    "function totalCreatedOf(address) view returns (uint256)",
    "function totalConsumedOf(address) view returns (uint256)",
    "function GOT2_RIGHTS_BPS() view returns (uint256)",
    "function GG_RIGHTS_BPS() view returns (uint256)",
    // ---- Writes ----
    "function burnForNFTRights(address asset, uint256 amount) returns (uint256 rights)",
]);
