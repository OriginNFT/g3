import { useEffect, useMemo, useState } from "react";
import { t } from "@lingui/macro";
import { erc20Abi, parseUnits, zeroAddress } from "viem";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { COMPUTING_VAULT_ABI } from "src/abi/ComputingVault";
import { ORACLE_ADAPTER_ABI } from "src/abi/OracleAdapter";
import Card from "src/components/Card/Card";
import Icon from "src/components/Icon/Icon";
import KvList from "src/components/KvList/KvList";
import PageHeader from "src/components/PageHeader/PageHeader";
import StatCard from "src/components/StatCard/StatCard";
import Tabs from "src/components/Tabs/Tabs";
import {
    ANUBIS_CHAIN_ID,
    COMPUTING_VAULT_ADDRESS,
    GG_ADDRESS,
    GG_DECIMALS,
    GOT2_ADDRESS,
    ORACLE_ADAPTER_ADDRESS,
    USDT_ADDRESS,
    USDT_DECIMALS,
    VALUE_DECIMALS,
} from "src/constants";
import { errorMessage, formatAmount } from "src/helpers/format";

// 本位倉算力 - ComputingVault. Participate with USDT (deposited), GOT2 or GG
// (burned); the position's power is permanent and earns the daily holding
// reward, claimed to the turbine. Power and USDT values are 1e18 = 1 USDT.

const DEPLOYED =
    COMPUTING_VAULT_ADDRESS !== zeroAddress &&
    ORACLE_ADAPTER_ADDRESS !== zeroAddress &&
    GG_ADDRESS !== zeroAddress &&
    GOT2_ADDRESS !== zeroAddress;
const DASH = "——";
const BPS = 10_000n;
// The TWAP can move between the quote and the transaction: participate()
// reverts below minPower, which is set 1% under the quoted power.
const MIN_POWER_BPS = 9_900n;

type Asset = "USDT" | "GOT2" | "GG";

const ASSETS: Record<Asset, { address: `0x${string}`; burned: boolean }> = {
    USDT: { address: USDT_ADDRESS, burned: false },
    GOT2: { address: GOT2_ADDRESS, burned: true },
    GG: { address: GG_ADDRESS, burned: true },
};

function fmtValue(value: bigint | undefined): string {
    return value === undefined ? DASH : formatAmount(value, VALUE_DECIMALS);
}

function fmtTime(seconds: bigint): string {
    return new Date(Number(seconds) * 1000).toLocaleString("sv-SE", { timeZone: "Asia/Singapore" }).slice(0, 16);
}

