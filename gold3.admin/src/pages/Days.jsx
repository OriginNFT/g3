import { useState } from 'react';
import { Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { Section } from '../components/Section';
import { useResource } from '../hooks/useResource';
import { num, when, Pager } from './shared';

const PAGE_SIZE = 30;

const QUEUE_LABEL = { queued: '隊列中', sent: '已全部送出', closed: '已關閉' };
const QUEUE_COLOR = { queued: 'warning', sent: 'info', closed: 'success' };

/**
 * One row per settled protocol day: EmissionController's split, what the
 * holding side actually distributed, the five community buckets, and whether
 * the day's community budget has been closed. Click a row for the detail.
 */
export function Days() {
    const navigate = useNavigate();
    const [offset, setOffset] = useState(0);
    const { data, error, loading, reload } = useResource(`/api/days?limit=${PAGE_SIZE}&offset=${offset}`);

    const rows = data ? data.rows : [];
    const total = data ? data.total : 0;

    return (
        <Section
            title="每日結算"
            description="每個已結算的協議日一列。預算來自階段曲線；持倉 50% 交給算力金庫（沒有算力時整筆回保障國庫），社區 50% 拆成五桶。三個 30% 桶要等 accountant 發完名單並 closeDay 之後才會關閉。"
            loading={loading}
            error={error}
            onRetry={reload}
        >
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell align="right">日</TableCell>
                        <TableCell>結算時間</TableCell>
                        <TableCell align="right">當日預算</TableCell>
                        <TableCell align="right">持倉 50%</TableCell>
                        <TableCell align="right">實際分配</TableCell>
                        <TableCell align="right">社區 50%</TableCell>
                        <TableCell align="right">回國庫</TableCell>
                        <TableCell align="right">拓展 / 協作 / 貢獻</TableCell>
                        <TableCell align="right">已發 / 剩餘</TableCell>
                        <TableCell>隊列</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10}>
                                <Typography variant="body2" color="text.secondary">
                                    {loading ? '載入中...' : '還沒有任何已結算的日。'}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : null}
                    {rows.map((row) => (
                        <TableRow key={row.day} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/days/${row.day}`)}>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                                {row.day}
                            </TableCell>
                            <TableCell>{when(row.ts)}</TableCell>
                            <TableCell align="right">{num(row.dayBudget, 2)}</TableCell>
                            <TableCell align="right">{num(row.holdingAmount, 2)}</TableCell>
                            <TableCell align="right">{num(row.holdingDistributed, 2)}</TableCell>
                            <TableCell align="right">{num(row.communityAmount, 2)}</TableCell>
                            <TableCell align="right">{num(row.unusedAmount, 2)}</TableCell>
                            <TableCell align="right">
                                {row.buckets.expansion === null
                                    ? '—'
                                    : `${num(row.buckets.expansion, 2)} / ${num(row.buckets.collaboration, 2)} / ${num(row.buckets.contribution, 2)}`}
                            </TableCell>
                            <TableCell align="right">
                                {row.closed ? `${num(row.communityCredited, 2)} / ${num(row.communityLeftover, 2)}` : '未關閉'}
                            </TableCell>
                            <TableCell>
                                {row.queueStatus ? (
                                    <Chip size="small" label={QUEUE_LABEL[row.queueStatus] || row.queueStatus} color={QUEUE_COLOR[row.queueStatus] || 'default'} />
                                ) : (
                                    <Typography variant="caption" color="text.secondary">
                                        未建名單
                                    </Typography>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Pager total={total} offset={offset} pageSize={PAGE_SIZE} onChange={setOffset} />
        </Section>
    );
}
