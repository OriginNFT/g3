import { useCallback, useState } from 'react';
import { Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { parseUnits, solidityPackedKeccak256 } from 'ethers';

import { ADDRESSES } from '../../chain/client';
import { contractAt, CONTRACTS, TAGS } from '../../chain/contracts';
import { useChainRead } from '../../hooks/useChainRead';
import { ContractCard, ReadGrid, WriteRow, AddressLink } from '../../components/ContractCard';
import { amount6 } from './shared';

const PURPOSES = [
    { name: 'GOT2_BUYBACK', label: 'GOT2 回購' },
    { name: 'GG_BUYBACK', label: 'GG 回購' },
    { name: 'AUG_BUYBACK', label: 'AUG 回購' },
];

// A path as the operator types it: comma-separated addresses.
function parsePath(text) {
    return String(text || '')
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function RouterCard() {
    const load = useCallback(async () => {
        const c = contractAt('feeRouter');
        if (!c) return null;
        const [buybackExecutor, lpStakeVault, ecoReserve, communityBuilding] = await Promise.all([
            c.buybackExecutor(),
            c.lpStakeVault(),
            c.ecoReserve(),
            c.communityBuilding(),
        ]);
        return { buybackExecutor, lpStakeVault, ecoReserve, communityBuilding };
    }, []);
    const { data: d, error, loading, reload } = useChainRead(load);

    return (
        <ContractCard
            title={CONTRACTS.feeRouter.label}
            subtitle="涡輪 2.5%：GOT2 / GG / AUG 回購各 0.5% 記進回購執行、LP 1% 轉 lpStakeVault；賣出 3%：生態儲備、社區建設、LP 各 1%，plain transfer 到設定地址。收費方（GGToken 賣出 hook、turbine）持 COLLECTOR_ROLE。接線在 initialize 固定，沒有 setter。"
            address={CONTRACTS.feeRouter.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: '回購執行', value: <AddressLink address={d && d.buybackExecutor} /> },
                    { label: 'LP 激勵 lpStakeVault', value: <AddressLink address={d && d.lpStakeVault} /> },
                    { label: '生態儲備 ecoReserve', value: <AddressLink address={d && d.ecoReserve} /> },
                    { label: '社區建設 communityBuilding', value: <AddressLink address={d && d.communityBuilding} /> },
                ]}
            />
        </ContractCard>
    );
}

function ExecutorCard() {
    const load = useCallback(async () => {
        const c = contractAt('buybackExecutor');
        if (!c) return null;
        const usdt = ADDRESSES.USDT_ADDRESS;
        const [router, oracle, maxSingleAmount, maxSlippageBps] = await Promise.all([c.router(), c.oracle(), c.maxSingleAmount(), c.maxSlippageBps()]);
        const budgets = [];
        for (const p of PURPOSES) {
            /* eslint-disable-next-line no-await-in-loop */
            budgets.push({ ...p, budget: usdt ? await c.budgetOf(TAGS[p.name], usdt) : null });
        }
        return { router, oracle, maxSingleAmount, maxSlippageBps, budgets, usdt };
    }, []);
    const { data: d, error, loading, reload } = useChainRead(load);
    const [draft, setDraft] = useState({});
    const set = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
    const c = contractAt('buybackExecutor');
    const path = parsePath(draft.path);

    return (
        <ContractCard
            title={CONTRACTS.buybackExecutor.label}
            subtitle="按 purpose × 輸入代幣記預算。executeBuyback 要 path 在白名單、amountIn ≤ 單筆上限、minOut ≥ TWAP 推算 × (1 − 滑點上限)，買到的全數 burn。buyback keeper 持 KEEPER_ROLE 自動執行。"
            address={CONTRACTS.buybackExecutor.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: '單筆上限 maxSingleAmount', value: d ? `${amount6(d.maxSingleAmount)} USDT` : '', hint: '0 = 不能買' },
                    { label: '滑點上限 maxSlippageBps', value: d ? `${String(d.maxSlippageBps)} bps` : '' },
                    { label: 'DEX router', value: <AddressLink address={d && d.router} /> },
                    { label: '價格來源', value: <AddressLink address={d && d.oracle} /> },
                ]}
            />
            <Table size="small" sx={{ mb: 2, maxWidth: 480 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>用途</TableCell>
                        <TableCell align="right">USDT 預算</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(d ? d.budgets : PURPOSES).map((row) => (
                        <TableRow key={row.name}>
                            <TableCell>{row.label}</TableCell>
                            <TableCell align="right">{row.budget === null || row.budget === undefined ? '—' : amount6(row.budget)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Divider sx={{ mb: 2 }} />

            <WriteRow
                fields={[{ key: 'maxSingle', label: '單筆上限（USDT）', width: 240 }]}
                values={draft}
                onChange={set}
                button="設定單筆上限"
                title="設定單筆上限 setMaxSingleAmount"
                detail={<>BuybackExecutor.setMaxSingleAmount(<code>{draft.maxSingle}</code> USDT)：目前 {d ? amount6(d.maxSingleAmount) : '?'}。</>}
                build={(signer) => c.connect(signer).setMaxSingleAmount(parseUnits(String(draft.maxSingle), 6))}
                onDone={reload}
            />
            <WriteRow
                fields={[{ key: 'slippage', label: '滑點上限 bps', hint: '100 = 1%', width: 200 }]}
                values={draft}
                onChange={set}
                button="設定滑點上限"
                title="設定滑點上限 setMaxSlippageBps"
                detail={<>BuybackExecutor.setMaxSlippageBps(<code>{draft.slippage}</code>)：目前 {d ? String(d.maxSlippageBps) : '?'} bps。minOut 低於 TWAP 推算 × (1 − 這個比例) 的呼叫會被拒絕。</>}
                build={(signer) => c.connect(signer).setMaxSlippageBps(draft.slippage)}
                onDone={reload}
            />
            <WriteRow
                fields={[
                    { key: 'path', label: '路徑（逗號分隔地址）', hint: '例如 USDT, GG, GOT2', width: 620 },
                    {
                        key: 'allowed',
                        label: '白名單',
                        select: true,
                        options: [
                            { value: 'true', label: '允許' },
                            { value: 'false', label: '移除' },
                        ],
                        width: 140,
                    },
                ]}
                values={draft}
                onChange={set}
                button="設定路徑白名單"
                color="warning"
                title="設定路徑白名單 setPathAllowed"
                detail={
                    <>
                        BuybackExecutor.setPathAllowed([{path.join(', ')}], <code>{draft.allowed}</code>)：hash{' '}
                        <code>{path.length >= 2 ? solidityPackedKeccak256(['address[]'], [path]) : '?'}</code>。path 的最後一個必須是 GOT2 / GG / AUG 之一。keeper 的
                        BUYBACK_PATHS 要和這裡一致。
                    </>
                }
                build={(signer) => c.connect(signer).setPathAllowed(path, draft.allowed === 'true')}
                onDone={reload}
            />
        </ContractCard>
    );
}

export function ContractFee() {
    return (
        <Stack spacing={3}>
            <Typography variant="h5">手續費與回購</Typography>
            <RouterCard />
            <ExecutorCard />
        </Stack>
    );
}
