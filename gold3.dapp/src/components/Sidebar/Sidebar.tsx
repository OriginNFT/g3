import { Link, useLocation } from "react-router-dom";

import Icon from "src/components/Icon/Icon";
import LocaleSwitch from "./LocaleSwitch";
import { isNavActive, NAV } from "./nav";

// The glass column of the boards: the brand lockup on top, the seven
// destinations below, the active one on a soft gold fill.

export function BrandLockup() {
    return (
        <Link to="/" className="gp-brand">
            <img src="/gg-emblem-144.png" alt="GOLDEN PACT" width={72} height={72} />
            <div className="gp-brand-name">GOLDEN PACT</div>
            <div className="gp-brand-sub">GG GOLD STANDARD</div>
        </Link>
    );
}

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
    const { pathname } = useLocation();
    return (
        <nav className="gp-nav">
            {NAV.map(item =>
                item.disabled ? (
                    <span key={item.to} className="gp-nav-item is-disabled" aria-disabled="true">
                        <Icon name={item.icon} size={22} />
                        <span>{item.label()}</span>
                    </span>
                ) : (
                    <Link
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={`gp-nav-item ${isNavActive(item, pathname) ? "is-active" : ""}`}
                    >
                        <Icon name={item.icon} size={22} />
                        <span>{item.label()}</span>
                    </Link>
                ),
            )}
        </nav>
    );
}

function Sidebar() {
    return (
        <aside className="gp-sidebar">
            <BrandLockup />
            <NavList />
            <LocaleSwitch />
        </aside>
    );
}

export default Sidebar;
