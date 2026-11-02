import { useCallback, useState } from 'react';
import { Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { formatUnits, getAddress } from 'ethers';
import { useNavigate, useParams } from 'react-router-dom';

import { contractAt } from '../chain/contracts';
import { AddressLink, ReadGrid } from '../components/ContractCard';
import { Section } from '../components/Section';
import { useChainRead } from '../hooks/useChainRead';
import { useResource } from '../hooks/useResource';
import { num, when, TxLink, Pager, BUCKET_LABEL } from './shared';

const PAGE_SIZE = 50;

function validAddress(value) {
    try {
        return getAddress(String(value || '').trim());
    } catch {
        return null;
    }
}

// Live balances straight from the chain: what the member holds right now, as
// opposed to the sums of what gold3.sync indexed.
async function loadLive(address) {
    const vault = contractAt('computingVault');
    const tier = contractAt('tierStaking');
    const rights = contractAt('nftRightsLedger');
    const engine = contractAt('communityEngine');
    const claim = contractAt('claimController');
    const read = async (c, fn) => {
        if (!c) return null;
        try {
            return await c[fn](address);
        } catch (err) {
            console.error(`[MEMBER] ${fn} failed:`, err.message, err);
            return null;
        }
    };
    const [power, pending, locked, lockedValue, stakeTier, rightsOf, credits, claimable] = await Promise.all([
        read(vault, 'powerOf'),
        read(vault, 'pendingHoldingReward'),
        read(tier, 'lockedOf'),
        read(tier, 'lockedValueUSDT'),
        read(tier, 'stakeTierOf'),
        read(rights, 'rightsOf'),
        read(engine, 'creditsOf'),
        read(claim, 'claimable'),
    ]);
    return { power, pending, locked, lockedValue, stakeTier, rightsOf, credits, claimable };
}

function fmt(value, digits = 4) {
    if (value === null || value === undefined) return '讀不到';
    return Number(formatUnits(value, 18)).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function MemberDetail({ address }) {
    const navigate = useNavigate();
    const { data: d, error, loading, reload } = useResource(`/api/members/${address}`);
    const loader = useCallback(() => loadLive(address), [address]);
    const live = useChainRead(loader);
    const l = live.data;

    return (
        <Stack spacing={3}>
            <Section
                title="會員"
                description={address}
                loading={loading || live.loading}
                error={error || live.error}
                onRetry={() => {
                    reload();
                    live.reload();
                }}
                actions={
                    <Button size="small" onClick={() => navigate('/members')}>
                        回列表
                    </Button>
                }
            >
                <Stack spacing={2} sx={{ p: 2 }}>
                    <Typography variant="subtitle2">鏈上即時</Typography>
                    <ReadGrid
                        items={[
                            { label: '算力 powerOf', value: l ? fmt(l.power, 2) : '' },
                            { label: '待領持倉獎勵', value: l ? `${fmt(l.pending)} GG` : '' },
                            { label: '等級質押 GG', value: l ? fmt(l.locked) : '' },
                            { label: '質押 USDT 價值', value: l ? fmt(l.lockedValue, 2) : '' },
                            { label: '質押等級', value: l && l.stakeTier !== null ? (Number(l.stakeTier) === 0 ? '無' : `G${l.stakeTier}`) : '' },
                            { label: 'NFT 額度 rightsOf', value: l ? `${fmt(l.rightsOf, 2)} USDT` : '' },
                            { label: '社區 credits', value: l ? `${fmt(l.credits)} GG` : '' },
                            { label: '可領社區 GG claimable', value: l ? `${fmt(l.claimable)} GG` : '', hint: 'credits 與額度兩者取小' },
                        ]}
                    />
                    <Typography variant="subtitle2">索引累計</Typography>
                    <ReadGrid
                        items={[
                            { label: '仓位數', value: d ? d.power.count : '' },
                            { label: '累計算力', value: d ? num(d.power.power, 2) : '' },
                            { label: '累計 USDT 價值', value: d ? num(d.power.usdt_value, 2) : '' },
                            { label: '已領持倉獎勵', value: d ? `${num(d.holdingClaimed.total)} GG（${d.holdingClaimed.count} 次）` : '' },
                            { label: '最近等級變動', value: d && d.tier ? `G${d.tier.previous} → G${d.tier.current}` : d ? '無' : '', hint: d && d.tier ? when(d.tier.ts) : '' },
                            { label: '額度建立 / 消耗', value: d ? `${num(d.rights.created, 2)} / ${num(d.rights.consumed, 2)} USDT` : '' },
                            { label: '社區記帳 / 已付', value: d ? `${num(d.community.credited)} / ${num(d.community.paid)} GG` : '' },
                            { label: '領取社區 GG', value: d ? `${num(d.rights.gg_claimed)} GG` : '' },
                        ]}
                    />
                </Stack>
            </Section>

            <Section title="最近仓位" loading={loading} error={error}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell align="right">#</TableCell>
                            <TableCell>資產</TableCell>
                            <TableCell align="right">投入</TableCell>
                            <TableCell align="right">USDT 價值</TableCell>
                            <TableCell align="right">算力</TableCell>
                            <TableCell>時間</TableCell>
                            <TableCell>交易</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(d ? d.recentPositions : []).map((row) => (
                            <TableRow key={row.position_id}>
                                <TableCell align="right">{row.position_id}</TableCell>
                                <TableCell>
                                    <AddressLink address={row.asset} />
                                </TableCell>
                                <TableCell align="right">{num(row.input_amount, 6)}</TableCell>
                                <TableCell align="right">{num(row.usdt_value, 2)}</TableCell>
                                <TableCell align="right">{num(row.power, 2)}</TableCell>
                                <TableCell>{when(row.ts)}</TableCell>
                                <TableCell>
                                    <TxLink hash={row.tx} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Section>

            <Section title="最近社區記帳" loading={loading} error={error}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>事件</TableCell>
                            <TableCell align="right">日</TableCell>
                            <TableCell>桶</TableCell>
                            <TableCell align="right">GG</TableCell>
                            <TableCell>時間</TableCell>
                            <TableCell>交易</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(d ? d.recentCredits : []).map((row) => (
                            <TableRow key={row.tx + row.method + row.day}>
                                <TableCell>{row.method === 'CommunityCredited' ? '記帳' : '支付'}</TableCell>
                                <TableCell align="right">{row.day || '—'}</TableCell>
                                <TableCell>{BUCKET_LABEL[row.bucket_name] || row.bucket_name || '—'}</TableCell>
                                <TableCell align="right">{num(row.amount)}</TableCell>
                                <TableCell>{when(row.ts)}</TableCell>
                                <TableCell>
                                    <TxLink hash={row.tx} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Section>
        </Stack>
    );
}

function MemberList() {
    const navigate = useNavigate();
    const [offset, setOffset] = useState(0);
    const [lookup, setLookup] = useState('');
    const { data, error, loading, reload } = useResource(`/api/members?limit=${PAGE_SIZE}&offset=${offset}`);
    const target = validAddress(lookup);

    return (
        <Section
            title="會員"
            description="按索引到的累計算力排序。輸入地址直接查看一位會員。"
            loading={loading}
            error={error}
            onRetry={reload}
            actions={
                <Stack direction="row" spacing={1}>
                    <TextField size="small" label="地址" value={lookup} onChange={(event) => setLookup(event.target.value)} sx={{ width: 420 }} />
                    <Button size="small" variant="contained" disabled={!target} onClick={() => navigate(`/members/${target}`)}>
                        查看
                    </Button>
                </Stack>
            }
        >
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>地址</TableCell>
                        <TableCell align="right">仓位數</TableCell>
                        <TableCell align="right">累計算力</TableCell>
                        <TableCell>首次參與</TableCell>
                        <TableCell>最近參與</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(data ? data.rows : []).map((row) => (
                        <TableRow key={row.address} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/members/${row.address}`)}>
                            <TableCell>
                                <AddressLink address={row.address} full />
                            </TableCell>
                            <TableCell align="right">{row.positions}</TableCell>
                            <TableCell align="right">{num(row.power, 2)}</TableCell>
                            <TableCell>{when(row.first_at)}</TableCell>
                            <TableCell>{when(row.last_at)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Pager total={data ? data.total : 0} offset={offset} pageSize={PAGE_SIZE} onChange={setOffset} />
        </Section>
    );
}

export function Members() {
    const { address } = useParams();
    const checked = address ? validAddress(address) : null;
    if (address && !checked) {
        return (
            <Section title="會員" error={new Error('不是有效的地址')}>
                <Typography sx={{ p: 2 }}>{address}</Typography>
            </Section>
        );
    }
    return checked ? <MemberDetail address={checked} /> : <MemberList />;
}
