import { useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { t } from "@lingui/macro";

import Icon from "src/components/Icon/Icon";

// Header row of the boards: the network pill and the dark wallet pill on the
// right; the brand tagline on the left of the overview only; the menu button
// below the desktop cut.

type Props = {
    onMenu: () => void;
};

function TopBar({ onMenu }: Props) {
    const { pathname } = useLocation();
    return (
        <header className="gp-topbar">
            <button type="button" className="gp-menu-button" onClick={onMenu} aria-label={t`選單`}>
                <Icon name="menu" size={22} />
            </button>

            {pathname === "/" && (
                <div className="gp-tagline">
                    <span>{t`以黃金為錨 · 構建可持續的價值生態`}</span>
                    <span className="gp-tagline-en">GOLDEN PACT · GG GOLD STANDARD</span>
                </div>
            )}

            <div className="gp-topbar-right">
                <ConnectButton.Custom>
                    {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
                        const connected = mounted && !!account && !!chain;
                        return (
                            <>
                                <button
                                    type="button"
                                    className="gp-chain-pill"
                                    onClick={openChainModal}
                                    disabled={!connected}
                                >
                                    <Icon name="globe" size={18} />
                                    <span>{chain?.name ?? "Anubis Chain"}</span>
                                    <Icon name="chevronDown" size={14} />
                                </button>
                                <button
                                    type="button"
                                    className="gp-wallet-pill"
                                    onClick={connected ? openAccountModal : openConnectModal}
                                >
                                    <span className="gp-wallet-coin" />
                                    <span>{connected ? account?.displayName : t`連接錢包`}</span>
                                    <Icon name="chevronDown" size={14} />
                                </button>
                            </>
                        );
                    }}
                </ConnectButton.Custom>
            </div>
        </header>
    );
}

export default TopBar;
