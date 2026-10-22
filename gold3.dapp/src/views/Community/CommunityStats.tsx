import { BackLink } from "src/components/PageHeader/PageHeader";
import CommunityStatsPanel from "./CommunityStatsPanel";

// 社區算力統計 on its own page (board 4-3).

function CommunityStats() {
    return (
        <div className="gp-stack">
            <BackLink to="/community" />
            <CommunityStatsPanel />
        </div>
    );
}

export default CommunityStats;
