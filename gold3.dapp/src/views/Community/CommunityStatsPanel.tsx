import { useState } from "react";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import Delta from "src/components/Delta/Delta";
import Icon, { IconName } from "src/components/Icon/Icon";
import Legend from "src/components/Legend/Legend";
import Segmented from "src/components/Segmented/Segmented";
import DonutChart from "src/components/charts/DonutChart";
import { ACCENT, GOLD } from "src/themes/tokens";

// 社區算力統計 (board 4-3), embedded in 我的社區 and on its own page.

function CommunityStatsPanel() {
    const [range, setRange] = useState("30D");

    const tiles: { icon: IconName; label: string; value: string; delta?: string; pct?: string }[] = [
        { icon: "database", label: t`總算力 (DAI)`, value: "26,520,000", delta: "+18.4%" },
        { icon: "power", label: t`DAI 參與算力`, value: "12,650,000", pct: "47.7%" },
        { icon: "trend", label: t`GOT2 貢獻算力`, value: "8,950,000", pct: "33.7%" },
        { icon: "shield", label: t`GG 貢獻算力`, value: "4,920,000", pct: "18.6%" },
    ];

    const contribution = [
        { label: "DAI", value: 47.7, color: ACCENT, amount: "12,650,000", percent: "47.7%" },
        { label: "GOT2", value: 33.7, color: GOLD, amount: "8,950,000", percent: "33.7%" },
        { label: "GG", value: 18.6, color: "#F6DFA1", amount: "4,920,000", percent: "18.6%" },
    ];

    return (
        <Card
            title={t`社區算力統計`}
            subtitle={t`多維度數據統計 · 追蹤社區貢獻`}
            right={<Segmented options={["7D", "30D", "90D"]} value={range} onChange={setRange} />}
        >
            <div className="gp-grid gp-grid-4 gp-grid-tight">
                {tiles.map(tile => (
                    <div className="gp-tile" key={tile.label}>
                        <span className="gp-icon-badge gp-icon-badge--sm">
                            <Icon name={tile.icon} size={16} />
                        </span>
                        <div className="gp-muted gp-small">{tile.label}</div>
                        <div className="gp-strong-lg">{tile.value}</div>
                        {tile.delta && <Delta value={tile.delta} />}
                        {tile.pct && <div className="gp-small">{tile.pct}</div>}
                    </div>
                ))}
            </div>

            <div className="gp-subcard">
                <h4 className="gp-subcard-title">{t`算力貢獻佔比`}</h4>
                <div className="gp-donut-row">
                    <DonutChart items={contribution} size={200}>
                        <div className="gp-donut-value">26,520,000</div>
                        <div className="gp-donut-label">{t`總算力 (DAI)`}</div>
                    </DonutChart>
                    <Legend items={contribution} />
                </div>
            </div>
        </Card>
    );
}

export default CommunityStatsPanel;
