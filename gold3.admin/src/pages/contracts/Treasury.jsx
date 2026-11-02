import { useCallback, useState } from 'react';
import { Alert, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { encodeBytes32String, parseUnits } from 'ethers';

import { contractAt, CONTRACTS, TAGS } from '../../chain/contracts';
import { useChainRead } from '../../hooks/useChainRead';
import { ContractCard, ReadGrid, WriteRow, AddressLink } from '../../components/ContractCard';
import { amount18, amount6, wei } from './shared';

const TREASURY_TAGS = [
    { tag: TAGS.INITIAL_RESERVE, label: '初始保障儲備 INITIAL_RESERVE', hint: '分配金庫釋放的 10,080,000' },
    { tag: TAGS.UNUSED_EMISSION, label: '未滿足排放 UNUSED_EMISSION', hint: '沒有算力可分的持倉 50%' },
    { tag: TAGS.UNUSED_COMMUNITY, label: '社區未分配 UNUSED_COMMUNITY', hint: 'closeDay 回來的剩餘' },
];

function InsuranceCard() {
    const load = useCallback(async () => {
        const c = contractAt('insuranceTreasury');
        if (!c) return null;
        const [balance, totalCredited, totalPaid] = await Promise.all([c.balance(), c.totalCredited(), c.totalPaid()]);
        const tags = [];
        for (const entry of TREASURY_TAGS) {
            /* eslint-disable-next-line no-await-in-loop */
            tags.push({ ...entry, amount: await c.creditedByTag(entry.tag) });
        }
        return { balance, totalCredited, totalPaid, tags };
    }, []);
    const { data: d, error, loading, reload } = useChainRead(load);

    return (
        <ContractCard
            title={CONTRACTS.insuranceTreasury.label}
            subtitle="收初始儲備與每日沒發出去的 GG；唯一的支出是 LP 動態空投（supplyAirdrop，AIRDROP_ROLE）。沒有 admin 提領。"
            address={CONTRACTS.insuranceTreasury.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: '目前持有 balance', value: d ? `${amount18(d.balance)} GG` : '' },
                    { label: '累計入庫 totalCredited', value: d ? `${amount18(d.totalCredited)} GG` : '' },
                    { label: '累計支出 totalPaid', value: d ? `${amount18(d.totalPaid)} GG` : '', hint: 'LP 空投' },
                ]}
            />
            <Table size="small" sx={{ mb: 2, maxWidth: 640 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>來源標籤</TableCell>
                        <TableCell align="right">累計入庫</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(d ? d.tags : TREASURY_TAGS).map((row) => (
                        <TableRow key={row.tag}>
                            <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {row.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {row.hint}
                                </Typography>
                            </TableCell>
                            <TableCell align="right">{amount18(row.amount)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ContractCard>
    );
}

function ReserveCard() {
    const load = useCallback(async () => {
        const c = contractAt('reserveVault');
        if (!c) return null;
        const [balance, totalDeposited, totalWithdrawn] = await Promise.all([c.balance(), c.totalDeposited(), c.totalWithdrawn()]);
        return { balance, totalDeposited, totalWithdrawn };
    }, []);
    const { data: d, error, loading, reload } = useChainRead(load);
    const [draft, setDraft] = useState({});
    const set = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
    const c = contractAt('reserveVault');

    return (
        <ContractCard
            title={CONTRACTS.reserveVault.label}
            subtitle="參與資金的 95%（USDT），用於協議底池儲備並按計劃注入底池。提領沒有隊列，一筆就轉走。"
            address={CONTRACTS.reserveVault.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: '目前持有 balance', value: d ? `${amount6(d.balance)} USDT` : '' },
                    { label: '累計存入', value: d ? `${amount6(d.totalDeposited)} USDT` : '' },
                    { label: '累計提領', value: d ? `${amount6(d.totalWithdrawn)} USDT` : '' },
                ]}
            />
            <Divider sx={{ mb: 2 }} />
            <WriteRow
                fields={[
                    { key: 'to', label: '收款地址 to', width: 420 },
                    { key: 'amount', label: '數量（USDT）', width: 220 },
                    { key: 'memo', label: '用途備註 memo', hint: '最多 31 個位元組，會寫進事件', width: 280 },
                ]}
                values={draft}
                onChange={set}
                button="提領"
                color="error"
                title="儲備池提領 withdraw"
                detail={
                    <>
                        ReserveVault.withdraw(<code>{draft.to}</code>, <code>{draft.amount}</code> USDT = <code>{wei(draft.amount, 6)}</code> 最小單位,{' '}
                        <code>{draft.memo}</code>)：目前持有 {d ? amount6(d.balance) : '?'} USDT。<b>沒有隊列、沒有延遲、沒有反悔。</b>
                    </>
                }
                confirmLabel="確認提領"
                build={(signer) => c.connect(signer).withdraw(draft.to, parseUnits(String(draft.amount), 6), encodeBytes32String(draft.memo))}
                onDone={reload}
            />
        </ContractCard>
    );
}

function ProtectionCard() {
    const load = useCallback(async () => {
        const c = contractAt('protectionVault');
        if (!c) return null;
        const [balance, totalDeposited, totalSpent, router] = await Promise.all([c.balance(), c.totalDeposited(), c.totalSpent(), c.router()]);
        return { balance, totalDeposited, totalSpent, router };
    }, []);
    const { data: d, error, loading, reload } = useChainRead(load);
    const [draft, setDraft] = useState({});
    const set = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
    const c = contractAt('protectionVault');

    return (
        <ContractCard
            title={CONTRACTS.protectionVault.label}
            subtitle="參與資金的 5%（USDT）。BUYER_ROLE 白名單可用 buy(path, amountIn, minOut) 在市場買入，買到的代幣留在池內；admin 可提領任何代幣。"
            address={CONTRACTS.protectionVault.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: '目前持有 USDT', value: d ? `${amount6(d.balance)} USDT` : '' },
                    { label: '累計存入', value: d ? `${amount6(d.totalDeposited)} USDT` : '' },
                    { label: '累計買入花費', value: d ? `${amount6(d.totalSpent)} USDT` : '' },
                    { label: 'DEX router', value: <AddressLink address={d && d.router} /> },
                ]}
            />
            <Divider sx={{ mb: 2 }} />
            <WriteRow
                fields={[{ key: 'router', label: 'router 地址', width: 420 }]}
                values={draft}
                onChange={set}
                button="設定 router"
                title="設定 router setRouter"
                detail={<>ProtectionVault.setRouter(<code>{draft.router}</code>)：目前 {d ? d.router : '?'}。buy 走這個 router 的 swapExactTokensForTokens。</>}
                build={(signer) => c.connect(signer).setRouter(draft.router)}
                onDone={reload}
            />
            <WriteRow
                fields={[
                    { key: 'wToken', label: '代幣地址 token', width: 420 },
                    { key: 'wTo', label: '收款地址 to', width: 420 },
                    { key: 'wDecimals', label: '代幣小數位', hint: 'USDT 6、GG 18', width: 140 },
                    { key: 'wAmount', label: '數量', width: 200 },
                    { key: 'wMemo', label: '用途備註 memo', hint: '最多 31 個位元組', width: 260 },
                ]}
                values={draft}
                onChange={set}
                button="提領"
                color="error"
                title="保護池提領 withdraw"
                detail={
                    <>
                        ProtectionVault.withdraw(<code>{draft.wToken}</code>, <code>{draft.wTo}</code>, <code>{wei(draft.wAmount, Number(draft.wDecimals || 18))}</code> 最小單位,{' '}
                        <code>{draft.wMemo}</code>)。<b>沒有隊列、沒有延遲、沒有反悔。</b>
                    </>
                }
                confirmLabel="確認提領"
                build={(signer) =>
                    c
                        .connect(signer)
                        .withdraw(draft.wToken, draft.wTo, parseUnits(String(draft.wAmount), Number(draft.wDecimals || 18)), encodeBytes32String(draft.wMemo))
                }
                onDone={reload}
            />
        </ContractCard>
    );
}

export function ContractTreasury() {
    return (
        <Stack spacing={3}>
            <Typography variant="h5">國庫合約</Typography>
            <Alert severity="info">
                三個池分帳、分權限、分事件：保障國庫只收 GG，儲備池與保護池收參與 USDT。分配金庫的三筆釋放在「GG 代幣」頁。
            </Alert>
            <InsuranceCard />
            <ReserveCard />
            <ProtectionCard />
        </Stack>
    );
}
