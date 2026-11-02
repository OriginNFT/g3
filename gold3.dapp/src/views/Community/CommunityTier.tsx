import { useEffect, useMemo, useState } from "react";
import { t } from "@lingui/macro";
import { erc20Abi, parseUnits, zeroAddress } from "viem";
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { TIER_STAKING_ABI } from "src/abi/TierStaking";
import Card from "src/components/Card/Card";
import Icon from "src/components/Icon/Icon";
import ImageSlot from "src/components/ImageSlot/ImageSlot";
import KvList from "src/components/KvList/KvList";
import Progress from "src/components/Progress/Progress";
import Tabs from "src/components/Tabs/Tabs";
import { ANUBIS_CHAIN_ID, GG_ADDRESS, GG_DECIMALS, TIER_STAKING_ADDRESS, VALUE_DECIMALS } from "src/constants";
import { errorMessage, formatAmount } from "src/helpers/format";

// 社區等級 - TierStaking. The tier (G1-G7) follows the USDT value of the GG
// locked here; stake and unstake any time. Thresholds are read from the
// contract.

const DEPLOYED = TIER_STAKING_ADDRESS !== zeroAddress && GG_ADDRESS !== zeroAddress;
const DASH = "——";
const LEVELS = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];
const staking = { address: TIER_STAKING_ADDRESS, abi: TIER_STAKING_ABI, chainId: ANUBIS_CHAIN_ID } as const;

type Mode = "stake" | "unstake";

function fmtValue(value: bigint | undefined): string {
    return value === undefined ? DASH : formatAmount(value, VALUE_DECIMALS);
}

