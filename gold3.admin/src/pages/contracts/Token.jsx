import { useCallback, useState } from 'react';
import { Divider, Stack, Typography } from '@mui/material';

import { ADDRESSES } from '../../chain/client';
import { contractAt, CONTRACTS, TAGS } from '../../chain/contracts';
import { useChainRead } from '../../hooks/useChainRead';
import { ContractCard, ReadGrid, WriteRow, AddressLink } from '../../components/ContractCard';
import { amount18 } from './shared';

// The three sell pairs the fee hook may be told about, by address-book key.
const SELL_PAIRS = [
    { key: 'USDT_GG_PAIR_ADDRESS', label: 'USDT/GG', source: 'USDT_GG_SELL' },
    { key: 'GOT2_GG_PAIR_ADDRESS', label: 'GOT2/GG', source: 'GOT2_GG_SELL' },
    { key: 'AUG_GG_PAIR_ADDRESS', label: 'AUG/GG', source: 'AUG_GG_SELL' },
];

const SOURCE_BY_HASH = Object.fromEntries(['USDT_GG_SELL', 'GOT2_GG_SELL', 'AUG_GG_SELL'].map((name) => [TAGS[name], name]));

function TokenCard() {
    const load = useCallback(async () => {
        const c = contractAt('gg');
        if (!c) return null;
        const [totalSupply, feeRouter] = await Promise.all([c.totalSupply(), c.feeRouter()]);
        const pairs = [];
        for (const pair of SELL_PAIRS) {
            const address = ADDRESSES[pair.key];
            if (!address) {
                pairs.push({ ...pair, address: null, source: null });
                continue;
            }
            /* eslint-disable-next-line no-await-in-loop */
            const source = await c.sellSourceOf(address);
            pairs.push({ ...pair, address, registered: SOURCE_BY_HASH[String(source).toLowerCase()] || null });
        }
        return { totalSupply, feeRouter, pairs };
    }, []);

    const { data: d, error, loading, reload } = useChainRead(load);
    const [draft, setDraft] = useState({});
    const set = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
    const c = contractAt('gg');

    return (
        <ContractCard
            title={CONTRACTS.gg.label}
            subtitle="84,000,000 GG 一次鑄給分配金庫，沒有 mint。賣出 hook：轉進登記的 pair 就是賣出，扣 3% 交給 FeeRouter；pair 轉出（買入、removeLiquidity）不收。addLiquidity 也是轉進 pair，會被扣，除非把加池方設為豁免。"
            address={CONTRACTS.gg.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: '總供給', value: d ? `${amount18(d.totalSupply, 0)} GG` : '', hint: '銷毀後會下降' },
                    { label: '手續費路由 feeRouter', value: <AddressLink address={d && d.feeRouter} />, hint: '零地址 = hook 關閉' },
                    ...(d ? d.pairs : SELL_PAIRS).map((pair) => ({
                        label: `${pair.label} pair`,
                        value: pair.address ? <AddressLink address={pair.address} /> : '',
                        hint: !pair.address ? '地址簿沒有這個 pair' : pair.registered ? `已登記為 ${pair.registered}` : '未登記（不收費）',
                    })),
                ]}
            />

            <Divider sx={{ mb: 2 }} />

            <WriteRow
                fields={[{ key: 'feeRouter', label: 'FeeRouter 地址', width: 420 }]}
                values={draft}
                onChange={set}
                button="設定手續費路由"
                title="設定手續費路由 setFeeRouter"
                detail={
                    <>
                        GGToken.setFeeRouter(<code>{draft.feeRouter}</code>)：目前 {d ? d.feeRouter : '?'}。FeeRouter 必須把 COLLECTOR_ROLE
                        授給這個代幣合約，否則每一筆賣出都會回退。
                    </>
                }
                build={(signer) => c.connect(signer).setFeeRouter(draft.feeRouter)}
                onDone={reload}
            />

            <WriteRow
                fields={[
                    { key: 'pair', label: 'pair 地址', width: 420 },
                    {
                        key: 'source',
                        label: '來源',
                        select: true,
                        options: [
                            { value: 'USDT_GG_SELL', label: 'USDT/GG 賣出' },
                            { value: 'GOT2_GG_SELL', label: 'GOT2/GG 賣出' },
                            { value: 'AUG_GG_SELL', label: 'AUG/GG 賣出' },
                            { value: 'NONE', label: '取消登記' },
                        ],
                        width: 200,
                    },
                ]}
                values={draft}
                onChange={set}
                button="登記賣出池"
                color="warning"
                title="登記賣出池 setSellPair"
                detail={
                    <>
                        GGToken.setSellPair(<code>{draft.pair}</code>, <code>{draft.source}</code>)：登記後，任何非豁免地址轉 GG 進這個
                        pair 都扣 3%。用 <code>swapExactTokensForTokens</code> 賣出會因 K 檢查回退，前端必須用 SupportingFeeOnTransferTokens 版本。
                    </>
                }
                build={(signer) =>
                    c
                        .connect(signer)
                        .setSellPair(draft.pair, draft.source === 'NONE' ? `0x${'0'.repeat(64)}` : TAGS[draft.source])
                }
                onDone={reload}
            />

            <WriteRow
                fields={[
                    { key: 'exemptAccount', label: '地址', width: 420 },
                    {
                        key: 'exempt',
                        label: '豁免',
                        select: true,
                        options: [
                            { value: 'true', label: '豁免（不收賣出費）' },
                            { value: 'false', label: '取消豁免' },
                        ],
                        width: 200,
                    },
                ]}
                values={draft}
                onChange={set}
                button="設定豁免"
                title="設定賣出費豁免 setFeeExempt"
                detail={
                    <>
                        GGToken.setFeeExempt(<code>{draft.exemptAccount}</code>, <code>{draft.exempt}</code>)：豁免地址轉進 pair 不扣費。
                        回購執行、保護池、加池方通常要豁免；一般用戶不該在這裡。
                    </>
                }
                build={(signer) => c.connect(signer).setFeeExempt(draft.exemptAccount, draft.exempt === 'true')}
                onDone={reload}
            />
        </ContractCard>
    );
}

