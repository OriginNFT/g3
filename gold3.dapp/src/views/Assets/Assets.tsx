import { useState } from "react";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import Delta from "src/components/Delta/Delta";
import Icon from "src/components/Icon/Icon";
import NftCard from "src/components/NftCard/NftCard";
import PageHeader from "src/components/PageHeader/PageHeader";
import StatCard from "src/components/StatCard/StatCard";
import Tabs from "src/components/Tabs/Tabs";
import TokenIcon from "src/components/TokenIcon/TokenIcon";
import { myNfts } from "src/views/Nft/mock";

// 我的資產 - the assets board (4-7). 收益資產 has no board yet and shows empty.

type Tab = "all" | "token" | "nft" | "earning";

const TOKENS = [
    { symbol: "DAI", amount: "125,680.50", available: "98,650.20", locked: "27,030.30", price: "$1.00", value: "125,680.50" },
    { symbol: "GOT2", amount: "8,950.00", available: "6,200.00", locked: "2,750.00", price: "$2.15", value: "19,242.50" },
    { symbol: "GG", amount: "4,920.00", available: "3,200.00", locked: "1,720.00", price: "$10.20", value: "50,184.00" },
    { symbol: "USDT", amount: "38,250.00", available: "38,250.00", locked: "0.00", price: "$1.00", value: "38,250.00" },
    { symbol: "ETH", amount: "5.2000", available: "4.0000", locked: "1.2000", price: "$2,650.00", value: "13,780.00" },
];

function Assets() {
    const [tab, setTab] = useState<Tab>("all");

    const showTokens = tab === "all" || tab === "token";
    const showNfts = tab === "all" || tab === "nft";

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
                                <div className="gp-figure gp-accent">365,280.50</div>
                                <Delta value="+12.6%" suffix="(24H)" />
                            </div>
                        </div>
                        <button type="button" className="gp-btn gp-btn-outline" disabled>
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

            <div className="gp-grid gp-grid-4">
                <StatCard icon="coins" label={t`代幣資產（USD）`} value="245,680.30" delta="+10.2%" />
                <StatCard icon="nft" label={t`NFT 資產（USD）`} value="68,500.00" delta="+18.6%" />
                <StatCard icon="sprout" label={t`收益資產（USD）`} value="51,100.20" delta="+9.8%" />
                <StatCard
                    icon="clock"
                    label={t`待領取收益（USD）`}
                    value="12,650.00"
                    footer={
                        <button type="button" className="gp-btn gp-btn-outline gp-btn-sm" disabled>
                            {t`立即領取`}
                        </button>
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
                                {TOKENS.map(token => (
                                    <tr key={token.symbol}>
                                        <td>
                                            <div className="gp-row">
                                                <TokenIcon symbol={token.symbol} />
                                                <span className="gp-strong">{token.symbol}</span>
                                            </div>
                                        </td>
                                        <td className="gp-strong">{token.amount}</td>
                                        <td>{token.available}</td>
                                        <td>{token.locked}</td>
                                        <td>{token.price}</td>
                                        <td className="gp-strong">{token.value}</td>
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {showNfts && (
                <Card title={t`NFT 資產（3）`} action={{ label: t`查看更多`, to: "/nft" }}>
                    <div className="gp-grid gp-grid-3 gp-grid-tight">
                        {myNfts().map(nft => (
                            <NftCard key={nft.key} nft={nft} layout="horizontal" />
                        ))}
                    </div>
                </Card>
            )}

            {tab === "earning" && (
                <Card title={t`收益資產`} className="is-disabled">
                    <div className="gp-empty">{t`暫無記錄`}</div>
                </Card>
            )}
        </div>
    );
}

export default Assets;
