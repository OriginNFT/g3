import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import Icon, { IconName } from "src/components/Icon/Icon";
import ImageSlot from "src/components/ImageSlot/ImageSlot";
import KvList from "src/components/KvList/KvList";
import PageHeader from "src/components/PageHeader/PageHeader";
import Progress from "src/components/Progress/Progress";
import { reserveRows } from "./mock";

// 協議儲備池詳情 - the reserve detail board.

function ReserveDetail() {
    const usage: { icon: IconName; label: string; pct: number }[] = [
        { icon: "power", label: t`生態建設`, pct: 40 },
        { icon: "trend", label: t`算力排放`, pct: 30 },
        { icon: "drop", label: t`流動性支持`, pct: 20 },
        { icon: "sprout", label: t`生態激勵`, pct: 10 },
    ];

    return (
        <div className="gp-stack">
            <PageHeader title={t`協議儲備池詳情`} back="/overview/allocation" />

            <ImageSlot label={t`協議儲備池`} shape="rect" width="100%" height={180} tone="dark" />

            <div className="gp-grid gp-grid-2">
                <Card title={t`協議儲備池`} icon="drop">
                    <div className="gp-figure-row">
                        <span className="gp-figure">79,800,000 GG</span>
                        <span className="gp-figure-pct">95%</span>
                    </div>
                    <p className="gp-muted gp-small">{t`用於生態建設、算力排放、流動性支持等`}</p>
                    <KvList rows={reserveRows(" GG")} className="gp-kv--boxed" />
                </Card>

                <Card title={t`資金使用方向`}>
                    <div className="gp-usage">
                        {usage.map(u => (
                            <div className="gp-usage-row" key={u.label}>
                                <span className="gp-icon-badge gp-icon-badge--sm gp-icon-badge--blue">
                                    <Icon name={u.icon} size={16} />
                                </span>
                                <span className="gp-usage-label">{u.label}</span>
                                <Progress value={u.pct} className="gp-grow" />
                                <span className="gp-strong">{u.pct}%</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default ReserveDetail;
