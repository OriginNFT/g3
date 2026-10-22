import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import ImageSlot from "src/components/ImageSlot/ImageSlot";
import KvList from "src/components/KvList/KvList";
import Legend from "src/components/Legend/Legend";
import { BackLink } from "src/components/PageHeader/PageHeader";
import Segmented from "src/components/Segmented/Segmented";
import StatCard from "src/components/StatCard/StatCard";
import BarChart from "src/components/charts/BarChart";
import DonutChart from "src/components/charts/DonutChart";
import LineChart from "src/components/charts/LineChart";
import { ACCENT, GOLD } from "src/themes/tokens";
import { PoolKey, poolDetails, TREND_LABELS } from "./mock";

// 流動性池詳情 - the pool detail boards (3-2 GOT2 / GG, 3-3 AUG / GG).

const RANGES = ["24h", "7D", "30D"];

function PoolDetail() {
    const { pair } = useParams();
    const [volumeRange, setVolumeRange] = useState("24h");
    const [shareRange, setShareRange] = useState("24h");

    const detail = poolDetails()[pair as PoolKey];
    if (!detail) return <Navigate to="/liquidity" replace />;

    const [a, b] = detail.tokens;
    const composition = [
        { label: a.symbol, value: 50, color: ACCENT, percent: a.share, amount: `${a.amount} ${a.usd}` },
        { label: b.symbol, value: 50, color: GOLD, percent: b.share, amount: `${b.amount} ${b.usd}` },
    ];

    return (
        <div className="gp-stack">
            <BackLink to="/liquidity" />

            <section className="gp-hero gp-hero--light">
                <ImageSlot label={detail.art} shape="circle" width={110} />
                <div className="gp-hero-text">
                    <h1 className="gp-page-title">{detail.title}</h1>
                    <p className="gp-page-subtitle">{detail.subtitle}</p>
                </div>
            </section>

            <div className="gp-grid gp-grid-3">
                <StatCard icon="coins" label={t`池子總價值 (USD)`} value={detail.value} delta={detail.valueDelta} />
                <StatCard icon="swap" label={t`24h 交易量 (USD)`} value={detail.volume24h} delta={detail.volumeDelta} />
                <div className="gp-card gp-stat">
                    <div className="gp-stat-body">
                        <div className="gp-stat-label">{t`流動性佔比`}</div>
                        <div className="gp-stat-value">{detail.share}%</div>
                    </div>
                    <DonutChart
                        items={[
                            { label: t`本池`, value: detail.share, color: ACCENT },
                            { label: t`其他`, value: 100 - detail.share, color: "#CFE3FB" },
                        ]}
                        size={64}
                        cutout="68%"
                    />
                </div>
            </div>

            <div className="gp-grid gp-grid-2">
                <Card title={t`池子資產構成`}>
                    <div className="gp-donut-row">
                        <DonutChart items={composition} size={200}>
                            <div className="gp-donut-value">50%</div>
                            <div className="gp-donut-sub">{detail.value}</div>
                            <div className="gp-donut-label">{t`池子總價值`}</div>
                        </DonutChart>
                        <Legend items={composition} />
                    </div>
                </Card>

                <Card title={t`流動性數據`}>
                    <KvList rows={detail.stats} />
                </Card>
            </div>

            <div className="gp-grid gp-grid-2">
                <Card
                    title={t`交易量趨勢（USD）`}
                    right={<Segmented options={RANGES} value={volumeRange} onChange={setVolumeRange} />}
                >
                    <BarChart
                        labels={TREND_LABELS}
                        series={[
                            { label: a.symbol, data: detail.volumeTrend[0], color: ACCENT },
                            { label: b.symbol, data: detail.volumeTrend[1], color: "#8EC1F5" },
                        ]}
                    />
                </Card>

                <Card
                    title={t`流動性佔比趨勢`}
                    right={<Segmented options={RANGES} value={shareRange} onChange={setShareRange} />}
                >
                    <LineChart
                        labels={TREND_LABELS}
                        series={[
                            { label: a.symbol, data: detail.shareTrend, color: ACCENT },
                            { label: b.symbol, data: detail.shareTrend.map(v => 100 - v), color: GOLD },
                        ]}
                        stacked
                        yMax={100}
                        yFormat={v => `${v}%`}
                    />
                    <Legend
                        items={[
                            { label: a.symbol, color: ACCENT },
                            { label: b.symbol, color: GOLD },
                        ]}
                    />
                </Card>
            </div>
        </div>
    );
}

export default PoolDetail;
