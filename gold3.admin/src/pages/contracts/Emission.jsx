import { useCallback, useState } from 'react';
import { Alert, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

import { contractAt, CONTRACTS } from '../../chain/contracts';
import { useChainRead } from '../../hooks/useChainRead';
import { ContractCard, ReadGrid, WriteRow, AddressLink } from '../../components/ContractCard';
import { amount18, sgt } from './shared';

const PHASES = [
    { n: 1, months: '1–12', budget: '5,376,000' },
    { n: 2, months: '13–37', budget: '15,456,000' },
    { n: 3, months: '38–68', budget: '20,160,000' },
    { n: 4, months: '69–95', budget: '15,456,000' },
    { n: 5, months: '96–120', budget: '10,752,000' },
];

function EmissionCard() {
    const load = useCallback(async () => {
        const c = contractAt('emissionController');
        if (!c) return null;
        const [genesis, lastSettledDay, currentDay, insuranceTreasury, computingVault, communityEngine] = await Promise.all([
            c.genesisTimestamp(),
            c.lastSettledDay(),
            c.currentDay(),
            c.insuranceTreasury(),
            c.computingVault(),
            c.communityEngine(),
        ]);
        const phaseEndDay = [];
        let nextBudget = null;
        if (genesis !== 0n) {
            for (let i = 0; i < 5; i += 1) {
                /* eslint-disable-next-line no-await-in-loop */
                phaseEndDay.push(await c.phaseEndDay(i));
            }
            nextBudget = await c.dayBudget(lastSettledDay + 1n);
        }
        return { genesis, lastSettledDay, currentDay, insuranceTreasury, computingVault, communityEngine, phaseEndDay, nextBudget };
    }, []);

    const { data: d, error, loading, reload } = useChainRead(load);
    const [draft, setDraft] = useState({});
    const set = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
    const c = contractAt('emissionController');
    const genesisSet = Boolean(d && d.genesis !== 0n);

    return (
        <ContractCard
            title={CONTRACTS.emissionController.label}
            subtitle="每日從 67.2M 排放預算算出當日額度：五階段按日曆月切，階段內每日等額；50% 給算力金庫（沒有算力就回保障國庫），50% 給社區引擎。settleUpTo 由 daily-settlement keeper 呼叫。"
            address={CONTRACTS.emissionController.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: 'genesis', value: d ? (genesisSet ? sgt(d.genesis) : '未設定') : '', hint: '第 1 日開始，SGT 12:00' },
                    { label: '目前協議日 currentDay', value: d ? String(d.currentDay) : '', hint: '0 = genesis 前' },
                    { label: '最後結算日 lastSettledDay', value: d ? String(d.lastSettledDay) : '' },
                    { label: '下一日預算', value: d && d.nextBudget !== null ? `${amount18(d.nextBudget, 4)} GG` : '' },
                    { label: '保障國庫', value: <AddressLink address={d && d.insuranceTreasury} /> },
                    { label: '算力金庫', value: <AddressLink address={d && d.computingVault} /> },
                    { label: '社區引擎', value: <AddressLink address={d && d.communityEngine} /> },
                ]}
            />

            {genesisSet ? (
                <Table size="small" sx={{ mb: 2, maxWidth: 560 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>階段</TableCell>
                            <TableCell>月份</TableCell>
                            <TableCell align="right">預算 GG</TableCell>
                            <TableCell align="right">結束日</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {PHASES.map((p, i) => (
                            <TableRow key={p.n}>
                                <TableCell>第 {p.n} 階段</TableCell>
                                <TableCell>{p.months}</TableCell>
                                <TableCell align="right">{p.budget}</TableCell>
                                <TableCell align="right">{d.phaseEndDay[i] ? String(d.phaseEndDay[i]) : '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : null}

            <Divider sx={{ mb: 2 }} />

            {genesisSet ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                    genesis 已設定，不能再改。
                </Alert>
            ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    設定前請確認：算力金庫與社區引擎已接線並授 EMISSION_ROLE、保障國庫授 ROUTER_ROLE、社區引擎的 DAO 與平台地址已設、排放預算已釋放。第一日結束時 keeper 就會結算。
                </Alert>
            )}

            <WriteRow
                fields={[{ key: 'genesis', label: 'genesis unix 秒', hint: '必須是 SGT 12:00（% 86400 == 14400）', width: 300 }]}
                values={draft}
                onChange={set}
                button="設定 genesis"
                color="error"
                disabled={genesisSet}
                title="設定 genesis setGenesis"
                detail={
                    <>
                        EmissionController.setGenesis(<code>{draft.genesis}</code>)：{draft.genesis ? sgt(draft.genesis) : '?'}。<b>只能設一次、不可更改</b>。
                        五個階段的結束日會按日曆月（SGT）從這個時間算出。
                    </>
                }
                build={(signer) => c.connect(signer).setGenesis(draft.genesis)}
                onDone={reload}
            />

            <WriteRow
                fields={[{ key: 'treasury', label: '保障國庫地址', width: 420 }]}
                values={draft}
                onChange={set}
                button="設定保障國庫"
                title="接線 setInsuranceTreasury"
                detail={<>EmissionController.setInsuranceTreasury(<code>{draft.treasury}</code>)：目前 {d ? d.insuranceTreasury : '?'}。</>}
                build={(signer) => c.connect(signer).setInsuranceTreasury(draft.treasury)}
                onDone={reload}
            />
            <WriteRow
                fields={[{ key: 'vault', label: '算力金庫地址', width: 420 }]}
                values={draft}
                onChange={set}
                button="設定算力金庫"
                title="接線 setComputingVault"
                detail={<>EmissionController.setComputingVault(<code>{draft.vault}</code>)：目前 {d ? d.computingVault : '?'}。</>}
                build={(signer) => c.connect(signer).setComputingVault(draft.vault)}
                onDone={reload}
            />
            <WriteRow
                fields={[{ key: 'engine', label: '社區引擎地址', width: 420 }]}
                values={draft}
                onChange={set}
                button="設定社區引擎"
                title="接線 setCommunityEngine"
                detail={<>EmissionController.setCommunityEngine(<code>{draft.engine}</code>)：目前 {d ? d.communityEngine : '?'}。</>}
                build={(signer) => c.connect(signer).setCommunityEngine(draft.engine)}
                onDone={reload}
            />

            <Divider sx={{ my: 2 }} />

            <WriteRow
                fields={[{ key: 'maxDays', label: '最多結算幾日', hint: '通常由 keeper 做；這裡是手動補結算', width: 200 }]}
                values={draft}
                onChange={set}
                button="手動結算 settleUpTo"
                color="warning"
                disabled={!genesisSet}
                title="手動結算 settleUpTo"
                detail={
                    <>
                        EmissionController.settleUpTo(<code>{draft.maxDays}</code>)：從第 {d ? String(d.lastSettledDay + 1n) : '?'} 日起，逐日結算已結束的日。
                        簽名錢包必須持有 KEEPER_ROLE。
                    </>
                }
                build={(signer) => c.connect(signer).settleUpTo(draft.maxDays)}
                onDone={reload}
            />
        </ContractCard>
    );
}

export function ContractEmission() {
    return (
        <Stack spacing={3}>
            <Typography variant="h5">排放控制器</Typography>
            <EmissionCard />
        </Stack>
    );
}
