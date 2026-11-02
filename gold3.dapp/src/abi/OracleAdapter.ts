import { parseAbi } from "viem";

// OracleAdapter - TWAP prices in USDT, 1e18 = 1 USDT. priceUSDT() reverts
// "no price" for a token without a pair, so read it with allowFailure.
export const ORACLE_ADAPTER_ABI = parseAbi([
    "function priceUSDT(address token) view returns (uint256)",
    "function valueUSDT(address token, uint256 amount) view returns (uint256)",
]);
