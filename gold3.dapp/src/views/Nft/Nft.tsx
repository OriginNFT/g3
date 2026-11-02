import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { t } from "@lingui/macro";
import { erc20Abi, parseUnits, zeroAddress } from "viem";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { CLAIM_CONTROLLER_ABI } from "src/abi/ClaimController";
import { COMMUNITY_ENGINE_ABI } from "src/abi/CommunityEngine";
import { NFT_RIGHTS_LEDGER_ABI } from "src/abi/NFTRightsLedger";
import { ORACLE_ADAPTER_ABI } from "src/abi/OracleAdapter";
import Card from "src/components/Card/Card";
import Icon from "src/components/Icon/Icon";
import KvList from "src/components/KvList/KvList";
import PageHeader from "src/components/PageHeader/PageHeader";
import StatCard from "src/components/StatCard/StatCard";
import Tabs from "src/components/Tabs/Tabs";
import {
    ANUBIS_CHAIN_ID,
    CLAIM_CONTROLLER_ADDRESS,
    COMMUNITY_ENGINE_ADDRESS,
    GG_ADDRESS,
    GG_DECIMALS,
    GOT2_ADDRESS,
    NFT_RIGHTS_LEDGER_ADDRESS,
    ORACLE_ADAPTER_ADDRESS,
    VALUE_DECIMALS,
} from "src/constants";
import { errorMessage, formatAmount } from "src/helpers/format";

// NFT 權益 - the rights ledger. 額度 (USDT, 1e18) is created by burning GG
// (x3) or GOT2 (x2) and consumed when community GG is claimed, at the live
// GG price. There is no per-NFT item on chain: the page shows the figures.

const DEPLOYED =
    NFT_RIGHTS_LEDGER_ADDRESS !== zeroAddress &&
    CLAIM_CONTROLLER_ADDRESS !== zeroAddress &&
    COMMUNITY_ENGINE_ADDRESS !== zeroAddress &&
    ORACLE_ADAPTER_ADDRESS !== zeroAddress &&
    GG_ADDRESS !== zeroAddress &&
    GOT2_ADDRESS !== zeroAddress;
const DASH = "——";
const BPS = 10_000n;
const PRICE_PRECISION = 10n ** 18n;

type Asset = "GG" | "GOT2";
const ASSET_ADDRESS: Record<Asset, `0x${string}`> = { GG: GG_ADDRESS, GOT2: GOT2_ADDRESS };

function fmtValue(value: bigint | undefined): string {
    return value === undefined ? DASH : formatAmount(value, VALUE_DECIMALS);
}

