import { useState } from 'react';
import { Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { ADDRESSES } from '../chain/client';
import { AddressLink } from '../components/ContractCard';
import { Section } from '../components/Section';
import { useResource } from '../hooks/useResource';
import { num, when, TxLink, Pager } from './shared';

const PAGE_SIZE = 50;

// The three participation assets, by address-book key, for a readable column.
function assetLabel(address) {
    if (!address) return '—';
    if (ADDRESSES.USDT_ADDRESS && address === ADDRESSES.USDT_ADDRESS) return 'USDT';
    if (ADDRESSES.GOT2_ADDRESS && address === ADDRESSES.GOT2_ADDRESS) return 'GOT2 燒毀';
    if (ADDRESSES.GG_ADDRESS && address === ADDRESSES.GG_ADDRESS) return 'GG 燒毀';
    return address;
}

export function Positions() {
    const navigate = useNavigate();
    const [offset, setOffset] = useState(0);
    const [address, setAddress] = useState('');
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (address.trim()) query.set('address', address.trim());
    const { data, error, loading, reload } = useResource(`/api/positions?${query.toString()}`);
    const holding = useResource('/api/positions/holding?limit=50');

    const rows = data ? data.positions.rows : [];
    const total = data ? data.positions.total : 0;

    return (
        <Stack spacing={3}>
            <Section
                title="算力仓位"
                description="participate() 建立的仓位。算力 = USDT 價值 × 倍率（USDT 2.5×、GOT2 燒毀 2×、GG 燒毀 2.5×），1 算力 = 1 USDT 當量。"
                loading={loading}
                error={error}
                onRetry={reload}
                actions={
                    <TextField
                        size="small"
                        label="地址"
                        value={address}
                        onChange={(event) => {
                            setOffset(0);
                            setAddress(event.target.value);
                        }}
                        sx={{ width: 420 }}
                    />
                }
            >
                <Table size="small" sx={{ mb: 1 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>資產</TableCell>
                            <TableCell align="right">仓位數</TableCell>
                            <TableCell align="right">地址數</TableCell>
                            <TableCell align="right">投入</TableCell>
                            <TableCell align="right">USDT 價值</TableCell>
                            <TableCell align="right">算力</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(data ? data.byAsset : []).map((row) => (
                            <TableRow key={row.asset}>
                                <TableCell sx={{ fontWeight: 600 }}>{assetLabel(row.asset)}</TableCell>
                                <TableCell align="right">{row.count}</TableCell>
                                <TableCell align="right">{row.owners}</TableCell>
                                <TableCell align="right">{num(row.input, 4)}</TableCell>
                                <TableCell align="right">{num(row.usdt_value, 2)}</TableCell>
                                <TableCell align="right">{num(row.power, 2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell align="right">#</TableCell>
                            <TableCell>地址</TableCell>
                            <TableCell>資產</TableCell>
                            <TableCell align="right">投入</TableCell>
                            <TableCell align="right">USDT 價值</TableCell>
                            <TableCell align="right">算力</TableCell>
                            <TableCell>時間</TableCell>
                            <TableCell>交易</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8}>
                                    <Typography variant="body2" color="text.secondary">
                                        {loading ? '載入中...' : '沒有仓位。'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : null}
                        {rows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell align="right">{row.position_id}</TableCell>
                                <TableCell sx={{ cursor: 'pointer' }} onClick={() => navigate(`/members/${row.address}`)}>
                                    <AddressLink address={row.address} />
                                </TableCell>
                                <TableCell>{assetLabel(row.asset)}</TableCell>
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
                <Pager total={total} offset={offset} pageSize={PAGE_SIZE} onChange={setOffset} />
            </Section>

            <Section
                title="持倉獎勵"
                description="每日持倉 50% 實際分配到算力金庫的數量（HoldingRewardNotified），以及用戶領取（送進 turbine）的紀錄。"
                loading={holding.loading}
                error={holding.error}
                onRetry={holding.reload}
            >
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ p: 2 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell align="right">日</TableCell>
                                <TableCell align="right">分配（GG）</TableCell>
                                <TableCell>交易</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(holding.data ? holding.data.days : []).map((row) => (
                                <TableRow key={row.day}>
                                    <TableCell align="right">{row.day}</TableCell>
                                    <TableCell align="right">{num(row.amount, 4)}</TableCell>
                                    <TableCell>
                                        <TxLink hash={row.tx} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>地址</TableCell>
                                <TableCell align="right">領取（GG）</TableCell>
                                <TableCell>時間</TableCell>
                                <TableCell>交易</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(holding.data ? holding.data.claims.rows : []).map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <AddressLink address={row.address} />
                                    </TableCell>
                                    <TableCell align="right">{num(row.amount, 4)}</TableCell>
                                    <TableCell>{when(row.ts)}</TableCell>
                                    <TableCell>
                                        <TxLink hash={row.tx} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Stack>
            </Section>
        </Stack>
    );
}
