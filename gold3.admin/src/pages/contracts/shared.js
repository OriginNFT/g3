import { formatUnits, parseUnits } from 'ethers';

// Every GG and USDT-value figure in these contracts is 1e18 based; USDT
// itself (the anubis token) carries 6 decimals.
export function amount18(value, digits = 6) {
    if (value === undefined || value === null) return '';
    return Number(formatUnits(value, 18)).toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function amount6(value, digits = 6) {
    if (value === undefined || value === null) return '';
    return Number(formatUnits(value, 6)).toLocaleString(undefined, { maximumFractionDigits: digits });
}

// Base units of a draft value, for showing in a confirmation before it is
// sent. The draft is whatever the operator has typed so far, so this runs on
// half-finished input on every keystroke and must never throw during render.
export function wei(value, decimals = 18) {
    try {
        return parseUnits(String(value), decimals).toString();
    } catch {
        return '?';
    }
}

export function sgt(ts) {
    const n = Number(ts);
    if (!n) return '';
    return `${new Date((n + 8 * 3600) * 1000).toISOString().slice(0, 19).replace('T', ' ')} SGT`;
}

export const ZERO = /^0x0{40}$/i;
