import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import MobileDrawer from "./components/MobileDrawer/MobileDrawer";
import Sidebar from "./components/Sidebar/Sidebar";
import TopBar from "./components/TopBar/TopBar";

import Overview from "./views/Overview/Overview";
import EmissionDetail from "./views/Overview/EmissionDetail";
import AllocationDetail from "./views/Overview/AllocationDetail";
import ReserveDetail from "./views/Overview/ReserveDetail";
import EcoPoolDetail from "./views/Overview/EcoPoolDetail";
import Fundraise from "./views/Fundraise/Fundraise";
import Power from "./views/Power/Power";
import Liquidity from "./views/Liquidity/Liquidity";
import PoolList from "./views/Liquidity/PoolList";
import PoolDetail from "./views/Liquidity/PoolDetail";
import AddRemoveLiquidity from "./views/Liquidity/AddRemoveLiquidity";
import Community from "./views/Community/Community";
import CommunityStats from "./views/Community/CommunityStats";
import CommunityLevels from "./views/Community/CommunityLevels";
import Nft from "./views/Nft/Nft";
import Assets from "./views/Assets/Assets";
import Docs from "./views/Docs/Docs";

// The shell of the boards: the glass sidebar on the left (a drawer below
// 1100px), the header row and the routed page on the right.

function App() {
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <div className="gp-shell">
            <Sidebar />
            <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
            <div className="gp-main">
                <TopBar onMenu={() => setDrawerOpen(true)} />
                <main className="gp-page">
                    <Routes>
                        <Route path="/" element={<Navigate to="/fundraise" replace />} />
                        <Route path="/overview" element={<Overview />} />
                        <Route path="/overview/emission" element={<EmissionDetail />} />
                        <Route path="/overview/allocation" element={<AllocationDetail />} />
                        <Route path="/overview/reserve" element={<ReserveDetail />} />
                        <Route path="/overview/eco-pools" element={<EcoPoolDetail />} />
                        <Route path="/fundraise" element={<Fundraise />} />
                        <Route path="/power" element={<Power />} />
                        <Route path="/liquidity" element={<Liquidity />} />
                        <Route path="/liquidity/pools" element={<PoolList />} />
                        <Route path="/liquidity/add" element={<AddRemoveLiquidity />} />
                        <Route path="/liquidity/:pair" element={<PoolDetail />} />
                        <Route path="/community" element={<Community />} />
                        <Route path="/community/stats" element={<CommunityStats />} />
                        <Route path="/community/levels" element={<CommunityLevels />} />
                        <Route path="/nft" element={<Nft />} />
                        <Route path="/assets" element={<Assets />} />
                        <Route path="/docs" element={<Docs />} />
                        <Route path="*" element={<Navigate to="/fundraise" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export default App;
