import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import PageHeader from "src/components/PageHeader/PageHeader";
import Progress from "src/components/Progress/Progress";
import DonutChart from "src/components/charts/DonutChart";
import LineChart from "src/components/charts/LineChart";
import { formatWan } from "src/helpers/format";
import { ACCENT } from "src/themes/tokens";
import { gg, pct, phaseProgress, useOverviewData } from "./useOverviewData";

// GG 排放進度 - the emission detail board, from EmissionController: the five
// phase budgets, their last protocol days and what is settled so far.

const DASH = "——";
const PHASE_MONTHS = ["1–12", "13–37", "38–68", "69–95", "96–120"];

function EmissionDetail() {
    const d = useOverviewData();
    const releasedPct = pct(d.released, d.totalBudget);
    const pending = d.released !== undefined && d.totalBudget !== undefined ? d.totalBudget - d.released : undefined;

    const settledDay = d.lastSettledDay === undefined ? DASH : String(d.lastSettledDay);
    const stages = (d.phases ?? []).map((phase, i) => {
        const n = i + 1;
        const months = PHASE_MONTHS[i];
        const endDay = phase.endDay === 0n ? DASH : String(phase.endDay);
        return {
            label: t`第${n}階段（${months}月）`,
            percent: d.totalBudget ? `${pct(phase.budget, d.totalBudget).toFixed(0)}%` : DASH,
            amount: gg(phase.budget),
            endDayText: t`至第 ${endDay} 天`,
            progress: d.lastSettledDay === undefined ? 0 : phaseProgress(d.phases!, i, d.lastSettledDay),
        };
    });
    const curveLabels = [t`創世`, ...PHASE_MONTHS.map(months => {
        const end = months.split("–")[1];
        return t`第${end}月`;
    })];

    // Cumulative plan at each phase end, in whole GG.
    let cumulative = 0n;
    const curve = (d.phases ?? []).map(phase => {
        cumulative += phase.budget;
        return Number(cumulative / 10n ** 18n);
    });

    return (
        <div className="gp-stack">
            <PageHeader title={t`GG 排放進度`} back="/overview" />

            <div className="gp-grid gp-grid-2">
                <Card>
                    <div className="gp-donut-row">
                        <DonutChart
                            items={[
                                { label: t`已釋放`, value: releasedPct, color: ACCENT },
                                { label: t`待釋放`, value: 100 - releasedPct, color: "#CFE3FB" },
                            ]}
                            size={200}
                        >
                            <div className="gp-donut-value">{releasedPct.toFixed(2)}%</div>
                            <div className="gp-donut-label">{t`已釋放`}</div>
                            <div className="gp-donut-sub">{gg(d.released)} GG</div>
                            <div className="gp-donut-sub">/ {gg(d.totalBudget)} GG</div>
                        </DonutChart>
                        <div className="gp-figure-stack">
                            <div>
                                <div className="gp-muted gp-small">{t`排放總量`}</div>
                                <div className="gp-strong-lg">{gg(d.totalBudget)} GG</div>
                            </div>
                            <div>
                                <div className="gp-muted gp-small">{t`已釋放（至第 ${settledDay} 天）`}</div>
                                <div className="gp-strong-lg">{gg(d.released)} GG</div>
                                <div className="gp-row">
                                    <Progress value={releasedPct} className="gp-grow" />
                                    <span className="gp-small gp-muted">{releasedPct.toFixed(2)}%</span>
                                </div>
                            </div>
                            <div>
                                <div className="gp-muted gp-small">{t`待釋放`}</div>
                                <div className="gp-strong-lg">{gg(pending)} GG</div>
                                <div className="gp-row">
                                    <Progress value={100 - releasedPct} tone="gold" className="gp-grow" />
                                    <span className="gp-small gp-muted">{(100 - releasedPct).toFixed(2)}%</span>
                                </div>
                            </div>
                            <div>
                                <div className="gp-muted gp-small">{t`創世時間`}</div>
                                <div className="gp-strong-lg">
                                    {d.genesis === undefined
                                        ? DASH
                                        : d.genesis === 0n
                                          ? t`未設定`
                                          : `${new Date(Number(d.genesis) * 1000).toLocaleString("sv-SE", { timeZone: "Asia/Singapore" }).slice(0, 16)} SGT`}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title={t`排放階段明細`}>
                    {stages.length === 0 ? (
                        <div className="gp-empty">{DASH}</div>
                    ) : (
                        <ol className="gp-timeline">
                            {stages.map(stage => (
                                <li key={stage.label}>
                                    <div className="gp-timeline-head">
                                        <span>{stage.label}</span>
                                        <span className="gp-strong">{stage.percent}</span>
                                        <span className="gp-muted">{stage.amount} GG</span>
                                        <span className="gp-muted gp-small">{stage.endDayText}</span>
                                    </div>
                                    <Progress value={stage.progress} />
                                </li>
                            ))}
                        </ol>
                    )}
                </Card>
            </div>

            <Card title={t`排放曲線圖（10年）`}>
                <LineChart
                    labels={curveLabels}
                    series={[{ label: t`累計釋放`, data: [0, ...curve] }]}
                    yFormat={formatWan}
                    height={280}
                />
            </Card>
        </div>
    );
}

export default EmissionDetail;
