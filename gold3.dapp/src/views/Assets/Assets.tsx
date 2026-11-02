import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { t } from "@lingui/macro";
import { erc20Abi, zeroAddress } from "viem";
import { useAccount, useReadContracts } from "wagmi";

import { CLAIM_CONTROLLER_ABI } from "src/abi/ClaimController";
import { COMMUNITY_ENGINE_ABI } from "src/abi/CommunityEngine";
import { COMPUTING_VAULT_ABI } from "src/abi/ComputingVault";
import { NFT_RIGHTS_LEDGER_ABI } from "src/abi/NFTRightsLedger";
import { ORACLE_ADAPTER_ABI } from "src/abi/OracleAdapter";
import { TIER_STAKING_ABI } from "src/abi/TierStaking";
import Card from "src/components/Card/Card";
import Icon from "src/components/Icon/Icon";
import KvList from "src/components/KvList/KvList";
import PageHeader from "src/components/PageHeader/PageHeader";
import StatCard from "src/components/StatCard/StatCard";
import Tabs from "src/components/Tabs/Tabs";
import TokenIcon from "src/components/TokenIcon/TokenIcon";
import {
    ANUBIS_CHAIN_ID,
    AUG_ADDRESS,
    CLAIM_CONTROLLER_ADDRESS,
    COMMUNITY_ENGINE_ADDRESS,
    COMPUTING_VAULT_ADDRESS,
    GG_ADDRESS,
    GG_DECIMALS,
    GOT2_ADDRESS,
    NFT_RIGHTS_LEDGER_ADDRESS,
    ORACLE_ADAPTER_ADDRESS,
    TIER_STAKING_ADDRESS,
    USDT_ADDRESS,
    USDT_DECIMALS,
    VALUE_DECIMALS,
} from "src/constants";
import { errorMessage, formatAmount } from "src/helpers/format";

// 我的資產 - wallet balances of the four tokens priced by the OracleAdapter,
// the NFT rights ledger and the pending earnings (holding reward, community
// credits). Every value is 1e18 = 1 USDT. 充幣 / 提幣 / 交易 have no home
// here yet and stay disabled.

type Tab = "all" | "token" | "nft" | "earning";
const DASH = "——";
const SCALE = 10n ** BigInt(VALUE_DECIMALS);

const TOKENS = [
    { symbol: "USDT", address: USDT_ADDRESS },
    { symbol: "GOT2", address: GOT2_ADDRESS },
    { symbol: "GG", address: GG_ADDRESS },
    { symbol: "AUG", address: AUG_ADDRESS },
] as const;

function cell<T>(entry: { status: "success" | "failure"; result?: unknown } | undefined): T | undefined {
    return entry?.status === "success" ? (entry.result as T) : undefined;
}

function fmtValue(value: bigint | undefined): string {
    return value === undefined ? DASH : formatAmount(value, VALUE_DECIMALS);
}

