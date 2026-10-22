import { useState } from "react";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import Delta from "src/components/Delta/Delta";
import ImageSlot from "src/components/ImageSlot/ImageSlot";
import PageHeader from "src/components/PageHeader/PageHeader";
import Tabs from "src/components/Tabs/Tabs";
import { EcoPoolKey, ecoPools } from "./mock";

// 生態池數據詳情 - the eco pool detail board, one tab per pool.

function EcoPoolDetail() {
    const [tab, setTab] = useState<EcoPoolKey>("got2");
    const pools = ecoPools();
    const pool = pools.find(p => p.key === tab) ?? pools[0];

    return (
        <div className="gp-stack">
            <PageHeader title={t`生態池數據詳情`} back="/overview" />

            <Tabs tabs={pools.map(p => ({ key: p.key, label: p.name }))} value={tab} onChange={setTab} />

            <Card>
                <div className="gp-pool-head">
                    <ImageSlot label={pool.a} shape="circle" width={72} />
                    <div>
                        <div className="gp-strong-lg">{pool.name}</div>
                        <div className="gp-row">
                            <span className="gp-figure">{pool.value}</span>
                            <Delta value={pool.delta} />
                        </div>
                    </div>
                </div>
                <div className="gp-grid gp-grid-3 gp-grid-tight">
                    <div className="gp-tile">
                        <div className="gp-muted gp-small">{t`流動性佔比`}</div>
                        <div className="gp-strong-lg">{pool.share}</div>
                    </div>
                    <div className="gp-tile">
                        <div className="gp-muted gp-small">{t`年化收益（參考）`}</div>
                        <div className="gp-strong-lg">{pool.apr}</div>
                    </div>
                    <div className="gp-tile">
                        <div className="gp-muted gp-small">{t`總鎖倉（USDT）`}</div>
                        <div className="gp-strong-lg">{pool.locked}</div>
                    </div>
                </div>
            </Card>

            <Card title={t`池子資產構成`}>
                <div className="gp-grid gp-grid-2 gp-grid-tight">
                    {pool.tokens.map(token => (
                        <div className="gp-tile gp-tile--row" key={token.symbol}>
                            <ImageSlot label={token.symbol} shape="circle" width={52} />
                            <div>
                                <div className="gp-strong">{token.symbol}</div>
                                <div className="gp-strong-lg">{token.amount}</div>
                                <div className="gp-muted gp-small">
                                    {t`佔比`} {token.share}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="gp-btn-row">
                <button type="button" className="gp-btn gp-btn-primary" disabled>
                    {t`去質押`}
                </button>
                <button type="button" className="gp-btn gp-btn-soft" disabled>
                    {t`去兌換`}
                </button>
            </div>
        </div>
    );
}

export default EcoPoolDetail;
