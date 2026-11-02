import { useCallback, useState } from 'react';
import { Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

import { contractAt, CONTRACTS } from '../../chain/contracts';
import { useChainRead } from '../../hooks/useChainRead';
import { ContractCard, ReadGrid, WriteRow, AddressLink } from '../../components/ContractCard';
import { amount18 } from './shared';

const BUCKETS = ['拓展 30%', '協作 30%', '貢獻 30%', 'DAO 組織建設 5%', '平台 5%'];

function EngineCard() {
    const load = useCallback(async () => {
        const c = contractAt('communityEngine');
        if (!c) return null;
        const [turbine, daoBuildingAccount, platformAccount, lastSettledDay, insuranceTreasury] = await Promise.all([
            c.turbine(),
            c.daoBuildingAccount(),
            c.platformAccount(),
            c.lastSettledDay(),
            c.insuranceTreasury(),
        ]);
        let latest = null;
        if (lastSettledDay !== 0n) {
            const [budget, closed] = await Promise.all([c.communityBudgetOf(lastSettledDay), c.isClosed(lastSettledDay)]);
            const buckets = [];
            for (let b = 0; b < 5; b += 1) {
                /* eslint-disable-next-line no-await-in-loop */
                const [bucketBudget, credited] = await Promise.all([c.bucketBudgetOf(lastSettledDay, b), c.bucketCreditedOf(lastSettledDay, b)]);
                buckets.push({ bucket: b, budget: bucketBudget, credited });
            }
            latest = { day: lastSettledDay, budget, closed, buckets };
        }
        return { turbine, daoBuildingAccount, platformAccount, lastSettledDay, insuranceTreasury, latest };
    }, []);

    const { data: d, error, loading, reload } = useChainRead(load);
    const [draft, setDraft] = useState({});
    const set = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
    const c = contractAt('communityEngine');

    return (
        <ContractCard
            title={CONTRACTS.communityEngine.label}
            subtitle="每日收社區 50%，拆 30/30/30/5/5。DAO 與平台兩桶結算時直接記到固定地址；三個 30% 桶由 accountant 按名單 credit，全部送出後 closeDay 把剩餘回保障國庫。領取經 ClaimController 扣 NFT 額度後 payout，GG 送進 turbine。兩個固定地址未設定時每日結算會 revert。"
            address={CONTRACTS.communityEngine.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: 'turbine', value: <AddressLink address={d && d.turbine} />, hint: '零地址 = payout 回退' },
                    { label: 'DAO 組織建設地址', value: <AddressLink address={d && d.daoBuildingAccount} /> },
                    { label: '平台地址', value: <AddressLink address={d && d.platformAccount} /> },
                    { label: '保障國庫', value: <AddressLink address={d && d.insuranceTreasury} /> },
                    { label: '最後結算日', value: d ? String(d.lastSettledDay) : '' },
                    { label: '最後結算日預算', value: d && d.latest ? `${amount18(d.latest.budget, 4)} GG` : '' , hint: d && d.latest ? (d.latest.closed ? '已關閉' : '未關閉') : '' },
                ]}
            />

            {d && d.latest ? (
                <Table size="small" sx={{ mb: 2, maxWidth: 560 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>第 {String(d.latest.day)} 日</TableCell>
                            <TableCell align="right">預算</TableCell>
                            <TableCell align="right">已記帳</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {d.latest.buckets.map((row) => (
                            <TableRow key={row.bucket}>
                                <TableCell>{BUCKETS[row.bucket]}</TableCell>
                                <TableCell align="right">{amount18(row.budget, 4)}</TableCell>
                                <TableCell align="right">{amount18(row.credited, 4)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : null}

            <Divider sx={{ mb: 2 }} />

            <WriteRow
                fields={[{ key: 'turbine', label: 'turbine 地址', width: 420 }]}
                values={draft}
                onChange={set}
                button="設定 turbine"
                color="warning"
                title="設定 turbine setTurbine"
                detail={
                    <>
                        CommunityEngine.setTurbine(<code>{draft.turbine}</code>)：目前 {d ? d.turbine : '?'}。所有社區 GG 領取都經它的 creditClaimed 交付，介面不對整條領取就會回退。
                    </>
                }
                build={(signer) => c.connect(signer).setTurbine(draft.turbine)}
                onDone={reload}
            />
            <WriteRow
                fields={[{ key: 'dao', label: 'DAO 組織建設地址', width: 420 }]}
                values={draft}
                onChange={set}
                button="設定 DAO 地址"
                title="設定 DAO 組織建設地址 setDaoBuildingAccount"
                detail={<>CommunityEngine.setDaoBuildingAccount(<code>{draft.dao}</code>)：之後每日 5% 直接記到這個地址的 credits。</>}
                build={(signer) => c.connect(signer).setDaoBuildingAccount(draft.dao)}
                onDone={reload}
            />
            <WriteRow
                fields={[{ key: 'platform', label: '平台地址', width: 420 }]}
                values={draft}
                onChange={set}
                button="設定平台地址"
                title="設定平台地址 setPlatformAccount"
                detail={<>CommunityEngine.setPlatformAccount(<code>{draft.platform}</code>)：之後每日 5% 直接記到這個地址的 credits。</>}
                build={(signer) => c.connect(signer).setPlatformAccount(draft.platform)}
                onDone={reload}
            />

            <Divider sx={{ my: 2 }} />

            <WriteRow
                fields={[{ key: 'closeDayId', label: '協議日', hint: '通常由 accountant keeper 做', width: 200 }]}
                values={draft}
                onChange={set}
                button="手動 closeDay"
                color="error"
                title="手動關閉當日 closeDay"
                detail={
                    <>
                        CommunityEngine.closeDay(<code>{draft.closeDayId}</code>)：未記帳的剩餘全部回保障國庫，之後這一日不能再 credit。<b>名單還沒發完就關，剩下的人就領不到。</b>
                        簽名錢包必須持有 ACCOUNTANT_ROLE。
                    </>
                }
                build={(signer) => c.connect(signer).closeDay(draft.closeDayId)}
                onDone={reload}
            />
        </ContractCard>
    );
}

export function ContractCommunity() {
    return (
        <Stack spacing={3}>
            <Typography variant="h5">社區引擎</Typography>
            <EngineCard />
        </Stack>
    );
}
