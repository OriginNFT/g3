import "@rainbow-me/rainbowkit/styles.css";
import { defineChain } from "viem";
import { createConfig, createConnector, http, injected } from "wagmi";
import { connectorsForWallets, type Wallet } from "@rainbow-me/rainbowkit";
import {
    bitgetWallet,
    injectedWallet,
    metaMaskWallet,
    tokenPocketWallet,
    walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";

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

// AstraCore, ported from helix.dapp/src/hooks/wagmi.ts. It is a mobile-only
// wallet: inside its in-app browser it injects window.ethereum with an
// `isAstraCore` flag and announces itself over EIP-6963 as
// `com.astracore.wallet`. `rdns` lets RainbowKit dedupe this entry against the
// auto-discovered EIP-6963 connector: inside AstraCore the live connector is
// used and this entry is hidden; in other browsers it falls back to a download
// prompt.
const getAstraCoreProvider = (): any => {
    if (typeof window === "undefined") return undefined;
    const eth = (window as any).ethereum;
    if (!eth) return undefined;
    if (Array.isArray(eth.providers)) {
        const found = eth.providers.find((p: any) => p?.isAstraCore);
        if (found) return found;
    }
    return eth.isAstraCore ? eth : undefined;
};

// The AstraCore mark as a data URI: the connector list is built at module load,
// and a missing asset file would take the whole app mount down with it.
const ASTRACORE_ICON =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiByeD0iMTg1IiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfNzFfNjQxKSIvPgo8cGF0aCBkPSJNMjIzLjE4MiA2OTMuOTY4TDMyNy44MTUgNDgwLjAxNUMzMjkuOTMxIDQ3NS42NzkgMzM2LjEyMSA0NzUuNjc5IDMzOC4yNTQgNDgwLjAxNUw0NDIuODg4IDY5My45NjhDNDQ2LjEwNSA3MDAuNTYgNDUyLjgwMiA3MDQuNzIyIDQ2MC4xMjggNzA0LjcyMkg1MjUuMDdDNTM5LjI2OCA3MDQuNzIyIDU0OC41NTMgNjg5Ljg0MSA1NDIuMzEgNjc3LjA5NEwzODAuNzc5IDM0Ni43OTNDMzYxLjM1MyAzMDcuMDY2IDMwNC43MTcgMzA3LjA2NiAyODUuMjkxIDM0Ni43OTNMMTIzLjc1OSA2NzcuMDk0QzExNy41MTcgNjg5Ljg0MSAxMjYuODAyIDcwNC43MjIgMTQxIDcwNC43MjJIMjA1Ljk0MUMyMTMuMjY4IDcwNC43MjIgMjE5Ljk2NSA3MDAuNTQyIDIyMy4xODIgNjkzLjk2OFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik04MDUuOTc1IDU3OS4wMzZDNzg1Ljg4NCA2MDQuMzU1IDc1NC42OSA2MjAuNDk0IDcxOS44MjQgNjE5Ljk4N0M2NjAuODEgNjE5LjExMiA2MTIuNzc3IDU2OS42ODEgNjEzLjUyOSA1MTAuNjY3QzYxNC4yOTggNDUxLjgxMSA2NjIuNDAxIDQwNC4xNjMgNzIxLjQzMiA0MDQuMTYzQzc1NS42NTEgNDA0LjE2MyA3ODYuMTgxIDQyMC4xOTcgODA1Ljk3NSA0NDUuMTE0QzgwOC41MjggNDQ4LjMzMSA4MTIuNDA5IDQ1MC4yMzcgODE2LjUxOCA0NTAuMjM3SDg4OS40ODZDODk5LjI3NyA0NTAuMjM3IDkwNS44MTcgNDQwLjEzMSA5MDEuNzk1IDQzMS4xOTZDODY5LjA4IDM1OC41MjYgNzkzLjc1MiAzMDkuMDI0IDcwNy43OTMgMzE0LjgxMkM2MDguNzM4IDMyMS40OTEgNTI5LjI4NCA0MDIuMTUyIDUyMy45ODYgNTAxLjI5NUM1MTcuOTAxIDYxNS4xOTYgNjA4LjgyNSA3MDkuODEgNzIxLjQzMiA3MDkuODFDODAxLjYzOCA3MDkuODEgODcwLjc5NCA2NjEuNzk1IDkwMS43NzggNTkzLjAyNEM5MDUuODE3IDU4NC4wNzEgODk5LjMxMiA1NzMuOTEyIDg4OS41MDMgNTczLjkxMkg4MTYuNTE4QzgxMi40MDkgNTczLjkxMiA4MDguNTI4IDU3NS44MDEgODA1Ljk3NSA1NzkuMDE4VjU3OS4wMzZaIiBmaWxsPSJ3aGl0ZSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzcxXzY0MSIgeDE9IjU4MyIgeTE9Ii0zMi41IiB4Mj0iMjAuNjQxIiB5Mj0iNjU2LjM5MiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjNjlEOUZGIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwMzhFMCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=";

const ASTRACORE_DOWNLOAD_URL = "https://api.astracorewallet.app/website/download";

const astraCoreWallet = (): Wallet => {
    const provider = getAstraCoreProvider();
    return {
        id: "astracore",
        name: "AstraCore Wallet",
        rdns: "com.astracore.wallet",
        iconUrl: ASTRACORE_ICON,
        iconBackground: "#2B7CFF",
        installed: provider ? true : undefined,
        downloadUrls: {
            ios: ASTRACORE_DOWNLOAD_URL,
            android: ASTRACORE_DOWNLOAD_URL,
            qrCode: ASTRACORE_DOWNLOAD_URL,
            mobile: ASTRACORE_DOWNLOAD_URL,
        },
        createConnector: walletDetails =>
            createConnector(cfg => ({
                ...injected(
                    provider
                        ? {
                              target: () => ({
                                  id: "astracore",
                                  name: "AstraCore Wallet",
                                  provider: getAstraCoreProvider(),
                              }),
                          }
                        : {},
                )(cfg),
                ...walletDetails,
            })),
    };
};

// One group, so this order is the order the modal renders: helix's order for
// the wallets both dapps carry, then this dapp's browser-wallet entry.
const connectors = connectorsForWallets(
    [
        {
            groupName: "Popular",
            wallets: [
                astraCoreWallet,
                metaMaskWallet,
                bitgetWallet,
                tokenPocketWallet,
                injectedWallet,
                walletConnectWallet,
            ],
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
