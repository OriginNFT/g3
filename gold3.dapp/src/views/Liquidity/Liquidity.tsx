import { Link } from "react-router-dom";
import { t } from "@lingui/macro";

import Card from "src/components/Card/Card";
import Icon, { IconName } from "src/components/Icon/Icon";
import ImageSlot from "src/components/ImageSlot/ImageSlot";
import StatCard from "src/components/StatCard/StatCard";
import PoolCard from "./PoolCard";
import PoolTable from "./PoolTable";
import { ecoPools } from "./mock";

// 生態流動性 - the liquidity main board (3-1).

function Liquidity() {
    const features: { icon: IconName; label: string }[] = [
        { icon: "drop", label: t`增強流動性深度` },
        { icon: "chart", label: t`穩定價格運行` },
        { icon: "database", label: t`提升資金效率` },
        { icon: "share", label: t`共享生態增長` },
    ];

    return (
        <div className="gp-stack">
            <section className="gp-hero">
                <div className="gp-hero-text">
                    <h1 className="gp-hero-title">{t`生態流動性`}</h1>
                    <p className="gp-hero-subtitle">{t`構建深度流動性 · 穩定市場運行 · 共享生態增長`}</p>
                    <div className="gp-hero-features">
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
                <ImageSlot label="GG" shape="circle" width={180} className="gp-hero-art" />
            </section>

            <div className="gp-grid gp-grid-4">
                <StatCard icon="coins" label={t`生態池總價值 (USD)`} value="$ 36,520,890" delta="+12.6%" />
                <StatCard icon="swap" label={t`24h 交易量 (USD)`} value="$ 4,286,530" delta="+18.4%" />
                <Link to="/liquidity/pools" className="gp-link-card">
                    <StatCard icon="layers" label={t`總流動性池數`} value="4" />
                    <Icon name="chevronRight" size={16} className="gp-link-card-chevron" />
                </Link>
                <StatCard icon="users" label={t`參與地址數`} value="12,480" delta="+6.3%" />
            </div>

            <Card title={t`流動性池`}>
                <div className="gp-grid gp-grid-2">
                    {ecoPools().map(pool => (
                        <PoolCard pool={pool} key={pool.key} />
                    ))}
                </div>
            </Card>

            <Card title={t`流動性池列表`}>
                <PoolTable />
            </Card>
        </div>
    );
}

export default Liquidity;
