import { useState } from "react";
import { Link } from "react-router-dom";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import StatCard from "src/components/StatCard/StatCard";
import Delta from "src/components/Delta/Delta";
import Icon from "src/components/Icon/Icon";
import ImageSlot from "src/components/ImageSlot/ImageSlot";
import KvList from "src/components/KvList/KvList";
import Legend from "src/components/Legend/Legend";
import Progress from "src/components/Progress/Progress";
import Segmented from "src/components/Segmented/Segmented";
import DonutChart from "src/components/charts/DonutChart";
import Sparkline from "src/components/charts/Sparkline";
import { ACCENT } from "src/themes/tokens";
import { allocation, ecoPools, emissionStages, protectionRows, RELEASED_PCT, reserveRows } from "./mock";

// 數據總覽 - the desktop overview board and its mobile variant.

const PRICE_TREND = [10.9, 11.2, 11.0, 11.6, 11.4, 12.0, 11.8, 12.4, 12.68];

function Overview() {
    const [range, setRange] = useState("1D");

    const features = [
        { icon: "shield" as const, label: t`黃金本位價值體系` },
        { icon: "lock" as const, label: t`鏈上透明與安全` },
        { icon: "users" as const, label: t`社區共建共享` },
    ];

    const keyMetrics: [string, string][] = [
        [t`本位倉總算力（DAI）`, "520,860,000"],
        [t`生態池總鎖倉（USDT）`, "36,520,890"],
        [t`社區成員總數`, "28,562"],
        [t`NFT 已發放數量`, "12,680"],
    ];

    return (
        <div className="gp-stack">
            <section className="gp-hero">
                <div className="gp-hero-text">
                    <h1 className="gp-hero-title">{t`GG 黃金本位倉`}</h1>
                    <p className="gp-hero-subtitle">{t`以黃金為錨 · 以算力為驅動 · 構建可持續的價值生態`}</p>
                    <div className="gp-hero-features gp-only-mobile">
                        {features.map(f => (
                            <div className="gp-hero-feature" key={f.label}>
                                <span className="gp-icon-badge">
                                    <Icon name={f.icon} size={20} />
                                </span>
                                <span>{f.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <ImageSlot label={t`GG 聖甲蟲`} width={200} height={160} className="gp-hero-art" />
            </section>

            <div className="gp-grid gp-grid-4">
                <div className="gp-card gp-stat">
                    <div className="gp-stat-icon">
                        <ImageSlot label="GG" shape="circle" width={52} />
                    </div>
                    <div className="gp-stat-body">
                        <div className="gp-stat-label">{t`GG 實時價格`}</div>
                        <div className="gp-row">
                            <span className="gp-stat-value">$ 12.68</span>
                            <Delta value="+3.24%" />
                        </div>
                        <div className="gp-only-mobile">
                            <Segmented options={["1D", "7D", "30D", "90D"]} value={range} onChange={setRange} />
                        </div>
                    </div>
                    <Sparkline data={PRICE_TREND} />
                </div>
                <StatCard icon="chart" label={t`總市值`} value="$ 1,065,120,000" />
                <StatCard icon="swap" label={t`24h 交易量`} value="$ 4,286,530" />
                <StatCard
                    icon="layers"
                    label={t`流通數量`}
                    value="52,480,000"
                    footer={
                        <>
                            <div className="gp-muted gp-small">/ 84,000,000</div>
                            <div className="gp-row">
                                <Progress value={RELEASED_PCT} className="gp-grow" />
                                <span className="gp-small gp-muted">62.48%</span>
                            </div>
                        </>
                    }
                />
            </div>

            <div className="gp-grid gp-grid-3-2">
                <Card title={t`GG 排放進度（10年計劃）`} action={{ label: t`查看詳情`, to: "/overview/emission" }}>
                    <div className="gp-donut-row">
                        <DonutChart
                            items={[
                                { label: t`已釋放`, value: RELEASED_PCT, color: ACCENT },
                                { label: t`待釋放`, value: 100 - RELEASED_PCT, color: "#CFE3FB" },
                            ]}
                            size={190}
                        >
                            <div className="gp-donut-value">62.48%</div>
                            <div className="gp-donut-label">{t`已釋放`}</div>
                            <div className="gp-donut-sub">52,480,000 GG</div>
                            <div className="gp-donut-sub">/ 84,000,000 GG</div>
                        </DonutChart>
                        <Legend items={emissionStages()} />
                    </div>
                </Card>

                <Card title={t`資金分配總覽`} action={{ label: t`查看詳情`, to: "/overview/allocation" }}>
                    <div className="gp-donut-row">
                        <DonutChart items={allocation()} size={190}>
                            <div className="gp-donut-value">84,000,000</div>
                            <div className="gp-donut-label">{t`GG 總量`}</div>
                        </DonutChart>
                        <Legend items={allocation()} />
                    </div>
                </Card>
            </div>

            <div className="gp-grid gp-grid-4">
                <Card
                    title={t`協議儲備池`}
                    icon="drop"
                    right={
                        <Link className="gp-round-link" to="/overview/reserve">
                            <Icon name="arrowRight" size={16} />
                        </Link>
                    }
                >
                    <div className="gp-figure-row">
                        <span className="gp-figure">79,800,000</span>
                        <span className="gp-figure-pct">95%</span>
                    </div>
                    <p className="gp-muted gp-small">{t`用於生態建設、算力排放、流動性支持等`}</p>
                    <KvList rows={reserveRows()} className="gp-kv--boxed" />
                </Card>

                <Card
                    title={t`價格保護合約池`}
                    icon="shield"
                    right={
                        <span className="gp-round-link is-disabled">
                            <Icon name="arrowRight" size={16} />
                        </span>
                    }
                >
                    <div className="gp-figure-row">
                        <span className="gp-figure">4,200,000</span>
                        <span className="gp-figure-pct">5%</span>
                    </div>
                    <p className="gp-muted gp-small">{t`用於價格保護及市場調節`}</p>
                    <KvList rows={protectionRows()} className="gp-kv--boxed" />
                </Card>

                <Card title={t`生態池數據`} icon="database" action={{ label: t`查看詳情`, to: "/overview/eco-pools" }}>
                    {ecoPools().map(pool => (
                        <div className="gp-pool-mini" key={pool.key}>
                            <ImageSlot label={pool.a} shape="circle" width={44} />
                            <div className="gp-grow">
                                <div className="gp-strong">{pool.name}</div>
                                <div className="gp-pool-mini-value">{pool.value}</div>
                            </div>
                            <div className="gp-right">
                                <div className="gp-muted gp-small">{t`年化收益（參考）`}</div>
                                <div className="gp-positive gp-strong">{pool.apr}</div>
                            </div>
                        </div>
                    ))}
                </Card>

                <Card
                    title={t`關鍵指標`}
                    icon="chart"
                    right={
                        <span className="gp-round-link is-disabled">
                            <Icon name="arrowRight" size={16} />
                        </span>
                    }
                >
                    <KvList rows={keyMetrics} />
                </Card>
            </div>
        </div>
    );
}

export default Overview;
