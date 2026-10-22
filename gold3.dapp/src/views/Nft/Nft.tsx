import { useState } from "react";
import { Link } from "react-router-dom";
import { MenuItem, Select } from "@mui/material";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import Icon from "src/components/Icon/Icon";
import ImageSlot from "src/components/ImageSlot/ImageSlot";
import KvList from "src/components/KvList/KvList";
import NftCard, { NftStatus } from "src/components/NftCard/NftCard";
import PageHeader from "src/components/PageHeader/PageHeader";
import StatCard from "src/components/StatCard/StatCard";
import Tabs from "src/components/Tabs/Tabs";
import { myNfts, NFT_CONTRACT_DISPLAY } from "./mock";

// NFT 權益 - the NFT board (4-6). The two record tabs have no board yet and show empty.

type Tab = "mine" | "usage" | "acquire";
type StatusFilter = "all" | "available" | "used";

function Nft() {
    const [tab, setTab] = useState<Tab>("mine");
    const [status, setStatus] = useState<StatusFilter>("all");
    const [selectedKey, setSelectedKey] = useState("001");

    const nfts = myNfts();
    const shown = nfts.filter(n => status === "all" || (status === "available") === n.available);
    const selected = nfts.find(n => n.key === selectedKey) ?? nfts[0];

    return (
        <div className="gp-stack">
            <div className="gp-grid gp-grid-head">
                <PageHeader title={t`NFT 權益`} subtitle={t`我的 NFT · 查看權益與使用記錄`} />
                <StatCard
                    icon="nft"
                    label={t`我的 NFT 數量`}
                    value="3"
                    footer={<div className="gp-muted gp-small">{t`可用 2 | 已使用 1`}</div>}
                />
                <StatCard icon="coins" label={t`累計權益額度`} value="30,000" unit="USDT" />
                <StatCard icon="chart" label={t`已使用額度`} value="10,000" unit="USDT" />
                <StatCard icon="pie" label={t`剩餘額度`} value="20,000" unit="USDT" />
            </div>

            <Card>
                <div className="gp-row gp-between gp-wrap">
                    <Tabs
                        variant="underline"
                        tabs={[
                            { key: "mine", label: t`我的 NFT` },
                            { key: "usage", label: t`權益使用記錄` },
                            { key: "acquire", label: t`獲取記錄` },
                        ]}
                        value={tab}
                        onChange={setTab}
                    />
                    <div className="gp-row">
                        <Select size="small" value={status} onChange={e => setStatus(e.target.value as StatusFilter)}>
                            <MenuItem value="all">{t`全部狀態`}</MenuItem>
                            <MenuItem value="available">{t`可用`}</MenuItem>
                            <MenuItem value="used">{t`已使用`}</MenuItem>
                        </Select>
                        <button type="button" className="gp-btn gp-btn-primary" disabled>
                            {t`鑄造 / 獲取 NFT`}
                        </button>
                    </div>
                </div>

                {tab === "mine" ? (
                    <div className="gp-grid gp-grid-nft">
                        <div>
                            <h4 className="gp-subcard-title">{t`我的 NFT（${nfts.length}）`}</h4>
                            <div className="gp-grid gp-grid-3 gp-grid-tight">
                                {shown.map(nft => (
                                    <NftCard
                                        key={nft.key}
                                        nft={nft}
                                        selected={nft.key === selected.key}
                                        onClick={() => setSelectedKey(nft.key)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="gp-subcard gp-nft-detail">
                            <div className="gp-row gp-top">
                                <ImageSlot
                                    label={t`黃金聖甲蟲`}
                                    width={140}
                                    tone={selected.available ? "gold" : "dark"}
                                />
                                <div className="gp-grow">
                                    <div className="gp-nft-name">
                                        <span className="gp-strong-lg">{selected.name}</span>
                                        <NftStatus available={selected.available} />
                                    </div>
                                    <KvList
                                        compact
                                        rows={[
                                            [t`權益額度`, selected.quota],
                                            [t`獲取方式`, selected.method],
                                            [t`獲取時間`, selected.time],
                                            [
                                                t`合約地址`,
                                                <span className="gp-row" key="addr">
                                                    {NFT_CONTRACT_DISPLAY}
                                                    <Icon name="copy" size={14} />
                                                </span>,
                                            ],
                                        ]}
                                    />
                                </div>
                            </div>
                            <div className="gp-notice">
                                <Icon name="info" size={18} />
                                <div>
                                    <div className="gp-strong">{t`使用說明`}</div>
                                    <p className="gp-small">
                                        {t`領取 GG 社區動態排放獎勵時，將按領取時 GG 實時 USDT 價值扣減 NFT 權益額度。`}
                                    </p>
                                </div>
                            </div>
                            <button type="button" className="gp-btn gp-btn-primary gp-btn-block" disabled>
                                {t`使用權益`}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="gp-empty">{t`暫無記錄`}</div>
                )}

                <div className="gp-footnote">
                    <Icon name="info" size={16} />
                    <span className="gp-grow">
                        {t`NFT 權益額度通過銷毀 GG（3 倍）或 GOT2（2 倍）獲得，具體規則請查看官方文檔。`}
                    </span>
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
