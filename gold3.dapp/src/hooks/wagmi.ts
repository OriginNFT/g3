import "@rainbow-me/rainbowkit/styles.css";
import { defineChain } from "viem";
import { createConfig, http } from "wagmi";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";

import { ANUBIS_CHAIN_ID, ANUBIS_EXPLORER_URL, ANUBIS_RPC_URL } from "src/constants";

// getWalletConnectConnector() throws at construction without a projectId, which
// would break the app mount. The placeholder keeps the app mounting; the
// WalletConnect entry is rendered but cannot open a session.
const PLACEHOLDER_PROJECT_ID = "00000000000000000000000000000000";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || PLACEHOLDER_PROJECT_ID;
if (projectId === PLACEHOLDER_PROJECT_ID) {
    console.error(
        "VITE_WALLETCONNECT_PROJECT_ID is not set: the WalletConnect connector is rendered but cannot open a session.",
    );
}

const connectors = connectorsForWallets(
    [
        {
            groupName: "Popular",
            wallets: [injectedWallet, metaMaskWallet, walletConnectWallet],
        },
    ],
    {
        appName: "GOLDEN PACT",
        projectId,
    },
);

// anubis has no native coin of its own: gas is DAI (18 decimals).
export const anubis = defineChain({
    id: ANUBIS_CHAIN_ID,
    name: "Anubis Chain",
    nativeCurrency: { name: "DAI", symbol: "DAI", decimals: 18 },
    rpcUrls: { default: { http: [ANUBIS_RPC_URL] } },
    blockExplorers: { default: { name: "Anubis Explorer", url: ANUBIS_EXPLORER_URL } },
});

export const config = createConfig({
    connectors,
    chains: [anubis],
    // Makes wagmi's <Hydrate> reconnect in an effect instead of during render.
    ssr: true,
    transports: {
        [anubis.id]: http(ANUBIS_RPC_URL),
    },
});
