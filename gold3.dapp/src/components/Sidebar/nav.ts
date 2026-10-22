import { t } from "@lingui/macro";

import type { IconName } from "src/components/Icon/Icon";

// The seven destinations of the boards' sidebar plus 募資. One list, rendered by both
// Sidebar (desktop) and MobileDrawer, so a route never exists in one menu only.
// `label` is a function so `t` runs at render, after the locale is active.

export type NavItem = {
    to: string;
    icon: IconName;
    label: () => string;
    /** Path prefixes that light this item up besides `to` itself. */
    also?: string[];
    /** Rendered greyed out and not clickable: the page is still mock data. */
    disabled?: boolean;
};

export const NAV: NavItem[] = [
    { to: "/overview", icon: "home", label: () => t`數據總覽`, disabled: true },
    { to: "/fundraise", icon: "coins", label: () => t`募資` },
    { to: "/power", icon: "power", label: () => t`本位倉算力`, disabled: true },
    { to: "/liquidity", icon: "liquidity", label: () => t`生態流動性`, disabled: true },
    { to: "/community", icon: "community", label: () => t`我的社區` },
    { to: "/nft", icon: "nft", label: () => t`NFT 權益`, disabled: true },
    { to: "/assets", icon: "assets", label: () => t`我的資產`, disabled: true },
    { to: "/docs", icon: "docs", label: () => t`官方文檔` },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
    if (item.to === "/") return pathname === "/" || (item.also ?? []).some(p => pathname.startsWith(p));
    return pathname === item.to || pathname.startsWith(`${item.to}/`) || (item.also ?? []).some(p => pathname.startsWith(p));
}
