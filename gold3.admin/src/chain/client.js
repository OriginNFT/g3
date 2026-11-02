import { JsonRpcProvider } from 'ethers';

import book from '../assets/addresses.json';

// Chain reads happen in the browser, not through the admin API. That keeps the
// API a pure database and redis reader — no RPC, no address book, no keys — and
// it means live values are as fresh as the node, not as fresh as the last
// settlement.
//
// Read-only: nothing in this module signs, and window.ethereum is never touched
// here. Signing lives in chain/wallet.jsx and goes out over the wallet's own
// connection; reads must not depend on which chain the operator happens to be
// on, which is why they run against this fixed RPC instead.
const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://rpc2.anubispace.org';
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 6714);

// Contract addresses come from the synced address book (npm run sync-addresses),
// which is a build-time copy of gold3.contract/config/addresses.json — a copy on
// purpose, because the panel ships as static files and must not depend on the
// contract repo being present at runtime.
//
// The block the panel operates is fixed at BUILD time by VITE_NETWORK
// (anubis when unset). It is a
// build-time choice on purpose: a panel that can switch deployments at runtime
// is a panel that can sign against the wrong one.
const NETWORK = import.meta.env.VITE_NETWORK || 'anubis';
if (!book[NETWORK]) throw new Error(`addresses.json has no "${NETWORK}" block (VITE_NETWORK)`);
export const ADDRESSES = book[NETWORK];

let provider = null;

export function getProvider() {
    // staticNetwork skips ethers' own chainId probe on every call; the id is
    // configured, not discovered.
    if (!provider) provider = new JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
    return provider;
}

export const chainInfo = { rpcUrl: RPC_URL, chainId: CHAIN_ID };
