import { Drawer } from "@mui/material";

import LocaleSwitch from "src/components/Sidebar/LocaleSwitch";
import { BrandLockup, NavList } from "src/components/Sidebar/Sidebar";

// The sidebar below the desktop cut, opened from the TopBar's menu button.

type Props = {
    open: boolean;
    onClose: () => void;
};

function MobileDrawer({ open, onClose }: Props) {
    return (
        <Drawer anchor="left" open={open} onClose={onClose} PaperProps={{ className: "gp-drawer" }}>
            <BrandLockup />
            <LocaleSwitch />
            <NavList onNavigate={onClose} />
        </Drawer>
    );
}

export default MobileDrawer;
