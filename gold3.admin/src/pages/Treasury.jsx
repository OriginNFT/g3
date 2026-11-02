import { useState } from 'react';
import { Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';

import { AddressLink } from '../components/ContractCard';
import { Section } from '../components/Section';
import { useResource } from '../hooks/useResource';
import { num, when, TxLink, Pager, tagLabel } from './shared';

const PAGE_SIZE = 50;

const CONTRACT_LABEL = {
    INSURANCE_TREASURY: '保障國庫',
    RESERVE_VAULT: '協議儲備池',
    PROTECTION_VAULT: '價格保護池',
    ALLOCATION_VAULT: '分配金庫',
};

const METHOD_LABEL = {
    TreasuryCredited: '入庫',
    TreasuryPaid: '支付',
    ReserveDeposited: '存入',
    ReserveWithdrawn: '提領',
    ProtectionDeposited: '存入',
    ProtectionBuyExecuted: '市場買入',
    ProtectionWithdrawn: '提領',
    AllocationReleased: '釋放',
};

export function Treasury() {
    const [offset, setOffset] = useState(0);
    const [contract, setContract] = useState('');
    const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (contract) query.set('contract', contract);
    const { data, error, loading, reload } = useResource(`/api/treasury?${query.toString()}`);

    return (
        <Stack spacing={3}>
            <Section
                title="國庫金流"
                description="四個合約的每一筆進出。總額按合約、事件、代幣分組，不跨代幣相加；記的是「從哪裡來」，不是「還剩多少」—— 即時餘額在合約設置頁讀鏈。"
                loading={loading}
                error={error}
                onRetry={reload}
            >
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>合約</TableCell>
                            <TableCell>事件</TableCell>
                            <TableCell>來源 / 用途</TableCell>
                            <TableCell>代幣</TableCell>
                            <TableCell align="right">筆數</TableCell>
                            <TableCell align="right">總額</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(data ? data.byTag : []).map((row) => (
                            <TableRow key={`${row.contract}-${row.method}-${row.token}-${row.tag_name}`}>
                                <TableCell sx={{ fontWeight: 600 }}>{CONTRACT_LABEL[row.contract] || row.contract}</TableCell>
                                <TableCell>{METHOD_LABEL[row.method] || row.method}</TableCell>
                                <TableCell>{tagLabel(row.tag_name)}</TableCell>
                                <TableCell>
                                    <AddressLink address={row.token} />
                                </TableCell>
                                <TableCell align="right">{row.count}</TableCell>
                                <TableCell align="right">{num(row.total, 4)}</TableCell>
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
                        label="合約"
                        value={contract}
                        onChange={(event) => {
                            setOffset(0);
                            setContract(event.target.value);
                        }}
                        sx={{ width: 220 }}
                        SelectProps={{ native: true }}
                        InputLabelProps={{ shrink: true }}
                    >
                        <option value="">全部</option>
                        {Object.entries(CONTRACT_LABEL).map(([key, label]) => (
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
                            <TableCell>合約</TableCell>
                            <TableCell>事件</TableCell>
                            <TableCell>地址</TableCell>
                            <TableCell align="right">金額</TableCell>
                            <TableCell>來源 / 用途 / 備註</TableCell>
                            <TableCell>時間</TableCell>
                            <TableCell>交易</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(data ? data.flows.rows : []).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <Typography variant="body2" color="text.secondary">
                                        {loading ? '載入中...' : '沒有紀錄。'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : null}
                        {(data ? data.flows.rows : []).map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell>
                                    <Chip size="small" variant="outlined" label={CONTRACT_LABEL[row.contract] || row.contract} />
                                </TableCell>
                                <TableCell>{METHOD_LABEL[row.method] || row.method}</TableCell>
                                <TableCell>
                                    <AddressLink address={row.address} />
                                </TableCell>
                                <TableCell align="right">
                                    {num(row.amount, 6)}
                                    {row.amount_out ? (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            → {num(row.amount_out, 6)}
                                        </Typography>
                                    ) : null}
                                </TableCell>
                                <TableCell>
                                    {row.tag_name ? tagLabel(row.tag_name) : row.memo ? row.memo : row.source_tag ? row.source_tag : '—'}
                                </TableCell>
                                <TableCell>{when(row.ts)}</TableCell>
                                <TableCell>
                                    <TxLink hash={row.tx} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Pager total={data ? data.flows.total : 0} offset={offset} pageSize={PAGE_SIZE} onChange={setOffset} />
            </Section>
        </Stack>
    );
}
