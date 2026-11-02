import { useEffect } from "react";
import { t } from "@lingui/macro";
import { erc20Abi, keccak256, toBytes, zeroAddress } from "viem";
import { useReadContracts } from "wagmi";

import { ALLOCATION_VAULT_ABI } from "src/abi/AllocationVault";
import { COMPUTING_VAULT_ABI } from "src/abi/ComputingVault";
import { EMISSION_CONTROLLER_ABI } from "src/abi/EmissionController";
import { ORACLE_ADAPTER_ABI } from "src/abi/OracleAdapter";
import { INSURANCE_TREASURY_ABI, PROTECTION_VAULT_ABI, RESERVE_VAULT_ABI } from "src/abi/Vaults";
import {
    ALLOCATION_VAULT_ADDRESS,
    ANUBIS_CHAIN_ID,
    COMPUTING_VAULT_ADDRESS,
    EMISSION_CONTROLLER_ADDRESS,
    GG_ADDRESS,
    INSURANCE_TREASURY_ADDRESS,
    ORACLE_ADAPTER_ADDRESS,
    PROTECTION_VAULT_ADDRESS,
    RESERVE_VAULT_ADDRESS,
    GG_DECIMALS,
    USDT_DECIMALS,
} from "src/constants";
import { formatAmount } from "src/helpers/format";
import { ACCENT, GOLD } from "src/themes/tokens";

// The chain figures behind 數據總覽 and its detail boards. Every contract is
// read on its own so a missing deployment or a reverting view (GG price
// before the pair is set, cumulativeBudget before genesis) leaves only its
// own figures undefined.

export const BUCKET_INITIAL_LIQUIDITY = keccak256(toBytes("INITIAL_LIQUIDITY"));
export const BUCKET_INSURANCE_RESERVE = keccak256(toBytes("INSURANCE_RESERVE"));
export const BUCKET_EMISSION_BUDGET = keccak256(toBytes("EMISSION_BUDGET"));

const emission = { address: EMISSION_CONTROLLER_ADDRESS, abi: EMISSION_CONTROLLER_ABI, chainId: ANUBIS_CHAIN_ID } as const;
const allocation = { address: ALLOCATION_VAULT_ADDRESS, abi: ALLOCATION_VAULT_ABI, chainId: ANUBIS_CHAIN_ID } as const;

function result<T>(entry: { status: "success" | "failure"; result?: unknown } | undefined): T | undefined {
    return entry?.status === "success" ? (entry.result as T) : undefined;
}

export type Phase = { budget: bigint; endDay: bigint };

