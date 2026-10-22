import { BackLink } from "src/components/PageHeader/PageHeader";
import CommunityLevelsPanel from "./CommunityLevelsPanel";

// 社區等級與權益 on its own page (board 4-5).

function CommunityLevels() {
    return (
        <div className="gp-stack">
            <BackLink to="/community" />
            <CommunityLevelsPanel />
        </div>
    );
}

export default CommunityLevels;