function Power() {
    const [asset, setAsset] = useState<Asset>("USDT");
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");
    const { address, isConnected } = useAccount();
    const account = address ?? zeroAddress;
    const assetAddress = ASSETS[asset].address;

    const global = useReadContracts({
        allowFailure: false,
        contracts: [
            { address: COMPUTING_VAULT_ADDRESS, abi: COMPUTING_VAULT_ABI, functionName: "totalPower", chainId: ANUBIS_CHAIN_ID },
            { address: COMPUTING_VAULT_ADDRESS, abi: COMPUTING_VAULT_ABI, functionName: "turbine", chainId: ANUBIS_CHAIN_ID },
            { address: COMPUTING_VAULT_ADDRESS, abi: COMPUTING_VAULT_ABI, functionName: "USDT_POWER_BPS", chainId: ANUBIS_CHAIN_ID },
            { address: COMPUTING_VAULT_ADDRESS, abi: COMPUTING_VAULT_ABI, functionName: "GOT2_BURN_POWER_BPS", chainId: ANUBIS_CHAIN_ID },
            { address: COMPUTING_VAULT_ADDRESS, abi: COMPUTING_VAULT_ABI, functionName: "GG_BURN_POWER_BPS", chainId: ANUBIS_CHAIN_ID },
            { address: GOT2_ADDRESS, abi: erc20Abi, functionName: "decimals", chainId: ANUBIS_CHAIN_ID },
        ],
        query: { enabled: DEPLOYED },
    });
    const mine = useReadContracts({
        allowFailure: false,
        contracts: [
            { address: COMPUTING_VAULT_ADDRESS, abi: COMPUTING_VAULT_ABI, functionName: "powerOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: COMPUTING_VAULT_ADDRESS, abi: COMPUTING_VAULT_ABI, functionName: "pendingHoldingReward", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: COMPUTING_VAULT_ADDRESS, abi: COMPUTING_VAULT_ABI, functionName: "positionIdsOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: assetAddress, abi: erc20Abi, functionName: "balanceOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: assetAddress, abi: erc20Abi, functionName: "allowance", args: [account, COMPUTING_VAULT_ADDRESS], chainId: ANUBIS_CHAIN_ID },
        ],
        query: { enabled: DEPLOYED && !!address },
    });

    const g = global.data;
    const totalPower = g?.[0];
    const turbine = g?.[1];
    const multiplierBps = g === undefined ? undefined : asset === "USDT" ? g[2] : asset === "GOT2" ? g[3] : g[4];
    const got2Decimals = g?.[5];
    const decimals = asset === "USDT" ? USDT_DECIMALS : asset === "GG" ? GG_DECIMALS : got2Decimals;

    const m = mine.data;
    const myPower = m?.[0];
    const pending = m?.[1];
    const positionIds = m?.[2];
    const balance = m?.[3];
    const allowance = m?.[4];

    const positions = useReadContracts({
        allowFailure: false,
        contracts: (positionIds ?? []).map(id => ({
            address: COMPUTING_VAULT_ADDRESS,
            abi: COMPUTING_VAULT_ABI,
            functionName: "getPosition" as const,
            args: [id] as const,
            chainId: ANUBIS_CHAIN_ID,
        })),
        query: { enabled: DEPLOYED && positionIds !== undefined && positionIds.length > 0 },
    });

    const parsed = useMemo(() => {
        if (!amount || decimals === undefined) return 0n;
        try {
            return parseUnits(amount, decimals);
        } catch {
            return 0n;
        }
    }, [amount, decimals]);

    const quote = useReadContract({
        address: ORACLE_ADAPTER_ADDRESS,
        abi: ORACLE_ADAPTER_ABI,
        functionName: "valueUSDT",
        args: [assetAddress, parsed],
        chainId: ANUBIS_CHAIN_ID,
        query: { enabled: DEPLOYED && parsed > 0n },
    });

    const { writeContractAsync, data: txHash, isPending: isSigning } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash, chainId: ANUBIS_CHAIN_ID });

    useEffect(() => {
        if (global.error) console.error("power: vault reads failed:", global.error.message, global.error);
    }, [global.error]);
    useEffect(() => {
        if (mine.error) console.error("power: account reads failed:", mine.error.message, mine.error);
    }, [mine.error]);
    useEffect(() => {
        if (positions.error) console.error("power: position reads failed:", positions.error.message, positions.error);
    }, [positions.error]);
    useEffect(() => {
        if (quote.error) console.error("power: valueUSDT quote failed:", quote.error.message, quote.error);
    }, [quote.error]);

    const refetchGlobal = global.refetch;
    const refetchMine = mine.refetch;
    useEffect(() => {
        if (receipt.isSuccess) {
            refetchGlobal();
            refetchMine();
        }
    }, [receipt.isSuccess, refetchGlobal, refetchMine]);

    useEffect(() => {
        if (receipt.error) {
            console.error("power: transaction failed:", receipt.error.message, receipt.error);
            setError(errorMessage(receipt.error));
        }
    }, [receipt.error]);

    const quotedValue = parsed > 0n ? quote.data : 0n;
    const quotedPower = quotedValue !== undefined && multiplierBps !== undefined ? (quotedValue * multiplierBps) / BPS : undefined;
    const minPower = quotedPower !== undefined ? (quotedPower * MIN_POWER_BPS) / BPS : 0n;
    const insufficient = balance !== undefined && parsed > balance;
    const needsApproval = allowance !== undefined && parsed > allowance;
    const multiplierText = multiplierBps !== undefined ? `${Number(multiplierBps) / 100 / 100}x` : DASH;

    async function approve() {
        setError("");
        try {
            await writeContractAsync({
                address: assetAddress,
                abi: erc20Abi,
                functionName: "approve",
                args: [COMPUTING_VAULT_ADDRESS, parsed],
                chainId: ANUBIS_CHAIN_ID,
            });
        } catch (err) {
            console.error("power: approve failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    async function participate() {
        setError("");
        try {
            await writeContractAsync({
                address: COMPUTING_VAULT_ADDRESS,
                abi: COMPUTING_VAULT_ABI,
                functionName: "participate",
                args: [assetAddress, parsed, minPower],
                chainId: ANUBIS_CHAIN_ID,
            });
        } catch (err) {
            console.error("power: participate failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    async function claim() {
        setError("");
        try {
            await writeContractAsync({
                address: COMPUTING_VAULT_ADDRESS,
                abi: COMPUTING_VAULT_ABI,
                functionName: "claimHoldingReward",
                chainId: ANUBIS_CHAIN_ID,
            });
        } catch (err) {
            console.error("power: claimHoldingReward failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    const busy = isSigning || receipt.isLoading;
    let cta: { label: string; action?: () => void };
    if (!DEPLOYED) cta = { label: t`尚未上線` };
    else if (!isConnected) cta = { label: t`請先連接錢包` };
    else if (global.isError || mine.isError) cta = { label: t`讀取失敗` };
    else if (g === undefined || m === undefined) cta = { label: t`讀取中` };
    else if (isSigning) cta = { label: t`請在錢包確認` };
    else if (receipt.isLoading) cta = { label: t`交易確認中…` };
    else if (parsed === 0n) cta = { label: t`請輸入金額` };
    else if (insufficient) cta = { label: t`${asset} 餘額不足` };
    else if (quote.isError) cta = { label: t`報價失敗` };
    else if (quotedPower === undefined) cta = { label: t`報價中` };
    else if (quotedPower === 0n) cta = { label: t`算力為 0` };
    else if (needsApproval) cta = { label: t`授權 ${asset}`, action: approve };
    else cta = { label: ASSETS[asset].burned ? t`銷毀並參與` : t`參與`, action: participate };

    let claimLabel = t`領取`;
    let claimAction: (() => void) | undefined;
    if (!DEPLOYED) claimLabel = t`尚未上線`;
    else if (!isConnected) claimLabel = t`請先連接錢包`;
    else if (turbine === zeroAddress) claimLabel = t`尚未開放領取`;
    else if (busy) claimLabel = t`處理中…`;
    else if (pending !== undefined && pending > 0n) claimAction = claim;

    const readError = global.error ?? mine.error ?? positions.error;
    const message = error || (readError ? t`讀取失敗：${errorMessage(readError)}` : "");

    const balanceText = balance !== undefined && decimals !== undefined ? formatAmount(balance, decimals) : DASH;
    const assetNames: Record<Asset, string> = { USDT: "USDT", GOT2: "GOT2", GG: "GG" };
    const assetOf = (addr: string): Asset => (addr === USDT_ADDRESS ? "USDT" : addr === GOT2_ADDRESS ? "GOT2" : "GG");
    const decimalsOf = (a: Asset) => (a === "USDT" ? USDT_DECIMALS : a === "GG" ? GG_DECIMALS : got2Decimals);

    return (
        <div className="gp-stack gp-fundraise">
            <PageHeader title={t`本位倉算力`} subtitle={t`以 USDT、GOT2 或 GG 參與，算力永久有效，每日分享持倉排放`} />

            {!DEPLOYED && (
                <div className="gp-fundraise-banner">
                    <Icon name="info" size={18} />
                    <div>
                        <div className="gp-strong">{t`尚未上線`}</div>
                        <div className="gp-small">{t`本位倉合約尚未部署到此網路。`}</div>
                    </div>
                </div>
            )}

            <div className={`gp-grid gp-grid-4 ${DEPLOYED ? "" : "is-disabled"}`}>
                <StatCard icon="power" label={t`我的算力`} value={fmtValue(myPower)} unit="USDT" />
                <StatCard icon="database" label={t`全網算力`} value={fmtValue(totalPower)} unit="USDT" />
                <StatCard
                    icon="sprout"
                    label={t`待領取持倉獎勵`}
                    value={pending === undefined ? DASH : formatAmount(pending, GG_DECIMALS)}
                    unit="GG"
                    footer={
                        <button type="button" className="gp-btn gp-btn-outline gp-btn-sm" onClick={claimAction} disabled={!claimAction}>
                            {claimLabel}
                        </button>
                    }
                />
                <StatCard icon="layers" label={t`持倉筆數`} value={positionIds === undefined ? DASH : String(positionIds.length)} />
            </div>

            <Card icon="coins" title={t`參與本位倉`} right={<span className="gp-muted gp-small">{t`可用餘額：${balanceText} ${asset}`}</span>}>
                <div className="gp-fundraise-body">
                    <Tabs
                        tabs={[
                            { key: "USDT", label: "USDT" },
                            { key: "GOT2", label: "GOT2" },
                            { key: "GG", label: "GG" },
                        ]}
                        value={asset}
                        onChange={next => {
                            setAsset(next);
                            setAmount("");
                        }}
                    />
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
                        <span className="gp-strong">{asset}</span>
                    </div>
                    <KvList
                        compact
                        rows={[
                            [t`USDT 估值`, `${parsed > 0n ? fmtValue(quotedValue) : "0.00"} USDT`],
                            [t`算力倍數`, multiplierText],
                            [t`預計獲得算力`, `${parsed > 0n ? fmtValue(quotedPower) : "0.00"} USDT`],
                        ]}
                    />
                    <div className="gp-muted gp-small">
                        {ASSETS[asset].burned ? t`${asset} 將被銷毀，不可取回。` : t`USDT 進入協議儲備池（95%）與價格保護池（5%），不可取回。`}
                    </div>

                    <button type="button" className="gp-btn gp-btn-primary gp-btn-block" onClick={cta.action} disabled={!cta.action}>
                        {cta.label}
                        <Icon name="arrowRight" size={16} />
                    </button>

                    {message && <p className="gp-fundraise-error gp-small">{message}</p>}
                </div>
            </Card>

            <Card icon="layers" title={t`我的持倉`}>
                {positionIds !== undefined && positionIds.length === 0 ? (
                    <div className="gp-empty">{t`暫無持倉`}</div>
                ) : (
                    <div className="gp-table-wrap">
                        <table className="gp-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{t`資產`}</th>
                                    <th>{t`投入`}</th>
                                    <th>{t`USDT 估值`}</th>
                                    <th>{t`算力`}</th>
                                    <th>{t`時間（SGT）`}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(positions.data ?? []).map((p, i) => {
                                    const a = assetOf(p.asset);
                                    const d = decimalsOf(a);
                                    return (
                                        <tr key={String(positionIds?.[i])}>
                                            <td>{String(positionIds?.[i])}</td>
                                            <td className="gp-strong">{assetNames[a]}</td>
                                            <td>{d === undefined ? DASH : formatAmount(p.inputAmount, d)}</td>
                                            <td>{fmtValue(p.usdtValue)}</td>
                                            <td className="gp-strong">{fmtValue(p.power)}</td>
                                            <td>{fmtTime(p.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default Power;