export function useOverviewData() {
    const token = useReadContracts({
        contracts: [
            { address: GG_ADDRESS, abi: erc20Abi, functionName: "totalSupply", chainId: ANUBIS_CHAIN_ID },
            { address: GG_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [ALLOCATION_VAULT_ADDRESS], chainId: ANUBIS_CHAIN_ID },
            { address: GG_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [INSURANCE_TREASURY_ADDRESS], chainId: ANUBIS_CHAIN_ID },
            { address: ORACLE_ADAPTER_ADDRESS, abi: ORACLE_ADAPTER_ABI, functionName: "priceUSDT", args: [GG_ADDRESS], chainId: ANUBIS_CHAIN_ID },
        ],
        query: { enabled: GG_ADDRESS !== zeroAddress },
    });

    const plan = useReadContracts({
        contracts: [
            { ...emission, functionName: "genesisTimestamp" },
            { ...emission, functionName: "lastSettledDay" },
            { ...emission, functionName: "TOTAL_BUDGET" },
            { ...emission, functionName: "PHASE1_BUDGET" },
            { ...emission, functionName: "PHASE2_BUDGET" },
            { ...emission, functionName: "PHASE3_BUDGET" },
            { ...emission, functionName: "PHASE4_BUDGET" },
            { ...emission, functionName: "PHASE5_BUDGET" },
            { ...emission, functionName: "phaseEndDay", args: [0n] },
            { ...emission, functionName: "phaseEndDay", args: [1n] },
            { ...emission, functionName: "phaseEndDay", args: [2n] },
            { ...emission, functionName: "phaseEndDay", args: [3n] },
            { ...emission, functionName: "phaseEndDay", args: [4n] },
        ],
        query: { enabled: EMISSION_CONTROLLER_ADDRESS !== zeroAddress },
    });
    const lastSettledDay = result<bigint>(plan.data?.[1]);
    const released = useReadContracts({
        contracts: [{ ...emission, functionName: "cumulativeBudget", args: [lastSettledDay ?? 0n] }],
        query: { enabled: EMISSION_CONTROLLER_ADDRESS !== zeroAddress && lastSettledDay !== undefined },
    });

    const buckets = useReadContracts({
        contracts: [
            { ...allocation, functionName: "INITIAL_LIQUIDITY" },
            { ...allocation, functionName: "INSURANCE_RESERVE" },
            { ...allocation, functionName: "EMISSION_BUDGET" },
            { ...allocation, functionName: "isReleased", args: [BUCKET_INITIAL_LIQUIDITY] },
            { ...allocation, functionName: "isReleased", args: [BUCKET_INSURANCE_RESERVE] },
            { ...allocation, functionName: "isReleased", args: [BUCKET_EMISSION_BUDGET] },
        ],
        query: { enabled: ALLOCATION_VAULT_ADDRESS !== zeroAddress },
    });

    const vaults = useReadContracts({
        contracts: [
            { address: RESERVE_VAULT_ADDRESS, abi: RESERVE_VAULT_ABI, functionName: "balance", chainId: ANUBIS_CHAIN_ID },
            { address: RESERVE_VAULT_ADDRESS, abi: RESERVE_VAULT_ABI, functionName: "totalDeposited", chainId: ANUBIS_CHAIN_ID },
            { address: RESERVE_VAULT_ADDRESS, abi: RESERVE_VAULT_ABI, functionName: "totalWithdrawn", chainId: ANUBIS_CHAIN_ID },
            { address: PROTECTION_VAULT_ADDRESS, abi: PROTECTION_VAULT_ABI, functionName: "balance", chainId: ANUBIS_CHAIN_ID },
            { address: PROTECTION_VAULT_ADDRESS, abi: PROTECTION_VAULT_ABI, functionName: "totalDeposited", chainId: ANUBIS_CHAIN_ID },
            { address: PROTECTION_VAULT_ADDRESS, abi: PROTECTION_VAULT_ABI, functionName: "totalSpent", chainId: ANUBIS_CHAIN_ID },
            { address: INSURANCE_TREASURY_ADDRESS, abi: INSURANCE_TREASURY_ABI, functionName: "balance", chainId: ANUBIS_CHAIN_ID },
            { address: INSURANCE_TREASURY_ADDRESS, abi: INSURANCE_TREASURY_ABI, functionName: "totalPaid", chainId: ANUBIS_CHAIN_ID },
            { address: COMPUTING_VAULT_ADDRESS, abi: COMPUTING_VAULT_ABI, functionName: "totalPower", chainId: ANUBIS_CHAIN_ID },
        ],
        query: {
            enabled:
                RESERVE_VAULT_ADDRESS !== zeroAddress ||
                PROTECTION_VAULT_ADDRESS !== zeroAddress ||
                INSURANCE_TREASURY_ADDRESS !== zeroAddress ||
                COMPUTING_VAULT_ADDRESS !== zeroAddress,
        },
    });

    useEffect(() => {
        if (token.error) console.error("overview: GG reads failed:", token.error.message, token.error);
    }, [token.error]);
    useEffect(() => {
        if (plan.error) console.error("overview: emission reads failed:", plan.error.message, plan.error);
    }, [plan.error]);
    useEffect(() => {
        if (released.error) console.error("overview: cumulativeBudget read failed:", released.error.message, released.error);
    }, [released.error]);
    useEffect(() => {
        if (buckets.error) console.error("overview: allocation reads failed:", buckets.error.message, buckets.error);
    }, [buckets.error]);
    useEffect(() => {
        if (vaults.error) console.error("overview: vault reads failed:", vaults.error.message, vaults.error);
    }, [vaults.error]);

    const totalSupply = result<bigint>(token.data?.[0]);
    const vaultHeld = result<bigint>(token.data?.[1]);
    const treasuryHeld = result<bigint>(token.data?.[2]);
    const circulating =
        totalSupply !== undefined && vaultHeld !== undefined && treasuryHeld !== undefined
            ? totalSupply - vaultHeld - treasuryHeld
            : undefined;

    const p = plan.data;
    const phases: Phase[] | undefined = p
        ? [0, 1, 2, 3, 4].map(i => ({ budget: result<bigint>(p[3 + i]) ?? 0n, endDay: result<bigint>(p[8 + i]) ?? 0n }))
        : undefined;

    const v = vaults.data;
    return {
        ggPrice: result<bigint>(token.data?.[3]),
        totalSupply,
        circulating,
        genesis: result<bigint>(p?.[0]),
        lastSettledDay,
        totalBudget: result<bigint>(p?.[2]),
        released: result<bigint>(released.data?.[0]),
        phases,
        initialLiquidity: result<bigint>(buckets.data?.[0]),
        insuranceReserve: result<bigint>(buckets.data?.[1]),
        emissionBudget: result<bigint>(buckets.data?.[2]),
        initialLiquidityReleased: result<boolean>(buckets.data?.[3]),
        insuranceReserveReleased: result<boolean>(buckets.data?.[4]),
        emissionBudgetReleased: result<boolean>(buckets.data?.[5]),
        reserveBalance: result<bigint>(v?.[0]),
        reserveDeposited: result<bigint>(v?.[1]),
        reserveWithdrawn: result<bigint>(v?.[2]),
        protectionBalance: result<bigint>(v?.[3]),
        protectionDeposited: result<bigint>(v?.[4]),
        protectionSpent: result<bigint>(v?.[5]),
        treasuryBalance: result<bigint>(v?.[6]),
        treasuryPaid: result<bigint>(v?.[7]),
        totalPower: result<bigint>(v?.[8]),
    };
}

