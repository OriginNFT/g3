import { BaseError, formatUnits } from "viem";

/** 84000000 -> "8,400萬". Axis labels only; display values are mock strings for now. */
export function formatWan(value: number): string {
    if (value === 0) return "0";
    return `${(value / 10_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}萬`;
}

/** 1500000 -> "1.5M". Axis labels only. */
export function formatCompact(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return String(value);
}

/** 1234567890000000000000n, 18 -> "1,234.57". Chain amounts for display. */
export function formatAmount(value: bigint, decimals: number, digits = 2): string {
    return Number(formatUnits(value, decimals)).toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

/** The wallet / RPC error in one line (viem's shortMessage when it has one). */
export function errorMessage(err: unknown): string {
    return err instanceof BaseError ? err.shortMessage : (err as Error).message;
}
