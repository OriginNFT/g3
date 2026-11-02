import { useCallback, useState } from 'react';
import { Divider, Stack, Typography } from '@mui/material';

import { contractAt, CONTRACTS } from '../../chain/contracts';
import { useChainRead } from '../../hooks/useChainRead';
import { ContractCard, ReadGrid, WriteRow, AddressLink } from '../../components/ContractCard';
import { amount18 } from './shared';

function VaultCard() {
    const load = useCallback(async () => {
        const c = contractAt('computingVault');
        if (!c) return null;
        const [totalPower, nextPositionId, turbine, oracle, reserveVault, protectionVault, emissionController] = await Promise.all([
            c.totalPower(),
            c.nextPositionId(),
            c.turbine(),
            c.oracle(),
            c.reserveVault(),
            c.protectionVault(),
            c.emissionController(),
        ]);
        return { totalPower, nextPositionId, turbine, oracle, reserveVault, protectionVault, emissionController };
    }, []);

    const { data: d, error, loading, reload } = useChainRead(load);
    const [draft, setDraft] = useState({});
    const set = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
    const c = contractAt('computingVault');

    return (
        <ContractCard
            title={CONTRACTS.computingVault.label}
            subtitle="USDT 2.5×、GOT2 燒毀 2×、GG 燒毀 2.5×，金本位算力永久有效、當日生效。USDT 95% 進儲備池、5% 進保護池。每日持倉 50% 按算力 pro-rata，領取送進 turbine。"
            address={CONTRACTS.computingVault.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: '總算力 totalPower', value: d ? amount18(d.totalPower, 2) : '', hint: '1 算力 = 1 USDT 當量' },
                    { label: '仓位數', value: d ? String(d.nextPositionId - 1n) : '' },
                    { label: 'turbine', value: <AddressLink address={d && d.turbine} />, hint: '零地址 = 領取回退' },
                    { label: '價格來源', value: <AddressLink address={d && d.oracle} /> },
                    { label: '儲備池', value: <AddressLink address={d && d.reserveVault} /> },
                    { label: '保護池', value: <AddressLink address={d && d.protectionVault} /> },
                    { label: '排放控制器', value: <AddressLink address={d && d.emissionController} /> },
                ]}
            />
            <Divider sx={{ mb: 2 }} />
            <WriteRow
                fields={[{ key: 'turbine', label: 'turbine 地址', width: 420 }]}
                values={draft}
                onChange={set}
                button="設定 turbine"
                color="warning"
                title="設定 turbine setTurbine"
                detail={<>ComputingVault.setTurbine(<code>{draft.turbine}</code>)：目前 {d ? d.turbine : '?'}。持倉獎勵領取都經它交付。</>}
                build={(signer) => c.connect(signer).setTurbine(draft.turbine)}
                onDone={reload}
            />
        </ContractCard>
    );
}

function TierCard() {
    const load = useCallback(async () => {
        const c = contractAt('tierStaking');
        if (!c) return null;
        const [totalLocked, oracle] = await Promise.all([c.totalLocked(), c.oracle()]);
        return { totalLocked, oracle };
    }, []);
    const { data: d, error, loading, reload } = useChainRead(load);

    return (
        <ContractCard
            title={CONTRACTS.tierStaking.label}
            subtitle="G1–G7 由鎖倉 GG 的即時 USDT 價值決定（1,000 / 3,000 / 5,000 / 8,000 / 10,000 / 15,000 / 20,000），隨價格重評，解押即降級。鎖倉不產生收益。社區條件（三區業績）是鏈下考核。沒有可設定項。"
            address={CONTRACTS.tierStaking.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: '總鎖倉 GG', value: d ? amount18(d.totalLocked, 4) : '' },
                    { label: '價格來源', value: <AddressLink address={d && d.oracle} /> },
                ]}
            />
        </ContractCard>
    );
}

function RightsCard() {
    const load = useCallback(async () => {
        const ledger = contractAt('nftRightsLedger');
        const claim = contractAt('claimController');
        if (!ledger) return null;
        const [oracle, got2, gg] = await Promise.all([ledger.oracle(), ledger.got2(), ledger.gg()]);
        let wiring = null;
        if (claim) {
            const [rightsLedger, communityEngine] = await Promise.all([claim.rightsLedger(), claim.communityEngine()]);
            wiring = { rightsLedger, communityEngine };
        }
        return { oracle, got2, gg, wiring };
    }, []);
    const { data: d, error, loading, reload } = useChainRead(load);

    return (
        <ContractCard
            title={`${CONTRACTS.nftRightsLedger.label} / ${CONTRACTS.claimController.label}`}
            subtitle="燒 GOT2 2× / GG 3× 取得 USDT 計價的額度，額度累計。領社區 GG 時扣 數量 × 即時 GG 價，額度不足拒絕，扣額度與 payout 同一交易。ClaimController 需要額度帳本的 CONSUMER_ROLE 與社區引擎的 CLAIM_ROLE。沒有可設定項。"
            address={CONTRACTS.nftRightsLedger.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: '價格來源', value: <AddressLink address={d && d.oracle} /> },
                    { label: 'GOT2', value: <AddressLink address={d && d.got2} /> },
                    { label: 'GG', value: <AddressLink address={d && d.gg} /> },
                    { label: 'ClaimController', value: <AddressLink address={CONTRACTS.claimController.address} /> },
                    { label: 'ClaimController → 額度帳本', value: <AddressLink address={d && d.wiring && d.wiring.rightsLedger} /> },
                    { label: 'ClaimController → 社區引擎', value: <AddressLink address={d && d.wiring && d.wiring.communityEngine} /> },
                ]}
            />
        </ContractCard>
    );
}

export function ContractPower() {
    return (
        <Stack spacing={3}>
            <Typography variant="h5">算力與等級</Typography>
            <VaultCard />
            <TierCard />
            <RightsCard />
        </Stack>
    );
}
