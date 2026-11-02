import { Button, Link, Stack, Typography } from '@mui/material';

import { txUrl } from '../chain/wallet';
import { MONO } from '../theme';

// Formatting and small pieces every report page shares. DECIMAL columns come
// from the API as strings; they are formatted for display here and never used
// in arithmetic on this side.

export function num(value, digits = 4) {
    if (value === null || value === undefined || value === '') return '—';
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return String(value);
    return parsed.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function when(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

export function TxLink({ hash }) {
    if (!hash) return <span>—</span>;
    return (
        <Link href={txUrl(hash)} target="_blank" rel="noopener" sx={{ fontFamily: MONO, fontSize: 12 }}>
            {`${hash.slice(0, 10)}...${hash.slice(-8)}`}
        </Link>
    );
}

export function Pager({ total, offset, pageSize, onChange }) {
    return (
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
                {total === 0 ? '0' : `第 ${offset + 1}-${Math.min(offset + pageSize, total)} 筆，共 ${total} 筆`}
            </Typography>
            <Button size="small" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - pageSize))}>
                較新
            </Button>
            <Button size="small" disabled={offset + pageSize >= total} onClick={() => onChange(offset + pageSize)}>
                較舊
            </Button>
        </Stack>
    );
}

export const BUCKET_LABEL = {
    EXPANSION: '拓展',
    COLLABORATION: '協作',
    CONTRIBUTION: '貢獻',
    DAO_BUILDING: 'DAO 組織建設',
    PLATFORM: '平台',
};

export const TAG_LABEL = {
    INITIAL_RESERVE: '初始保障儲備',
    UNUSED_EMISSION: '未滿足排放',
    UNUSED_COMMUNITY: '社區未分配',
    LP_AIRDROP: 'LP 空投',
    INITIAL_LIQUIDITY: '初始流動性',
    INSURANCE_RESERVE: '保障國庫儲備',
    EMISSION_BUDGET: '排放預算',
    TURBINE: '涡輪交易',
    USDT_GG_SELL: 'USDT/GG 賣出',
    GOT2_GG_SELL: 'GOT2/GG 賣出',
    AUG_GG_SELL: 'AUG/GG 賣出',
    GOT2_BUYBACK: 'GOT2 回購',
    GG_BUYBACK: 'GG 回購',
    AUG_BUYBACK: 'AUG 回購',
    LP_INCENTIVE: 'LP 激勵',
    ECO_RESERVE: '生態儲備',
    COMMUNITY_BUILDING: '社區建設',
};

export function tagLabel(name) {
    if (!name) return '—';
    return TAG_LABEL[name] || name;
}
