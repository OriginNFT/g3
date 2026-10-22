// import { Link } from "react-router-dom";
// import { t } from "@lingui/macro";

// import Icon from "src/components/Icon/Icon";
// import ImageSlot from "src/components/ImageSlot/ImageSlot";
// import PageHeader from "src/components/PageHeader/PageHeader";
// import StatCard from "src/components/StatCard/StatCard";
import CommunityInvite from "./CommunityInvite";
// import CommunityLevelsPanel from "./CommunityLevelsPanel";
// import CommunityStatsPanel from "./CommunityStatsPanel";

// 我的社區 · 主頁 - the community main board (4-1).
// Hidden for now: every board figure is still mock data, so only the
// 推薦關係 card (read from the shared Community) is rendered.

function Community() {
    return (
        <div className="gp-stack">
            {/* <div className="gp-card gp-grid gp-grid-head">
                <PageHeader title={t`我的社區`} subtitle={t`連接社區力量 · 共享黃金增長`} />
                <StatCard icon="users" label={t`社區總人數`} value="1,286" delta="+12.6%" />
                <StatCard icon="database" label={t`社區總算力 (DAI)`} value="26,520,000" delta="+18.4%" />
                <StatCard icon="shield" label={t`社區總收益 (GG)`} value="186,520" delta="+26.7%" />
                <StatCard
                    badge={<ImageSlot label="P3" shape="circle" width={52} />}
                    label={t`我的社區等級`}
                    value="P3"
                    footer={
                        <Link className="gp-btn gp-btn-outline gp-btn-sm" to="/community/levels">
                            {t`查看權益`}
                            <Icon name="chevronRight" size={14} />
                        </Link>
                    }
                />
            </div> */}

            <CommunityInvite />

            {/* <div className="gp-grid gp-grid-2">
                <CommunityStatsPanel />
                <CommunityLevelsPanel />
            </div> */}
        </div>
    );
}

export default Community;