function CommunityTier() {
    const [mode, setMode] = useState<Mode>("stake");
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");
    const { address, isConnected } = useAccount();
    const account = address ?? zeroAddress;

    const thresholds = useReadContracts({
        allowFailure: false,
        contracts: [
            { ...staking, functionName: "G1_STAKE_USDT" },
            { ...staking, functionName: "G2_STAKE_USDT" },
            { ...staking, functionName: "G3_STAKE_USDT" },
            { ...staking, functionName: "G4_STAKE_USDT" },
            { ...staking, functionName: "G5_STAKE_USDT" },
            { ...staking, functionName: "G6_STAKE_USDT" },
            { ...staking, functionName: "G7_STAKE_USDT" },
            { ...staking, functionName: "totalLocked" },
        ],
        query: { enabled: DEPLOYED },
    });
    // lockedValueUSDT / stakeTierOf revert until GG has a price: allowFailure.
    const mine = useReadContracts({
        contracts: [
            { ...staking, functionName: "lockedOf", args: [account] },
            { ...staking, functionName: "lockedValueUSDT", args: [account] },
            { ...staking, functionName: "stakeTierOf", args: [account] },
            { address: GG_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: GG_ADDRESS, abi: erc20Abi, functionName: "allowance", args: [account, TIER_STAKING_ADDRESS], chainId: ANUBIS_CHAIN_ID },
        ],
        query: { enabled: DEPLOYED && !!address },
    });

    const { writeContractAsync, data: txHash, isPending: isSigning } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash, chainId: ANUBIS_CHAIN_ID });

    useEffect(() => {
        if (thresholds.error) console.error("tier: threshold reads failed:", thresholds.error.message, thresholds.error);
    }, [thresholds.error]);
    useEffect(() => {
        if (mine.error) console.error("tier: account reads failed:", mine.error.message, mine.error);
    }, [mine.error]);

    const refetchMine = mine.refetch;
    const refetchThresholds = thresholds.refetch;
    useEffect(() => {
        if (receipt.isSuccess) {
            refetchMine();
            refetchThresholds();
        }
    }, [receipt.isSuccess, refetchMine, refetchThresholds]);

    useEffect(() => {
        if (receipt.error) {
            console.error("tier: transaction failed:", receipt.error.message, receipt.error);
            setError(errorMessage(receipt.error));
        }
    }, [receipt.error]);

    const th = thresholds.data;
    const levels = th ? th.slice(0, 7) : undefined;
    const totalLocked = th?.[7];
    const m = mine.data;
    const locked = m?.[0].status === "success" ? m[0].result : undefined;
    const lockedValue = m?.[1].status === "success" ? m[1].result : undefined;
    const tier = m?.[2].status === "success" ? Number(m[2].result) : undefined;
    const balance = m?.[3].status === "success" ? m[3].result : undefined;
    const allowance = m?.[4].status === "success" ? m[4].result : undefined;
    const priceMissing = m !== undefined && m[1].status === "failure";

    const parsed = useMemo(() => {
        if (!amount) return 0n;
        try {
            return parseUnits(amount, GG_DECIMALS);
        } catch {
            return 0n;
        }
    }, [amount]);

    async function approve() {
        setError("");
        try {
            await writeContractAsync({
                address: GG_ADDRESS,
                abi: erc20Abi,
                functionName: "approve",
                args: [TIER_STAKING_ADDRESS, parsed],
                chainId: ANUBIS_CHAIN_ID,
            });
        } catch (err) {
            console.error("tier: approve failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    async function stake() {
        setError("");
        try {
            await writeContractAsync({ ...staking, functionName: "stakeTierGG", args: [parsed] });
        } catch (err) {
            console.error("tier: stakeTierGG failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    async function unstake() {
        setError("");
        try {
            await writeContractAsync({ ...staking, functionName: "unstakeTierGG", args: [parsed] });
        } catch (err) {
            console.error("tier: unstakeTierGG failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    const available = mode === "stake" ? balance : locked;
    const needsApproval = mode === "stake" && allowance !== undefined && parsed > allowance;
    let cta: { label: string; action?: () => void };
    if (!DEPLOYED) cta = { label: t`尚未上線` };
    else if (!isConnected) cta = { label: t`請先連接錢包` };
    else if (thresholds.isError || mine.isError) cta = { label: t`讀取失敗` };
    else if (th === undefined || m === undefined) cta = { label: t`讀取中` };
    else if (isSigning) cta = { label: t`請在錢包確認` };
    else if (receipt.isLoading) cta = { label: t`交易確認中…` };
    else if (parsed === 0n) cta = { label: t`請輸入數量` };
    else if (available !== undefined && parsed > available) cta = { label: mode === "stake" ? t`GG 餘額不足` : t`超過質押數量` };
    else if (needsApproval) cta = { label: t`授權 GG`, action: approve };
    else cta = mode === "stake" ? { label: t`質押`, action: stake } : { label: t`解押`, action: unstake };

    // Progress towards the next tier, by locked USDT value.
    const current = tier === undefined ? DASH : tier === 0 ? "G0" : `G${tier}`;
    const next = tier !== undefined && levels !== undefined && tier < 7 ? levels[tier] : undefined;
    const prev = tier !== undefined && levels !== undefined && tier > 0 ? levels[tier - 1] : 0n;
    const progress =
        next !== undefined && lockedValue !== undefined ? Number(((lockedValue - prev) * 10_000n) / (next - prev)) / 100 : tier === 7 ? 100 : 0;
    const shortfall = next !== undefined && lockedValue !== undefined && next > lockedValue ? next - lockedValue : 0n;
    const nextLevel = `G${(tier ?? 0) + 1}`;
    const shortfallText = fmtValue(shortfall);

    const readError = thresholds.error ?? mine.error;
    const message = error || (readError ? t`讀取失敗：${errorMessage(readError)}` : "") || (priceMissing ? t`GG 尚無價格，等級暫無法計算。` : "");
    const availableText = available === undefined ? DASH : formatAmount(available, GG_DECIMALS);

    return (
        <Card icon="crown" title={t`社區等級`} subtitle={t`質押 GG 提升等級 · 隨時可解押`}>
            <div className="gp-grid gp-grid-2 gp-grid-tight">
                <div className={`gp-subcard ${DEPLOYED ? "" : "is-disabled"}`}>
                    <div className="gp-level-chips">
                        {LEVELS.map((level, i) => (
                            <span key={level} className={`gp-level-chip ${tier !== undefined && tier === i + 1 ? "is-active" : ""}`}>
                                {level}
                            </span>
                        ))}
                    </div>
                    <div className="gp-level-current">
                        <ImageSlot label={current} shape="circle" width={84} />
                        <div className="gp-grow">
                            <div className="gp-row gp-between">
                                <span className="gp-strong-lg">{t`當前等級 ${current}`}</span>
                                <span className="gp-muted gp-small">
                                    {fmtValue(lockedValue)} / {next === undefined ? DASH : fmtValue(next)} USDT
                                </span>
                            </div>
                            <Progress value={progress} tone="gold" />
                            <div className="gp-muted gp-small">
                                {next === undefined ? t`已達最高等級` : t`升級至 ${nextLevel} 還需 ${shortfallText} USDT`}
                            </div>
                        </div>
                    </div>
                    <KvList
                        compact
                        className="gp-kv--boxed"
                        rows={[
                            [t`我的質押`, `${locked === undefined ? DASH : formatAmount(locked, GG_DECIMALS)} GG`],
                            [t`質押估值`, `${fmtValue(lockedValue)} USDT`],
                            [t`全網質押`, `${totalLocked === undefined ? DASH : formatAmount(totalLocked, GG_DECIMALS)} GG`],
                        ]}
                    />
                    <h4 className="gp-subcard-title">{t`等級門檻（質押 GG 的 USDT 估值）`}</h4>
                    <KvList compact rows={LEVELS.map((level, i) => [level, `${levels === undefined ? DASH : fmtValue(levels[i])} USDT`])} />
                </div>

                <div className="gp-subcard gp-fundraise">
                    <div className="gp-fundraise-body">
                        <Tabs
                            tabs={[
                                { key: "stake", label: t`質押` },
                                { key: "unstake", label: t`解押` },
                            ]}
                            value={mode}
                            onChange={next => {
                                setMode(next);
                                setAmount("");
                            }}
                        />
                        <div className="gp-row gp-between gp-muted gp-small">
                            <span>{mode === "stake" ? t`可用餘額` : t`質押中`}</span>
                            <span>{availableText} GG</span>
                        </div>
                        <div className="gp-fundraise-input">
                            <input
                                className="gp-amount-input"
                                placeholder="0.00"
                                inputMode="decimal"
                                value={amount}
                                onChange={event => {
                                    if (/^\d*(\.\d*)?$/.test(event.target.value)) setAmount(event.target.value);
                                }}
                                disabled={!DEPLOYED}
                            />
                            <span className="gp-strong">GG</span>
                        </div>
                        <button type="button" className="gp-btn gp-btn-primary gp-btn-block" onClick={cta.action} disabled={!cta.action}>
                            {cta.label}
                            <Icon name="arrowRight" size={16} />
                        </button>
                        {message && <p className="gp-fundraise-error gp-small">{message}</p>}
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default CommunityTier;