/** Percent of a phase's days settled: 0 before it starts, 100 once past its end. */
export function phaseProgress(phases: Phase[], index: number, lastSettledDay: bigint): number {
    const start = index === 0 ? 1n : phases[index - 1].endDay + 1n;
    const end = phases[index].endDay;
    if (end === 0n || lastSettledDay < start) return 0;
    if (lastSettledDay >= end) return 100;
    return Number(((lastSettledDay - start + 1n) * 10_000n) / (end - start + 1n)) / 100;
}

const DASH = "——";

export function gg(value: bigint | undefined, digits = 0): string {
    return value === undefined ? DASH : formatAmount(value, GG_DECIMALS, digits);
}
export function usdt(value: bigint | undefined): string {
    return value === undefined ? DASH : formatAmount(value, USDT_DECIMALS);
}
export function pct(part: bigint | undefined, whole: bigint | undefined): number {
    if (part === undefined || whole === undefined || whole === 0n) return 0;
    return Number((part * 10_000n) / whole) / 100;
}

export function useAllocationItems() {
    const d = useOverviewData();
    const items = [
        { label: t`初始流動性（8%）`, amount: d.initialLiquidity, released: d.initialLiquidityReleased, color: GOLD },
        { label: t`保險庫儲備（12%）`, amount: d.insuranceReserve, released: d.insuranceReserveReleased, color: "#CFE3FB" },
        { label: t`排放預算（80%）`, amount: d.emissionBudget, released: d.emissionBudgetReleased, color: ACCENT },
    ];
    const legend = items.map(item => ({
        label: item.label,
        color: item.color,
        amount: `${gg(item.amount)} GG`,
        percent: item.released === undefined ? DASH : item.released ? t`已釋放` : t`未釋放`,
        value: item.amount === undefined ? 0 : Number(item.amount / 10n ** 18n),
    }));
    return { data: d, legend };
}