function Nft() {
    const [asset, setAsset] = useState<Asset>("GG");
    const [burnAmount, setBurnAmount] = useState("");
    const [claimAmount, setClaimAmount] = useState("");
    const [error, setError] = useState("");
    const { address, isConnected } = useAccount();
    const account = address ?? zeroAddress;
    const assetAddress = ASSET_ADDRESS[asset];

    const global = useReadContracts({
        allowFailure: false,
        contracts: [
            { address: NFT_RIGHTS_LEDGER_ADDRESS, abi: NFT_RIGHTS_LEDGER_ABI, functionName: "GG_RIGHTS_BPS", chainId: ANUBIS_CHAIN_ID },
            { address: NFT_RIGHTS_LEDGER_ADDRESS, abi: NFT_RIGHTS_LEDGER_ABI, functionName: "GOT2_RIGHTS_BPS", chainId: ANUBIS_CHAIN_ID },
            { address: GOT2_ADDRESS, abi: erc20Abi, functionName: "decimals", chainId: ANUBIS_CHAIN_ID },
        ],
        query: { enabled: DEPLOYED },
    });
    // GG price reverts "no price" until the pair is set: read apart, allowFailure.
    const price = useReadContract({
        address: ORACLE_ADAPTER_ADDRESS,
        abi: ORACLE_ADAPTER_ABI,
        functionName: "priceUSDT",
        args: [GG_ADDRESS],
        chainId: ANUBIS_CHAIN_ID,
        query: { enabled: DEPLOYED },
    });
    const mine = useReadContracts({
        allowFailure: false,
        contracts: [
            { address: NFT_RIGHTS_LEDGER_ADDRESS, abi: NFT_RIGHTS_LEDGER_ABI, functionName: "rightsOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: NFT_RIGHTS_LEDGER_ADDRESS, abi: NFT_RIGHTS_LEDGER_ABI, functionName: "totalCreatedOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: NFT_RIGHTS_LEDGER_ADDRESS, abi: NFT_RIGHTS_LEDGER_ABI, functionName: "totalConsumedOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: COMMUNITY_ENGINE_ADDRESS, abi: COMMUNITY_ENGINE_ABI, functionName: "creditsOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: CLAIM_CONTROLLER_ADDRESS, abi: CLAIM_CONTROLLER_ABI, functionName: "claimable", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: assetAddress, abi: erc20Abi, functionName: "balanceOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: assetAddress, abi: erc20Abi, functionName: "allowance", args: [account, NFT_RIGHTS_LEDGER_ADDRESS], chainId: ANUBIS_CHAIN_ID },
        ],
        query: { enabled: DEPLOYED && !!address },
    });

    const g = global.data;
    const rightsBps = g === undefined ? undefined : asset === "GG" ? g[0] : g[1];
    const decimals = asset === "GG" ? GG_DECIMALS : g?.[2];
    const m = mine.data;
    const rights = m?.[0];
    const created = m?.[1];
    const consumed = m?.[2];
    const credits = m?.[3];
    const claimable = m?.[4];
    const balance = m?.[5];
    const allowance = m?.[6];

    const parsedBurn = useMemo(() => {
        if (!burnAmount || decimals === undefined) return 0n;
        try {
            return parseUnits(burnAmount, decimals);
        } catch {
            return 0n;
        }
    }, [burnAmount, decimals]);
    const parsedClaim = useMemo(() => {
        if (!claimAmount) return 0n;
        try {
            return parseUnits(claimAmount, GG_DECIMALS);
        } catch {
            return 0n;
        }
    }, [claimAmount]);

    const quote = useReadContract({
        address: ORACLE_ADAPTER_ADDRESS,
        abi: ORACLE_ADAPTER_ABI,
        functionName: "valueUSDT",
        args: [assetAddress, parsedBurn],
        chainId: ANUBIS_CHAIN_ID,
        query: { enabled: DEPLOYED && parsedBurn > 0n },
    });

    const { writeContractAsync, data: txHash, isPending: isSigning } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash, chainId: ANUBIS_CHAIN_ID });

    useEffect(() => {
        if (global.error) console.error("nft: ledger reads failed:", global.error.message, global.error);
    }, [global.error]);
    useEffect(() => {
        if (price.error) console.error("nft: GG price read failed:", price.error.message, price.error);
    }, [price.error]);
    useEffect(() => {
        if (mine.error) console.error("nft: account reads failed:", mine.error.message, mine.error);
    }, [mine.error]);
    useEffect(() => {
        if (quote.error) console.error("nft: valueUSDT quote failed:", quote.error.message, quote.error);
    }, [quote.error]);

    const refetchMine = mine.refetch;
    useEffect(() => {
        if (receipt.isSuccess) refetchMine();
    }, [receipt.isSuccess, refetchMine]);

    useEffect(() => {
        if (receipt.error) {
            console.error("nft: transaction failed:", receipt.error.message, receipt.error);
            setError(errorMessage(receipt.error));
        }
    }, [receipt.error]);

    async function approve() {
        setError("");
        try {
            await writeContractAsync({
                address: assetAddress,
                abi: erc20Abi,
                functionName: "approve",
                args: [NFT_RIGHTS_LEDGER_ADDRESS, parsedBurn],
                chainId: ANUBIS_CHAIN_ID,
            });
        } catch (err) {
            console.error("nft: approve failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    async function burn() {
        setError("");
        try {
            await writeContractAsync({
                address: NFT_RIGHTS_LEDGER_ADDRESS,
                abi: NFT_RIGHTS_LEDGER_ABI,
                functionName: "burnForNFTRights",
                args: [assetAddress, parsedBurn],
                chainId: ANUBIS_CHAIN_ID,
            });
        } catch (err) {
            console.error("nft: burnForNFTRights failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    async function claim() {
        setError("");
        try {
            await writeContractAsync({
                address: CLAIM_CONTROLLER_ADDRESS,
                abi: CLAIM_CONTROLLER_ABI,
                functionName: "claimCommunityGG",
                args: [parsedClaim],
                chainId: ANUBIS_CHAIN_ID,
            });
        } catch (err) {
            console.error("nft: claimCommunityGG failed:", (err as Error).message, err);
            setError(errorMessage(err));
        }
    }

    const quotedValue = parsedBurn > 0n ? quote.data : 0n;
    const quotedRights = quotedValue !== undefined && rightsBps !== undefined ? (quotedValue * rightsBps) / BPS : undefined;
    const insufficient = balance !== undefined && parsedBurn > balance;
    const needsApproval = allowance !== undefined && parsedBurn > allowance;
    const multiplierText = rightsBps !== undefined ? `${Number(rightsBps) / 10_000}x` : DASH;

    const busy = isSigning || receipt.isLoading;
    const ready = DEPLOYED && isConnected && !global.isError && !mine.isError && g !== undefined && m !== undefined;
    let notReady = "";
    if (!DEPLOYED) notReady = t`尚未上線`;
    else if (!isConnected) notReady = t`請先連接錢包`;
    else if (global.isError || mine.isError) notReady = t`讀取失敗`;
    else if (!ready) notReady = t`讀取中`;
    else if (isSigning) notReady = t`請在錢包確認`;
    else if (receipt.isLoading) notReady = t`交易確認中…`;

    let burnCta: { label: string; action?: () => void };
    if (notReady) burnCta = { label: notReady };
    else if (parsedBurn === 0n) burnCta = { label: t`請輸入數量` };
    else if (insufficient) burnCta = { label: t`${asset} 餘額不足` };
    else if (quote.isError) burnCta = { label: t`報價失敗` };
    else if (quotedRights === undefined) burnCta = { label: t`報價中` };
    else if (quotedRights === 0n) burnCta = { label: t`額度為 0` };
    else if (needsApproval) burnCta = { label: t`授權 ${asset}`, action: approve };
    else burnCta = { label: t`銷毀 ${asset} 獲取額度`, action: burn };

    // rights deducted = amount x price / 1e18, as ClaimController computes it.
    const ggPrice = price.data;
    const deducted = ggPrice !== undefined ? (parsedClaim * ggPrice) / PRICE_PRECISION : undefined;
    let claimCta: { label: string; action?: () => void };
    if (notReady) claimCta = { label: notReady };
    else if (price.isError || ggPrice === 0n) claimCta = { label: t`GG 尚無價格` };
    else if (parsedClaim === 0n) claimCta = { label: t`請輸入數量` };
    else if (claimable !== undefined && parsedClaim > claimable) claimCta = { label: t`超過可領取數量` };
    else claimCta = { label: t`領取社區 GG`, action: claim };

    const readError = global.error ?? mine.error;
    const message = error || (readError ? t`讀取失敗：${errorMessage(readError)}` : "");
    const balanceText = balance !== undefined && decimals !== undefined ? formatAmount(balance, decimals) : DASH;
    const priceText = ggPrice !== undefined && !price.isError ? fmtValue(ggPrice) : DASH;

    return (
        <div className="gp-stack gp-fundraise">
            <div className="gp-grid gp-grid-head">
                <PageHeader title={t`NFT 權益`} subtitle={t`銷毀 GG / GOT2 獲取權益額度 · 以額度領取社區 GG`} />
                <StatCard icon="coins" label={t`累計權益額度`} value={fmtValue(created)} unit="USDT" />
                <StatCard icon="chart" label={t`已使用額度`} value={fmtValue(consumed)} unit="USDT" />
                <StatCard icon="pie" label={t`剩餘額度`} value={fmtValue(rights)} unit="USDT" />
                <StatCard
                    icon="sprout"
                    label={t`可領取社區 GG`}
                    value={claimable === undefined ? DASH : formatAmount(claimable, GG_DECIMALS)}
                    unit="GG"
                />
            </div>

            {!DEPLOYED && (
                <div className="gp-fundraise-banner">
                    <Icon name="info" size={18} />
                    <div>
                        <div className="gp-strong">{t`尚未上線`}</div>
                        <div className="gp-small">{t`NFT 權益合約尚未部署到此網路。`}</div>
                    </div>
                </div>
            )}

            <div className="gp-grid gp-grid-2">
                <Card icon="nft" title={t`獲取權益額度`} right={<span className="gp-muted gp-small">{t`可用餘額：${balanceText} ${asset}`}</span>}>
                    <div className="gp-fundraise-body">
                        <Tabs
                            tabs={[
                                { key: "GG", label: t`銷毀 GG（3 倍）` },
                                { key: "GOT2", label: t`銷毀 GOT2（2 倍）` },
                            ]}
                            value={asset}
                            onChange={next => {
                                setAsset(next);
                                setBurnAmount("");
                            }}
                        />
                        <div className="gp-fundraise-input">
                            <input
                                className="gp-amount-input"
                                placeholder="0.00"
                                inputMode="decimal"
                                value={burnAmount}
                                onChange={event => {
                                    if (/^\d*(\.\d*)?$/.test(event.target.value)) setBurnAmount(event.target.value);
                                }}
                                disabled={!DEPLOYED}
                            />
                            <span className="gp-strong">{asset}</span>
                        </div>
                        <KvList
                            compact
                            rows={[
                                [t`USDT 估值`, `${parsedBurn > 0n ? fmtValue(quotedValue) : "0.00"} USDT`],
                                [t`額度倍數`, multiplierText],
                                [t`預計獲得額度`, `${parsedBurn > 0n ? fmtValue(quotedRights) : "0.00"} USDT`],
                            ]}
                        />
                        <div className="gp-muted gp-small">{t`${asset} 將被銷毀，不可取回。`}</div>
                        <button type="button" className="gp-btn gp-btn-primary gp-btn-block" onClick={burnCta.action} disabled={!burnCta.action || busy}>
                            {burnCta.label}
                            <Icon name="arrowRight" size={16} />
                        </button>
                    </div>
                </Card>

                <Card icon="sprout" title={t`使用權益領取社區 GG`} right={<span className="gp-muted gp-small">{t`GG 價格：${priceText} USDT`}</span>}>
                    <div className="gp-fundraise-body">
                        <KvList
                            compact
                            rows={[
                                [t`社區積分（未領取）`, `${credits === undefined ? DASH : formatAmount(credits, GG_DECIMALS)} GG`],
                                [t`額度可覆蓋`, `${claimable === undefined ? DASH : formatAmount(claimable, GG_DECIMALS)} GG`],
                            ]}
                        />
                        <div className="gp-fundraise-input">
                            <input
                                className="gp-amount-input"
                                placeholder="0.00"
                                inputMode="decimal"
                                value={claimAmount}
                                onChange={event => {
                                    if (/^\d*(\.\d*)?$/.test(event.target.value)) setClaimAmount(event.target.value);
                                }}
                                disabled={!DEPLOYED}
                            />
                            <span className="gp-strong">GG</span>
                        </div>
                        <KvList compact rows={[[t`將扣減額度`, `${parsedClaim > 0n ? fmtValue(deducted) : "0.00"} USDT`]]} />
                        <div className="gp-notice">
                            <Icon name="info" size={18} />
                            <p className="gp-small">{t`領取 GG 社區動態排放獎勵時，將按領取時 GG 實時 USDT 價值扣減 NFT 權益額度。領取的 GG 進入 turbine。`}</p>
                        </div>
                        <button type="button" className="gp-btn gp-btn-primary gp-btn-block" onClick={claimCta.action} disabled={!claimCta.action || busy}>
                            {claimCta.label}
                            <Icon name="arrowRight" size={16} />
                        </button>
                    </div>
                </Card>
            </div>

            {message && <p className="gp-fundraise-error gp-small">{message}</p>}

            <Card>
                <div className="gp-footnote">
                    <Icon name="info" size={16} />
                    <span className="gp-grow">{t`NFT 權益額度通過銷毀 GG（3 倍）或 GOT2（2 倍）獲得，具體規則請查看官方文檔。`}</span>
                    <Link to="/docs" className="gp-card-action">
                        {t`前往查看`}
                        <Icon name="arrowRight" size={14} />
                    </Link>
                </div>
            </Card>
        </div>
    );
}

export default Nft;
