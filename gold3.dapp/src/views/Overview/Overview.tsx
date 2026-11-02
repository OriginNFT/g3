import { Link } from "react-router-dom";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import StatCard from "src/components/StatCard/StatCard";
import Icon from "src/components/Icon/Icon";
import ImageSlot from "src/components/ImageSlot/ImageSlot";
import KvList from "src/components/KvList/KvList";
import Legend from "src/components/Legend/Legend";
import Progress from "src/components/Progress/Progress";
import DonutChart from "src/components/charts/DonutChart";
import { GG_DECIMALS, VALUE_DECIMALS } from "src/constants";
import { formatAmount } from "src/helpers/format";
import { ACCENT } from "src/themes/tokens";
import { ecoPools } from "./mock";
import { gg, pct, phaseProgress, usdt, useAllocationItems } from "./useOverviewData";

// 數據總覽 - the desktop overview board and its mobile variant, on chain
// figures. 24h 交易量, 生態池 and the community counts have no source yet and
// render DASH / disabled.

const DASH = "——";
const PHASE_COLORS = ["#B9D8FA", "#2D7BEF", "#1A5BD0", "#5AA0F2", "#8EC1F5"];
const PHASE_MONTHS = ["1–12", "13–37", "38–68", "69–95", "96–120"];

function Overview() {
    const { data: d, legend: allocationLegend } = useAllocationItems();

    const features = [
        { icon: "shield" as const, label: t`黃金本位價值體系` },
        { icon: "lock" as const, label: t`鏈上透明與安全` },
        { icon: "users" as const, label: t`社區共建共享` },
    ];

    const releasedPct = pct(d.released, d.totalBudget);
    const circulatingPct = pct(d.circulating, d.totalSupply);
    const marketCap =
        d.ggPrice !== undefined && d.circulating !== undefined ? (d.circulating * d.ggPrice) / 10n ** BigInt(VALUE_DECIMALS) : undefined;
    const priceText = d.ggPrice === undefined ? DASH : formatAmount(d.ggPrice, VALUE_DECIMALS);
    const capText = marketCap === undefined ? DASH : formatAmount(marketCap, GG_DECIMALS, 0);

    const stages = (d.phases ?? []).map((phase, i) => {
        const n = i + 1;
        const months = PHASE_MONTHS[i];
        return {
            label: t`第${n}階段（${months}月）`,
            percent: d.totalBudget ? `${pct(phase.budget, d.totalBudget).toFixed(0)}%` : DASH,
            amount: gg(phase.budget),
            color: PHASE_COLORS[i],
            progress: d.lastSettledDay === undefined ? 0 : phaseProgress(d.phases!, i, d.lastSettledDay),
        };
    });

    const keyMetrics: [string, string][] = [
        [t`本位倉總算力（USDT）`, d.totalPower === undefined ? DASH : formatAmount(d.totalPower, VALUE_DECIMALS, 0)],
        [t`已結算天數`, d.lastSettledDay === undefined ? DASH : String(d.lastSettledDay)],
        [t`保險庫餘額（GG）`, gg(d.treasuryBalance)],
        [t`保險庫已支付（GG）`, gg(d.treasuryPaid)],
    ];

    const reserveRows: [string, string][] = [
        [t`累計存入`, `${usdt(d.reserveDeposited)} USDT`],
        [t`累計提出`, `${usdt(d.reserveWithdrawn)} USDT`],
        [t`使用比例`, `${pct(d.reserveWithdrawn, d.reserveDeposited).toFixed(2)}%`],
    ];
    const protectionRows: [string, string][] = [
        [t`累計存入`, `${usdt(d.protectionDeposited)} USDT`],
        [t`已使用`, `${usdt(d.protectionSpent)} USDT`],
        [t`使用比例`, `${pct(d.protectionSpent, d.protectionDeposited).toFixed(2)}%`],
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
                        <div className="gp-stat-label">{t`GG 實時價格（TWAP）`}</div>
                        <div className="gp-row">
                            <span className="gp-stat-value">$ {priceText}</span>
                        </div>
                    </div>
                </div>
                <StatCard icon="chart" label={t`流通市值`} value={`$ ${capText}`} />
                <StatCard icon="swap" label={t`24h 交易量`} value={`$ ${DASH}`} className="is-disabled" />
                <StatCard
                    icon="layers"
                    label={t`流通數量`}
                    value={gg(d.circulating)}
                    footer={
                        <>
                            <div className="gp-muted gp-small">/ {gg(d.totalSupply)}</div>
                            <div className="gp-row">
                                <Progress value={circulatingPct} className="gp-grow" />
                                <span className="gp-small gp-muted">{circulatingPct.toFixed(2)}%</span>
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
                                { label: t`已釋放`, value: releasedPct, color: ACCENT },
                                { label: t`待釋放`, value: 100 - releasedPct, color: "#CFE3FB" },
                            ]}
                            size={190}
                        >
                            <div className="gp-donut-value">{releasedPct.toFixed(2)}%</div>
                            <div className="gp-donut-label">{t`已釋放`}</div>
                            <div className="gp-donut-sub">{gg(d.released)} GG</div>
                            <div className="gp-donut-sub">/ {gg(d.totalBudget)} GG</div>
                        </DonutChart>
                        <Legend items={stages.map(s => ({ label: s.label, color: s.color, percent: s.percent, amount: s.amount }))} />
                    </div>
                </Card>

                <Card title={t`資金分配總覽`} action={{ label: t`查看詳情`, to: "/overview/allocation" }}>
                    <div className="gp-donut-row">
                        <DonutChart items={allocationLegend} size={190}>
                            <div className="gp-donut-value">{gg(d.totalSupply)}</div>
                            <div className="gp-donut-label">{t`GG 總量`}</div>
                        </DonutChart>
                        <Legend items={allocationLegend} />
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
                        <span className="gp-figure">{usdt(d.reserveBalance)}</span>
                        <span className="gp-figure-pct">USDT</span>
                    </div>
                    <p className="gp-muted gp-small">{t`本位倉 USDT 的 95%，用於生態建設、流動性支持等`}</p>
                    <KvList rows={reserveRows} className="gp-kv--boxed" />
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
                        <span className="gp-figure">{usdt(d.protectionBalance)}</span>
                        <span className="gp-figure-pct">USDT</span>
                    </div>
                    <p className="gp-muted gp-small">{t`本位倉 USDT 的 5%，用於價格保護及市場調節`}</p>
                    <KvList rows={protectionRows} className="gp-kv--boxed" />
                </Card>

                <Card title={t`生態池數據`} icon="database" action={{ label: t`查看詳情`, to: "/overview/eco-pools" }} className="is-disabled">
                    {ecoPools().map(pool => (
                        <div className="gp-pool-mini" key={pool.key}>
                            <ImageSlot label={pool.a} shape="circle" width={44} />
                            <div className="gp-grow">
                                <div className="gp-strong">{pool.name}</div>
                                <div className="gp-pool-mini-value">$ {DASH}</div>
                            </div>
                            <div className="gp-right">
                                <div className="gp-muted gp-small">{t`年化收益（參考）`}</div>
                                <div className="gp-positive gp-strong">{DASH}</div>
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