function Assets() {
    const [tab, setTab] = useState<Tab>("all");
    const { address, isConnected } = useAccount();
    const account = address ?? zeroAddress;

    // Per token: balanceOf, decimals, priceUSDT. A zero token address or a
    // token without a pair fails only its own cells.
    const tokens = useReadContracts({
        contracts: TOKENS.flatMap(token => [
            { address: token.address, abi: erc20Abi, functionName: "balanceOf", args: [account], chainId: ANUBIS_CHAIN_ID } as const,
            { address: token.address, abi: erc20Abi, functionName: "decimals", chainId: ANUBIS_CHAIN_ID } as const,
            { address: ORACLE_ADAPTER_ADDRESS, abi: ORACLE_ADAPTER_ABI, functionName: "priceUSDT", args: [token.address], chainId: ANUBIS_CHAIN_ID } as const,
        ]),
        query: { enabled: !!address },
    });
    const earnings = useReadContracts({
        contracts: [
            { address: COMPUTING_VAULT_ADDRESS, abi: COMPUTING_VAULT_ABI, functionName: "powerOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: COMPUTING_VAULT_ADDRESS, abi: COMPUTING_VAULT_ABI, functionName: "pendingHoldingReward", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: COMMUNITY_ENGINE_ADDRESS, abi: COMMUNITY_ENGINE_ABI, functionName: "creditsOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: CLAIM_CONTROLLER_ADDRESS, abi: CLAIM_CONTROLLER_ABI, functionName: "claimable", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: NFT_RIGHTS_LEDGER_ADDRESS, abi: NFT_RIGHTS_LEDGER_ABI, functionName: "rightsOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: NFT_RIGHTS_LEDGER_ADDRESS, abi: NFT_RIGHTS_LEDGER_ABI, functionName: "totalCreatedOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: NFT_RIGHTS_LEDGER_ADDRESS, abi: NFT_RIGHTS_LEDGER_ABI, functionName: "totalConsumedOf", args: [account], chainId: ANUBIS_CHAIN_ID },
            { address: TIER_STAKING_ADDRESS, abi: TIER_STAKING_ABI, functionName: "lockedOf", args: [account], chainId: ANUBIS_CHAIN_ID },
        ],
        query: { enabled: !!address },
    });

    useEffect(() => {
        if (tokens.error) console.error("assets: token reads failed:", tokens.error.message, tokens.error);
    }, [tokens.error]);
    useEffect(() => {
        if (earnings.error) console.error("assets: earning reads failed:", earnings.error.message, earnings.error);
    }, [earnings.error]);

    const e = earnings.data;
    const power = cell<bigint>(e?.[0]);
    const pending = cell<bigint>(e?.[1]);
    const credits = cell<bigint>(e?.[2]);
    const claimable = cell<bigint>(e?.[3]);
    const rights = cell<bigint>(e?.[4]);
    const rightsCreated = cell<bigint>(e?.[5]);
    const rightsConsumed = cell<bigint>(e?.[6]);
    const locked = cell<bigint>(e?.[7]);

    const rows = TOKENS.map((token, i) => {
        const deployed = token.address !== zeroAddress;
        const balance = cell<bigint>(tokens.data?.[i * 3]);
        const decimals = cell<number>(tokens.data?.[i * 3 + 1]);
        const price = cell<bigint>(tokens.data?.[i * 3 + 2]);
        const lockedHere = token.symbol === "GG" ? locked ?? 0n : 0n;
        const total = balance !== undefined ? balance + lockedHere : undefined;
        const value =
            total !== undefined && decimals !== undefined && price !== undefined ? (total * price) / 10n ** BigInt(decimals) : undefined;
        return { ...token, deployed, balance, decimals, price, locked: lockedHere, total, value };
    });
    const tokenTotal = rows.every(row => !row.deployed || row.value !== undefined)
        ? rows.reduce((sum, row) => sum + (row.value ?? 0n), 0n)
        : undefined;
    const ggPrice = rows[2].price;
    const pendingGG = pending !== undefined && credits !== undefined ? pending + credits : undefined;
    const pendingValue = pendingGG !== undefined && ggPrice !== undefined ? (pendingGG * ggPrice) / SCALE : undefined;
    const totalValue = tokenTotal !== undefined && rights !== undefined ? tokenTotal + rights + (pendingValue ?? 0n) : undefined;

    const readError = tokens.error ?? earnings.error;
    const message = readError ? t`讀取失敗：${errorMessage(readError)}` : "";
    const gg = (value: bigint | undefined) => (value === undefined ? DASH : formatAmount(value, GG_DECIMALS));
    const showTokens = tab === "all" || tab === "token";
    const showNfts = tab === "all" || tab === "nft";
    const showEarning = tab === "all" || tab === "earning";

    return (
        <div className="gp-stack">
            <PageHeader
                title={t`我的資產`}
                subtitle={t`查看帳戶資產與收益情況`}
                right={
                    <div className="gp-row gp-wrap">
                        <div className="gp-card gp-total-card">
                            <Icon name="eye" size={20} />
                            <div>
                                <div className="gp-muted gp-small">{t`總資產估值（USD）`}</div>
                                <div className="gp-figure gp-accent">{isConnected ? fmtValue(totalValue) : DASH}</div>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="gp-btn gp-btn-outline"
                            disabled={!isConnected || tokens.isFetching || earnings.isFetching}
                            onClick={() => {
                                tokens.refetch();
                                earnings.refetch();
                            }}
                        >
                            <Icon name="refresh" size={16} />
                            {t`刷新`}
                        </button>
                        <button type="button" className="gp-btn gp-btn-outline" disabled>
                            <Icon name="docs" size={16} />
                            {t`資產記錄`}
                        </button>
                    </div>
                }
            />

            <Tabs
                tabs={[
                    { key: "all", label: t`全部資產` },
                    { key: "token", label: t`代幣資產` },
                    { key: "nft", label: t`NFT 資產` },
                    { key: "earning", label: t`收益資產` },
                ]}
                value={tab}
                onChange={setTab}
            />

            {!isConnected && <div className="gp-empty">{t`請先連接錢包`}</div>}
            {message && <p className="gp-fundraise-error gp-small">{message}</p>}

            <div className="gp-grid gp-grid-4">
                <StatCard icon="coins" label={t`代幣資產（USD）`} value={fmtValue(tokenTotal)} />
                <StatCard icon="nft" label={t`NFT 權益額度（USDT）`} value={fmtValue(rights)} />
                <StatCard icon="power" label={t`本位倉算力（USDT）`} value={fmtValue(power)} />
                <StatCard
                    icon="clock"
                    label={t`待領取收益（GG）`}
                    value={gg(pendingGG)}
                    footer={
                        <div className="gp-row">
                            <Link className="gp-btn gp-btn-outline gp-btn-sm" to="/power">
                                {t`持倉獎勵`}
                            </Link>
                            <Link className="gp-btn gp-btn-outline gp-btn-sm" to="/nft">
                                {t`社區 GG`}
                            </Link>
                        </div>
                    }
                />
            </div>

            {showTokens && (
                <Card title={t`代幣資產`}>
                    <div className="gp-table-wrap">
                        <table className="gp-table">
                            <thead>
                                <tr>
                                    <th>{t`代幣`}</th>
                                    <th>{t`數量`}</th>
                                    <th>{t`可用`}</th>
                                    <th>{t`鎖定`}</th>
                                    <th>{t`參考價格（USD）`}</th>
                                    <th>{t`估值（USD）`}</th>
                                    <th>{t`操作`}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => {
                                    const amount = (value: bigint | undefined) =>
                                        value === undefined || row.decimals === undefined ? DASH : formatAmount(value, row.decimals);
                                    return (
                                        <tr key={row.symbol} className={row.deployed ? "" : "is-disabled"}>
                                            <td>
                                                <div className="gp-row">
                                                    <TokenIcon symbol={row.symbol} />
                                                    <span className="gp-strong">{row.symbol}</span>
                                                </div>
                                            </td>
                                            <td className="gp-strong">{amount(row.total)}</td>
                                            <td>{amount(row.balance)}</td>
                                            <td>{amount(row.locked)}</td>
                                            <td>{fmtValue(row.price)}</td>
                                            <td className="gp-strong">{fmtValue(row.value)}</td>
                                            <td>
                                                <div className="gp-row">
                                                    <button type="button" className="gp-btn gp-btn-outline gp-btn-sm" disabled>
                                                        {t`充幣`}
                                                    </button>
                                                    <button type="button" className="gp-btn gp-btn-outline gp-btn-sm" disabled>
                                                        {t`提幣`}
                                                    </button>
                                                    <button type="button" className="gp-btn gp-btn-outline gp-btn-sm" disabled>
                                                        {t`交易`}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="gp-muted gp-small">{t`鎖定 = TierStaking 質押中的 GG；價格為 OracleAdapter TWAP，USDT 以 ${USDT_DECIMALS} 位小數計。`}</div>
                </Card>
            )}

            {showNfts && (
                <Card title={t`NFT 權益`} action={{ label: t`查看更多`, to: "/nft" }}>
                    <KvList
                        className="gp-kv--boxed"
                        rows={[
                            [t`剩餘額度`, `${fmtValue(rights)} USDT`],
                            [t`累計獲得`, `${fmtValue(rightsCreated)} USDT`],
                            [t`已使用`, `${fmtValue(rightsConsumed)} USDT`],
                        ]}
                    />
                </Card>
            )}

            {showEarning && (
                <Card title={t`收益資產`}>
                    <KvList
                        className="gp-kv--boxed"
                        rows={[
                            [t`待領取持倉獎勵`, `${gg(pending)} GG`],
                            [t`社區積分（未領取）`, `${gg(credits)} GG`],
                            [t`額度可覆蓋的社區 GG`, `${gg(claimable)} GG`],
                            [t`待領取估值（USD）`, fmtValue(pendingValue)],
                        ]}
                    />
                </Card>
            )}
        </div>
    );
}

export default Assets;
