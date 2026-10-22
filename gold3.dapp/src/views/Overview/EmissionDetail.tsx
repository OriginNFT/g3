import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import PageHeader from "src/components/PageHeader/PageHeader";
import Progress from "src/components/Progress/Progress";
import DonutChart from "src/components/charts/DonutChart";
import LineChart from "src/components/charts/LineChart";
import { formatWan } from "src/helpers/format";
import { ACCENT } from "src/themes/tokens";
import { emissionStages, RELEASED_PCT } from "./mock";

// GG 排放進度 - the emission detail board.

const CURVE_YEARS = [1, 2, 4, 6, 8, 10];
const CURVE_CUMULATIVE = [3_360_000, 6_720_000, 26_040_000, 51_240_000, 70_560_000, 84_000_000];

function EmissionDetail() {
    return (
        <div className="gp-stack">
            <PageHeader title={t`GG 排放進度`} back="/" />

            <div className="gp-grid gp-grid-2">
                <Card>
                    <div className="gp-donut-row">
                        <DonutChart
                            items={[
                                { label: t`已釋放`, value: RELEASED_PCT, color: ACCENT },
                                { label: t`待釋放`, value: 100 - RELEASED_PCT, color: "#CFE3FB" },
                            ]}
                            size={200}
                        >
                            <div className="gp-donut-value">62.48%</div>
                            <div className="gp-donut-label">{t`已釋放`}</div>
                            <div className="gp-donut-sub">52,480,000 GG</div>
                            <div className="gp-donut-sub">/ 84,000,000 GG</div>
                        </DonutChart>
                        <div className="gp-figure-stack">
                            <div>
                                <div className="gp-muted gp-small">{t`總量`}</div>
                                <div className="gp-strong-lg">84,000,000 GG</div>
                            </div>
                            <div>
                                <div className="gp-muted gp-small">{t`已釋放`}</div>
                                <div className="gp-strong-lg">52,480,000 GG</div>
                                <div className="gp-row">
                                    <Progress value={62.48} className="gp-grow" />
                                    <span className="gp-small gp-muted">62.48%</span>
                                </div>
                            </div>
                            <div>
                                <div className="gp-muted gp-small">{t`待釋放`}</div>
                                <div className="gp-strong-lg">31,520,000 GG</div>
                                <div className="gp-row">
                                    <Progress value={37.52} tone="gold" className="gp-grow" />
                                    <span className="gp-small gp-muted">37.52%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title={t`排放階段明細`}>
                    <ol className="gp-timeline">
                        {emissionStages().map(stage => (
                            <li key={stage.label}>
                                <div className="gp-timeline-head">
                                    <span>{stage.label}</span>
                                    <span className="gp-strong">{stage.percent}</span>
                                    <span className="gp-muted">{stage.amount} GG</span>
                                </div>
                                <Progress value={stage.progress} />
                            </li>
                        ))}
                    </ol>
                </Card>
            </div>

            <Card title={t`排放曲線圖（10年）`}>
                <LineChart
                    labels={CURVE_YEARS.map(year => t`${year}年`)}
                    series={[{ label: t`累計釋放`, data: CURVE_CUMULATIVE }]}
                    yFormat={formatWan}
                    height={280}
                />
            </Card>
        </div>
    );
}

export default EmissionDetail;