function AllocationCard() {
    const load = useCallback(async () => {
        const c = contractAt('allocationVault');
        if (!c) return null;
        const [initialLiquidity, insuranceReserve, emissionBudget, insuranceTreasury, emissionController] = await Promise.all([
            c.isReleased(TAGS.INITIAL_LIQUIDITY),
            c.isReleased(TAGS.INSURANCE_RESERVE),
            c.isReleased(TAGS.EMISSION_BUDGET),
            c.insuranceTreasury(),
            c.emissionController(),
        ]);
        return { initialLiquidity, insuranceReserve, emissionBudget, insuranceTreasury, emissionController };
    }, []);

    const { data: d, error, loading, reload } = useChainRead(load);
    const [draft, setDraft] = useState({});
    const set = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
    const c = contractAt('allocationVault');
    const flag = (v) => (v === undefined || v === null ? '' : v ? '已釋放' : '未釋放');

    return (
        <ContractCard
            title={CONTRACTS.allocationVault.label}
            subtitle="84M 的三筆一次性釋放：8% 初始流動性 6,720,000 給指定地址；12% 保障國庫儲備 10,080,000 走 InsuranceTreasury.credit（需要 ROUTER_ROLE）；80% 排放預算 67,200,000 轉給 EmissionController。每筆只能做一次。"
            address={CONTRACTS.allocationVault.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: '初始流動性 6,720,000', value: d ? flag(d.initialLiquidity) : '' },
                    { label: '保障國庫儲備 10,080,000', value: d ? flag(d.insuranceReserve) : '' },
                    { label: '排放預算 67,200,000', value: d ? flag(d.emissionBudget) : '' },
                    { label: '保障國庫', value: <AddressLink address={d && d.insuranceTreasury} /> },
                    { label: '排放控制器', value: <AddressLink address={d && d.emissionController} /> },
                ]}
            />

            <Divider sx={{ mb: 2 }} />

            <WriteRow
                fields={[{ key: 'liquidityTo', label: '初始流動性收款地址', width: 420 }]}
                values={draft}
                onChange={set}
                button="釋放初始流動性"
                color="error"
                disabled={Boolean(d && d.initialLiquidity)}
                title="釋放初始流動性 releaseInitialLiquidity"
                detail={
                    <>
                        AllocationVault.releaseInitialLiquidity(<code>{draft.liquidityTo}</code>)：6,720,000 GG 一次轉出，<b>只能做一次、不可撤回</b>。
                    </>
                }
                build={(signer) => c.connect(signer).releaseInitialLiquidity(draft.liquidityTo)}
                onDone={reload}
            />
            <WriteRow
                fields={[]}
                values={draft}
                onChange={set}
                button="釋放保障國庫儲備"
                color="warning"
                disabled={Boolean(d && d.insuranceReserve)}
                title="釋放保障國庫儲備 releaseInsuranceReserve"
                detail={
                    <>
                        AllocationVault.releaseInsuranceReserve()：10,080,000 GG 經 InsuranceTreasury.credit 記在 INITIAL_RESERVE 標籤下。
                        保障國庫必須已把 ROUTER_ROLE 授給分配金庫。
                    </>
                }
                build={(signer) => c.connect(signer).releaseInsuranceReserve()}
                onDone={reload}
            />
            <WriteRow
                fields={[]}
                values={draft}
                onChange={set}
                button="釋放排放預算"
                color="warning"
                disabled={Boolean(d && d.emissionBudget)}
                title="釋放排放預算 releaseEmissionBudget"
                detail={<>AllocationVault.releaseEmissionBudget()：67,200,000 GG 轉給 EmissionController，之後每日從那裡排放。</>}
                build={(signer) => c.connect(signer).releaseEmissionBudget()}
                onDone={reload}
            />
        </ContractCard>
    );
}

export function ContractToken() {
    return (
        <Stack spacing={3}>
            <Typography variant="h5">GG 代幣</Typography>
            <TokenCard />
            <AllocationCard />
        </Stack>
    );
}
