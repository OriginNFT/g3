import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BrowserProvider } from 'ethers';

import { chainInfo } from './client';

// Signing lives here and nowhere else.
//
// Reads keep going through the fixed RPC in client.js — they must not depend on
// which chain the operator's wallet happens to be on. Writes go through the
// injected wallet, and every write path funnels through getSigner(), which
// refuses to hand back a signer that is not on the configured chain. A panel
// that can silently broadcast to the wrong network is worse than one that
// cannot broadcast at all.
const CHAIN_ID = chainInfo.chainId;
const CHAIN_ID_HEX = `0x${CHAIN_ID.toString(16)}`;

export const EXPLORER_URL = (import.meta.env.VITE_EXPLORER_URL || 'https://browser.anubispace.org').replace(/\/$/, '');

// Only used when the wallet has never seen this chain (error 4902). Anubis has
// no native coin — gas is paid in DAI (ERC20-as-gas, 18 decimals).
const CHAIN_PARAMS = {
    chainId: CHAIN_ID_HEX,
    chainName: 'Anubis',
    nativeCurrency: { name: 'DAI', symbol: 'DAI', decimals: 18 },
    rpcUrls: [chainInfo.rpcUrl],
    blockExplorerUrls: [EXPLORER_URL],
};

export function txUrl(hash) {
    return `${EXPLORER_URL}/tx/${hash}`;
}

export function addressUrl(address) {
    return `${EXPLORER_URL}/address/${address}`;
}

export function shorten(value) {
    if (!value) return '—';
    return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function injected() {
    if (!window.ethereum) throw new Error('沒有偵測到錢包，請先安裝並解鎖擴充功能');
    return window.ethereum;
}

async function ensureChain() {
    const provider = injected();
    try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_ID_HEX }] });
    } catch (err) {
        // 4902 = the wallet does not know this chain yet. Anything else is a
        // refusal or a wallet problem and must surface, not be swallowed.
        const code = err?.code ?? err?.data?.originalError?.code;
        if (code !== 4902) {
            console.error('[WALLET] switch chain failed:', err.message, err);
            throw err;
        }
        await provider.request({ method: 'wallet_addEthereumChain', params: [CHAIN_PARAMS] });
    }
}

/**
 * A signer that is guaranteed to be on the configured chain, or an exception.
 *
 * Called by every write. It re-checks the chain on each call instead of trusting
 * the state held in React — the operator can switch networks in the wallet
 * between opening a confirmation dialog and confirming it.
 */
export async function getSigner() {
    const provider = injected();
    await provider.request({ method: 'eth_requestAccounts' });
    await ensureChain();

    const browserProvider = new BrowserProvider(provider);
    const network = await browserProvider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
        throw new Error(`錢包目前在 chainId=${network.chainId}，請切換到 ${CHAIN_ID} 後再送出`);
    }
    return browserProvider.getSigner();
}

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
    const [account, setAccount] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState(null);

    const readState = useCallback(async () => {
        if (!window.ethereum) return;
        try {
            // eth_accounts (not eth_requestAccounts) — this only reports an
            // already-granted connection, so opening the panel never pops the
            // wallet open by itself.
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            setAccount(accounts && accounts.length ? accounts[0] : null);
            const hex = await window.ethereum.request({ method: 'eth_chainId' });
            setChainId(Number(hex));
        } catch (err) {
            console.error('[WALLET] read state failed:', err.message, err);
        }
    }, []);

    useEffect(() => {
        readState();
        if (!window.ethereum) return undefined;

        const onAccounts = (accounts) => setAccount(accounts && accounts.length ? accounts[0] : null);
        const onChain = (hex) => setChainId(Number(hex));
        window.ethereum.on('accountsChanged', onAccounts);
        window.ethereum.on('chainChanged', onChain);
        return () => {
            window.ethereum.removeListener('accountsChanged', onAccounts);
            window.ethereum.removeListener('chainChanged', onChain);
        };
    }, [readState]);

    const connect = useCallback(async () => {
        setConnecting(true);
        setError(null);
        try {
            const provider = injected();
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            setAccount(accounts && accounts.length ? accounts[0] : null);
            await ensureChain();
            await readState();
        } catch (err) {
            console.error('[WALLET] connect failed:', err.message, err);
            setError(err);
        } finally {
            setConnecting(false);
        }
    }, [readState]);

    const value = useMemo(
        () => ({
            account,
            chainId,
            connecting,
            error,
            connect,
            installed: Boolean(window.ethereum),
            wrongChain: chainId !== null && chainId !== CHAIN_ID,
            expectedChainId: CHAIN_ID,
        }),
        [account, chainId, connecting, error, connect]
    );

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
    const value = useContext(WalletContext);
    if (!value) throw new Error('useWallet must be used inside WalletProvider');
    return value;
}
