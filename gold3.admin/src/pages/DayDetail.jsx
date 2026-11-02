import { Button, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';

import { Section } from '../components/Section';
import { ReadGrid } from '../components/ContractCard';
import { useResource } from '../hooks/useResource';
import { num, when, TxLink, BUCKET_LABEL } from './shared';

const STATUS_LABEL = { pending: '待發送', sending: '發送中', sent: '已發送', failed: '失敗' };

export function DayDetail() {
    const { day } = useParams();
    const navigate = useNavigate();
    const { data: d, error, loading, reload } = useResource(`/api/days/${day}`);

    const settlement = d ? d.settlement : null;
    const buckets = d ? d.buckets : null;

    return (
        <Stack spacing={3}>
            <Section
                title={`第 ${day} 日`}
                description="這一日在四個合約上留下的紀錄，並排放在一起。"
                loading={loading}
                error={error}
                onRetry={reload}
                actions={
                    <Button size="small" onClick={() => navigate('/days')}>
                        回列表
                    </Button>
                }
            >
                <Stack spacing={2} sx={{ p: 2 }}>
                    <ReadGrid
                        items={[
                            { label: '結算時間', value: settlement ? when(settlement.ts) : '' },
                            { label: '交易', value: settlement ? <TxLink hash={settlement.tx} /> : '' },
                            { label: '當日預算', value: settlement ? `${num(settlement.dayBudget, 4)} GG` : '' },
                            { label: '持倉 50%', value: settlement ? `${num(settlement.holdingAmount, 4)} GG` : '' },
                            { label: '持倉實際分配', value: d && d.holding ? `${num(d.holding.distributed, 4)} GG` : '', hint: '算力金庫實際拉走的數量' },
                            { label: '社區 50%', value: settlement ? `${num(settlement.communityAmount, 4)} GG` : '' },
                            { label: '回保障國庫', value: settlement ? `${num(settlement.unusedAmount, 4)} GG` : '', hint: '沒有算力可分的部分' },
                        ]}
                    />
                    <ReadGrid
                        items={[
                            { label: '拓展 30%', value: buckets ? `${num(buckets.expansion, 4)} GG` : '' },
                            { label: '協作 30%', value: buckets ? `${num(buckets.collaboration, 4)} GG` : '' },
                            { label: '貢獻 30%', value: buckets ? `${num(buckets.contribution, 4)} GG` : '' },
                            { label: 'DAO 組織建設 5%', value: buckets ? `${num(buckets.daoBuilding, 4)} GG` : '', hint: '結算時直接記到固定地址' },
                            { label: '平台 5%', value: buckets ? `${num(buckets.platform, 4)} GG` : '', hint: '結算時直接記到固定地址' },
                            {
                                label: '關閉',
                                value: d && d.closed ? `已發 ${num(d.closed.credited, 4)} / 剩餘 ${num(d.closed.leftover, 4)} GG` : d ? '尚未關閉' : '',
                                hint: d && d.closed ? when(d.closed.ts) : '剩餘會回保障國庫（UNUSED_COMMUNITY）',
                            },
                            {
                                label: '名單狀態',
                                value: d && d.queueDay ? d.queueDay.status : d ? '未建名單' : '',
                                hint: d && d.queueDay && d.queueDay.tx ? 'closeDay 交易見下' : '',
                            },
                        ]}
                    />
                </Stack>
            </Section>

            <Section title="鏈上已記帳" description="CommunityCredited 事件按桶彙總。" loading={loading} error={error}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>桶</TableCell>
                            <TableCell align="right">筆數</TableCell>
                            <TableCell align="right">總額（GG）</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(d ? d.credited : []).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        還沒有任何記帳。
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : null}
                        {(d ? d.credited : []).map((row) => (
                            <TableRow key={row.bucket}>
                                <TableCell>{BUCKET_LABEL[row.bucketName] || row.bucketName || row.bucket}</TableCell>
                                <TableCell align="right">{row.count}</TableCell>
                                <TableCell align="right">{num(row.total, 4)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Section>

            <Section title="名單隊列" description="這一日在 gold3_community_queue 裡的名單，按桶與狀態彙總。" loading={loading} error={error}>
                <Grid container>
                    <Grid item xs={12}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>桶</TableCell>
                                    <TableCell>狀態</TableCell>
                                    <TableCell align="right">筆數</TableCell>
                                    <TableCell align="right">總額（GG）</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(d ? d.queue : []).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4}>
                                            <Typography variant="body2" color="text.secondary">
                                                這一日還沒有建立名單。
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                                {(d ? d.queue : []).map((row) => (
                                    <TableRow key={`${row.bucket}-${row.status}`}>
                                        <TableCell>{BUCKET_LABEL[row.bucket] || row.bucket}</TableCell>
                                        <TableCell>{STATUS_LABEL[row.status] || row.status}</TableCell>
                                        <TableCell align="right">{row.count}</TableCell>
                                        <TableCell align="right">{num(row.total, 4)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {d && d.queueDay && d.queueDay.tx ? (
                            <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>
                                closeDay 交易：<TxLink hash={d.queueDay.tx} />
                            </Typography>
                        ) : null}
                    </Grid>
                </Grid>
            </Section>
        </Stack>
    );
}
