import { useState } from 'react';
import { Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';

import { AddressLink } from '../components/ContractCard';
import { Section } from '../components/Section';
import { useResource } from '../hooks/useResource';
import { num, when, TxLink, Pager, tagLabel } from './shared';

const PAGE_SIZE = 50;

const METHOD_LABEL = {
    FeeRouted: '分流',
    BuybackFunded: '回購入帳',
    BuybackExecuted: '回購成交',
    TokensBurned: '銷毀',
};

export function Fees() {
    const [offset, setOffset] = useState(0);
    const [method, setMethod] = useState('');
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (method) query.set('method', method);
    const { data, error, loading, reload } = useResource(`/api/fees?${query.toString()}`);

    return (
        <Stack spacing={3}>
            <Section
                title="手續費分流"
                description="FeeRouter 每一筆分流的去向，按來源、用途、代幣彙總（不跨代幣相加）。涡輪 2.5% 拆 GOT2 / GG / AUG 回購各 0.5% 與 LP 1%；賣出 3% 拆生態儲備、社區建設、LP 各 1%。"
                loading={loading}
                error={error}
                onRetry={reload}
            >
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>來源</TableCell>
                            <TableCell>用途</TableCell>
                            <TableCell>代幣</TableCell>
                            <TableCell align="right">筆數</TableCell>
                            <TableCell align="right">總額</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(data ? data.routed : []).map((row) => (
                            <TableRow key={`${row.source_name}-${row.purpose_name}-${row.token}`}>
                                <TableCell sx={{ fontWeight: 600 }}>{tagLabel(row.source_name)}</TableCell>
                                <TableCell>{tagLabel(row.purpose_name)}</TableCell>
                                <TableCell>
                                    <AddressLink address={row.token} />
                                </TableCell>
                                <TableCell align="right">{row.count}</TableCell>
                                <TableCell align="right">{num(row.total, 6)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Section>

            <Section title="回購與銷毀" description="BuybackExecutor 收到的預算、成交與實際銷毀。" loading={loading} error={error}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>事件</TableCell>
                            <TableCell>代幣</TableCell>
                            <TableCell>換出</TableCell>
                            <TableCell align="right">筆數</TableCell>
                            <TableCell align="right">總額</TableCell>
                            <TableCell align="right">換出總額</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(data ? data.buybacks : []).map((row) => (
                            <TableRow key={`${row.method}-${row.token}-${row.token_out}`}>
                                <TableCell sx={{ fontWeight: 600 }}>{METHOD_LABEL[row.method] || row.method}</TableCell>
                                <TableCell>
                                    <AddressLink address={row.token} />
                                </TableCell>
                                <TableCell>{row.token_out ? <AddressLink address={row.token_out} /> : '—'}</TableCell>
                                <TableCell align="right">{row.count}</TableCell>
                                <TableCell align="right">{num(row.total, 6)}</TableCell>
                                <TableCell align="right">{row.token_out ? num(row.total_out, 6) : '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Section>

            <Section
                title="流水"
                loading={loading}
                error={error}
                actions={
                    <TextField
                        select
                        size="small"
                        label="事件"
                        value={method}
                        onChange={(event) => {
                            setOffset(0);
                            setMethod(event.target.value);
                        }}
                        sx={{ width: 200 }}
                        SelectProps={{ native: true }}
                        InputLabelProps={{ shrink: true }}
                    >
                        <option value="">全部</option>
                        {Object.entries(METHOD_LABEL).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </TextField>
                }
            >
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>事件</TableCell>
                            <TableCell>來源</TableCell>
                            <TableCell>用途</TableCell>
                            <TableCell>代幣</TableCell>
                            <TableCell>收款</TableCell>
                            <TableCell align="right">金額</TableCell>
                            <TableCell>時間</TableCell>
                            <TableCell>交易</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(data ? data.records.rows : []).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8}>
                                    <Typography variant="body2" color="text.secondary">
                                        {loading ? '載入中...' : '沒有紀錄。'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : null}
                        {(data ? data.records.rows : []).map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell>{METHOD_LABEL[row.method] || row.method}</TableCell>
                                <TableCell>{tagLabel(row.source_name)}</TableCell>
                                <TableCell>{tagLabel(row.purpose_name)}</TableCell>
                                <TableCell>
                                    <AddressLink address={row.token} />
                                </TableCell>
                                <TableCell>{row.to_address ? <AddressLink address={row.to_address} /> : '—'}</TableCell>
                                <TableCell align="right">
                                    {num(row.amount, 6)}
                                    {row.amount_out ? (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            → {num(row.amount_out, 6)}
                                        </Typography>
                                    ) : null}
                                </TableCell>
                                <TableCell>{when(row.ts)}</TableCell>
                                <TableCell>
                                    <TxLink hash={row.tx} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Pager total={data ? data.records.total : 0} offset={offset} pageSize={PAGE_SIZE} onChange={setOffset} />
            </Section>
        </Stack>
    );
}
