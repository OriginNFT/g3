import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Radio,
    RadioGroup,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { getAddress } from 'ethers';

import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AddressLink } from '../components/ContractCard';
import { Section } from '../components/Section';
import { num, TxLink, Pager, BUCKET_LABEL } from './shared';

const PAGE_SIZE = 50;
const TOKEN = 'GG';

const STATUS_COLOR = { pending: 'default', sending: 'warning', sent: 'success', failed: 'error' };
const STATUS_LABEL = { pending: '待發送', sending: '發送中', sent: '已發送', failed: '失敗' };
const DAY_STATUS_LABEL = { queued: '隊列中', sent: '已全部送出', closed: '已關閉' };
const DAY_STATUS_COLOR = { queued: 'warning', sent: 'info', closed: 'success' };

const BUCKETS = ['EXPANSION', 'COLLABORATION', 'CONTRIBUTION'];

/**
 * Parse the pasted list: one row per line, `address bucket amount`, separated
 * by whitespace, commas or tabs (a spreadsheet paste). Returns the rows and
 * the lines that did not parse, so the dialog can show both before anything
 * is sent.
 */
function parseRows(text) {
    const rows = [];
    const problems = [];
    text.split(/\r?\n/).forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const parts = trimmed.split(/[\s,;]+/).filter(Boolean);
        if (parts.length !== 3) {
            problems.push(`第 ${index + 1} 行：需要 地址 桶 金額 三欄`);
            return;
        }
        let address;
        try {
            address = getAddress(parts[0]);
        } catch {
            problems.push(`第 ${index + 1} 行：地址不正確`);
            return;
        }
        const bucket = parts[1].toUpperCase();
        if (!BUCKETS.includes(bucket)) {
            problems.push(`第 ${index + 1} 行：桶必須是 ${BUCKETS.join(' / ')}`);
            return;
        }
        if (!/^\d+(\.\d{1,18})?$/.test(parts[2]) || /^0+(\.0+)?$/.test(parts[2])) {
            problems.push(`第 ${index + 1} 行：金額必須是正數，最多 18 位小數`);
            return;
        }
        rows.push({ address, bucket, amount: parts[2] });
    });
    return { rows, problems };
}

/**
 * Enqueue a settled day's rows. The amounts come from the off-chain
 * assessment (spec §13); this is where they enter the system. The API checks
 * the day is settled, not closed, not already queued, and that each bucket's
 * rows fit its on-chain budget.
 */
function EnqueueDialog({ open, busy, error, onClose, onSubmit }) {
    const [day, setDay] = useState('');
    const [text, setText] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (open) {
            setDay('');
            setText('');
            setNote('');
        }
    }, [open]);

    const parsed = parseRows(text);
    const dayValue = Number(day);
    const dayValid = Number.isInteger(dayValue) && dayValue >= 1;
    const canSubmit = dayValid && parsed.problems.length === 0 && parsed.rows.length > 0 && note.trim().length >= 10;

    const totals = {};
    for (const row of parsed.rows) totals[row.bucket] = (totals[row.bucket] || 0) + Number(row.amount);

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle>建立當日名單</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error ? <Alert severity="error">{error}</Alert> : null}
                    <Alert severity="info">
                        每行一筆：<code>地址 桶 金額</code>，桶是 EXPANSION / COLLABORATION / CONTRIBUTION，金額是 GG。
                        同一地址同一桶只能出現一次。API 會核對當日每一桶的鏈上預算，超過就拒絕整份名單。
                    </Alert>
                    <TextField
                        label="協議日"
                        value={day}
                        onChange={(event) => setDay(event.target.value.replace(/\D/g, ''))}
                        size="small"
                        sx={{ width: 200 }}
                        disabled={busy}
                        error={day !== '' && !dayValid}
                    />
                    <TextField
                        label="名單"
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        minRows={8}
                        disabled={busy}
                        placeholder={'0x... EXPANSION 12.5\n0x... CONTRIBUTION 3'}
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
                    />
                    {parsed.problems.length > 0 ? (
                        <Alert severity="warning">
                            {parsed.problems.slice(0, 8).map((p) => (
                                <div key={p}>{p}</div>
                            ))}
                            {parsed.problems.length > 8 ? <div>…還有 {parsed.problems.length - 8} 個問題</div> : null}
                        </Alert>
                    ) : null}
                    <Typography variant="body2" color="text.secondary">
                        共 {parsed.rows.length} 筆
                        {BUCKETS.filter((b) => totals[b]).map((b) => ` · ${BUCKET_LABEL[b]} ${num(totals[b], 4)} ${TOKEN}`).join('')}
                    </Typography>
                    <TextField
                        label="金額來源說明"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                        disabled={busy}
                        helperText="會記錄到操作紀錄，至少 10 個字元。"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={busy}>
                    取消
                </Button>
                <Button variant="contained" disabled={!canSubmit || busy} onClick={() => onSubmit({ day: dayValue, rows: parsed.rows, note: note.trim() })}>
                    {busy ? '送出中...' : '建立名單'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/**
 * The one dialog in this panel that can cost money.
 *
 * CommunityEngine.credit(day, bucket, accounts[], amounts[]) is purely
 * additive and carries no idempotency key, so putting a batch back in the
 * queue when it actually landed credits everyone in it twice.
 */
function ResolveDialog({ open, batch, busy, error, onClose, onSubmit }) {
    const [outcome, setOutcome] = useState('sent');
    const [tx, setTx] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (open && batch) {
            setOutcome('sent');
            setTx(batch.tx || '');
            setNote('');
        }
    }, [open, batch]);

    const txValid = /^0x[0-9a-fA-F]{64}$/.test(tx.trim());
    const canSubmit = note.trim().length >= 10 && (outcome === 'pending' || txValid);

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>處理 nonce {batch ? batch.nonce : ''} 的批次</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error ? <Alert severity="error">{error}</Alert> : null}
                    <Alert severity="warning">
                        <AlertTitle>請先確認鏈上狀態</AlertTitle>
                        {batch ? (
                            <>
                                共 {batch.count} 筆發放、{num(batch.total, 4)} {TOKEN}，第 {String(batch.day)} 日。Accountant 為這個批次保留了 nonce{' '}
                                <strong>{batch.nonce}</strong>，但沒有記錄後續結果。
                            </>
                        ) : null}
                    </Alert>

                    <RadioGroup value={outcome} onChange={(event) => setOutcome(event.target.value)}>
                        <FormControlLabel value="sent" control={<Radio />} label="交易已成功上鏈 —— 結清這些紀錄，不再發送" />
                        <FormControlLabel value="pending" control={<Radio />} label="交易沒有上鏈 —— 放回隊列重新發送" />
                    </RadioGroup>

                    {outcome === 'pending' ? (
                        <Alert severity="error">
                            如果那個 nonce <strong>其實已經上鏈</strong>，這個批次裡的每一個地址都會被再發一次，而且無法收回。
                            選這個之前，請先在鏈上確認該 nonce 從未被使用。桶預算不是保護 —— 只要重複的金額還塞得進預算就會成功。
                        </Alert>
                    ) : null}

                    <TextField
                        label="交易雜湊"
                        value={tx}
                        onChange={(event) => setTx(event.target.value)}
                        size="small"
                        fullWidth
                        disabled={outcome === 'pending' || busy}
                        error={outcome === 'sent' && tx.length > 0 && !txValid}
                        helperText={outcome === 'sent' ? '必填 —— 你在鏈上確認過的那筆交易' : '重新排入隊列時不會用到'}
                    />

                    <TextField
                        label="你確認了什麼？"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                        disabled={busy}
                        helperText="會記錄到操作紀錄，至少 10 個字元。"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={busy}>
                    取消
                </Button>
                <Button
                    variant="contained"
                    color={outcome === 'pending' ? 'error' : 'primary'}
                    disabled={!canSubmit || busy}
                    onClick={() => onSubmit({ nonce: batch.nonce, outcome, tx: tx.trim(), note: note.trim() })}
                >
                    {busy ? '處理中...' : outcome === 'pending' ? '放回隊列' : '標記為已發送'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export function Queues() {
    const { can } = useAuth();
    const mayWrite = can('queues.write');
    const [summary, setSummary] = useState(null);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState(null);
    const [done, setDone] = useState(null);
    const [resolving, setResolving] = useState(null);
    const [retrying, setRetrying] = useState(false);
    const [enqueuing, setEnqueuing] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
        if (status) query.set('status', status);
        try {
            const [summaryResult, listResult] = await Promise.all([
                api.get('/api/queues/community/summary'),
                api.get(`/api/queues/community?${query.toString()}`),
            ]);
            setSummary(summaryResult);
            setRows(listResult.rows);
            setTotal(listResult.total);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [offset, status]);

    useEffect(() => {
        load();
    }, [load]);

    async function act(fn, closeDialog) {
        setBusy(true);
        setActionError(null);
        try {
            await fn();
            closeDialog();
            await load();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setBusy(false);
        }
    }

    const enqueue = (payload) =>
        act(async () => {
            const result = await api.post('/api/queues/community/enqueue', payload);
            setDone(`第 ${result.day} 日已建立 ${result.enqueued} 筆名單`);
        }, () => setEnqueuing(false));

    const resolve = (payload) =>
        act(async () => {
            const result = await api.post('/api/queues/community/resolve', payload);
            setDone(`已處理 ${result.resolved} 筆，結果標記為 ${STATUS_LABEL[result.outcome] || result.outcome}`);
        }, () => setResolving(null));

    const retryFailed = () =>
        act(async () => {
            const result = await api.post('/api/queues/community/retry', {});
            setDone(`已將 ${result.requeued} 筆失敗紀錄放回隊列`);
        }, () => setRetrying(false));

    const deleteDay = () =>
        act(async () => {
            const result = await api.del(`/api/queues/community/day/${deleting.day}`);
            setDone(`第 ${result.day} 日已刪除 ${result.deleted} 筆待發送紀錄`);
        }, () => setDeleting(null));

    // The summary groups by (nonce, tx) but POST /resolve matches on nonce
    // alone; fold replacement sends into one decision per nonce.
    const stuck = [];
    for (const row of (summary && summary.stuck) || []) {
        const merged = stuck.find((item) => item.nonce === row.nonce);
        if (!merged) {
            stuck.push({ ...row, txs: row.tx ? [row.tx] : [] });
            continue;
        }
        merged.count += row.count;
        merged.total = String(Number(merged.total) + Number(row.total));
        merged.day = Math.min(merged.day, row.day);
        if (row.tx && !merged.txs.includes(row.tx)) merged.txs.push(row.tx);
        merged.tx = merged.txs.length === 1 ? merged.txs[0] : null;
    }
    const byStatus = (summary && summary.byStatus) || [];
    const failedCount = Number((byStatus.find((row) => row.status === 'failed') || {}).count || 0);
    const days = (summary && summary.days) || [];

    return (
        <Stack spacing={3}>
            {actionError && !resolving && !enqueuing ? (
                <Alert severity="error" onClose={() => setActionError(null)}>
                    {actionError}
                </Alert>
            ) : null}

            <Section
                title="發放隊列"
                description={
                    '社區三個 30% 桶的名單，等待 community-accountant 用 CommunityEngine.credit(day, bucket, accounts[], amounts[]) 推上鏈，' +
                    '全部送出後 closeDay 把剩餘回保障國庫。名單怎麼算是鏈下考核（spec §13），在這裡建立。' +
                    '之所以要有隊列，是因為 credit 是純累加、不帶冪等鍵 —— 鏈上分不出重試和第二次發放。'
                }
                loading={loading}
                error={error}
                onRetry={load}
                actions={
                    <Stack direction="row" spacing={1}>
                        <TextField
                            select
                            label="狀態"
                            value={status}
                            onChange={(event) => {
                                setOffset(0);
                                setStatus(event.target.value);
                            }}
                            size="small"
                            sx={{ width: 160 }}
                            SelectProps={{ native: true }}
                            InputLabelProps={{ shrink: true }}
                        >
                            <option value="">全部</option>
                            <option value="pending">待發送</option>
                            <option value="sending">發送中</option>
                            <option value="sent">已發送</option>
                            <option value="failed">失敗</option>
                        </TextField>
                        <Button size="small" variant="contained" onClick={() => setEnqueuing(true)} disabled={!mayWrite || busy}>
                            建立名單
                        </Button>
                        <Button size="small" onClick={() => setRetrying(true)} disabled={!mayWrite || busy || failedCount === 0}>
                            重試失敗紀錄（{failedCount}）
                        </Button>
                    </Stack>
                }
            >
                {!mayWrite ? (
                    <Alert severity="info" sx={{ m: 2 }}>
                        你只有檢視權限，建立名單、重試與處理批次都是停用狀態。
                    </Alert>
                ) : null}

                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {byStatus.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                {loading ? '載入中...' : '隊列是空的。'}
                            </Typography>
                        ) : (
                            byStatus.map((row) => (
                                <Chip
                                    key={row.status}
                                    size="small"
                                    color={STATUS_COLOR[row.status] || 'default'}
                                    label={`${STATUS_LABEL[row.status] || row.status}：${row.count} 筆（${num(row.total, 2)} ${TOKEN}）`}
                                />
                            ))
                        )}
                    </Stack>
                </Box>

                {stuck.length > 0 ? (
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <AlertTitle>有 {stuck.length} 個批次卡在發送中</AlertTitle>
                            Accountant 把這些標記成 <code>sending</code> 之後就沒有記錄結果。在處理完之前它不會再動這個隊列 ——
                            請逐一到鏈上確認 nonce，然後回報實際結果。
                        </Alert>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nonce</TableCell>
                                    <TableCell>交易</TableCell>
                                    <TableCell align="right">日</TableCell>
                                    <TableCell align="right">筆數</TableCell>
                                    <TableCell align="right">總額</TableCell>
                                    <TableCell align="right" />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stuck.map((batch) => (
                                    <TableRow key={batch.nonce === null ? 'none' : batch.nonce}>
                                        <TableCell>{batch.nonce === null ? '—' : batch.nonce}</TableCell>
                                        <TableCell>
                                            {batch.txs.length > 0 ? (
                                                <Stack spacing={0.5}>
                                                    {batch.txs.map((hash) => (
                                                        <TxLink key={hash} hash={hash} />
                                                    ))}
                                                </Stack>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    沒有記錄雜湊
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">{String(batch.day)}</TableCell>
                                        <TableCell align="right">{batch.count}</TableCell>
                                        <TableCell align="right">{num(batch.total, 4)}</TableCell>
                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="warning"
                                                disabled={!mayWrite || busy || batch.nonce === null}
                                                onClick={() => setResolving(batch)}
                                            >
                                                處理
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                ) : null}

                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        各日狀態
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {days.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                還沒有任何一日建立名單。
                            </Typography>
                        ) : (
                            days.map((row) => (
                                <Chip
                                    key={row.day}
                                    size="small"
                                    variant="outlined"
                                    color={DAY_STATUS_COLOR[row.status] || 'default'}
                                    label={`第 ${row.day} 日：${DAY_STATUS_LABEL[row.status] || row.status}`}
                                    onDelete={mayWrite && row.status === 'queued' ? () => setDeleting(row) : undefined}
                                />
                            ))
                        )}
                    </Stack>
                </Box>

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell align="right">日</TableCell>
                            <TableCell>地址</TableCell>
                            <TableCell>桶</TableCell>
                            <TableCell align="right">金額</TableCell>
                            <TableCell>狀態</TableCell>
                            <TableCell>交易</TableCell>
                            <TableCell align="right">重試</TableCell>
                            <TableCell>錯誤</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8}>
                                    <Typography variant="body2" color="text.secondary">
                                        {loading ? '載入中...' : '隊列中沒有資料。'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : null}
                        {rows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell align="right">{String(row.day)}</TableCell>
                                <TableCell>
                                    <AddressLink address={row.address} />
                                </TableCell>
                                <TableCell>
                                    <Chip size="small" variant="outlined" label={BUCKET_LABEL[row.bucket] || row.bucket} />
                                </TableCell>
                                <TableCell align="right">{num(row.amount, 4)}</TableCell>
                                <TableCell>
                                    <Chip size="small" label={STATUS_LABEL[row.status] || row.status} color={STATUS_COLOR[row.status] || 'default'} />
                                </TableCell>
                                <TableCell>
                                    <TxLink hash={row.tx} />
                                    {row.nonce !== null && row.nonce !== undefined ? (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            nonce：{row.nonce}
                                        </Typography>
                                    ) : null}
                                </TableCell>
                                <TableCell align="right">{row.retry_count}</TableCell>
                                <TableCell>
                                    <Typography variant="caption" color="error">
                                        {row.error || ''}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Pager total={total} offset={offset} pageSize={PAGE_SIZE} onChange={setOffset} />
            </Section>

            <EnqueueDialog
                open={enqueuing}
                busy={busy}
                error={enqueuing ? actionError : null}
                onClose={() => {
                    setActionError(null);
                    setEnqueuing(false);
                }}
                onSubmit={enqueue}
            />

            <ResolveDialog
                open={Boolean(resolving)}
                batch={resolving}
                busy={busy}
                error={resolving ? actionError : null}
                onClose={() => {
                    setActionError(null);
                    setResolving(null);
                }}
                onSubmit={resolve}
            />

            <ConfirmDialog
                open={retrying}
                title="重試失敗紀錄"
                detail={
                    <>
                        將目前 <strong>{failedCount}</strong> 筆狀態為「失敗」的發放紀錄放回隊列（狀態改為待發送，清掉 nonce、交易雜湊與錯誤訊息），
                        accountant 下一輪會重新送出。失敗的交易沒有發出任何 {TOKEN}，所以重送不會重複發放。
                    </>
                }
                confirmLabel="放回隊列"
                busy={busy}
                onConfirm={retryFailed}
                onClose={() => setRetrying(false)}
            />

            <ConfirmDialog
                open={Boolean(deleting)}
                title={`刪除第 ${deleting ? deleting.day : ''} 日的待發送名單`}
                detail={
                    <>
                        只會刪除狀態為「待發送」的紀錄；已發送、發送中、失敗的都會留下。如果這一日沒有其他紀錄，日的標頭也一併移除，之後可以重新建立名單。
                    </>
                }
                confirmLabel="刪除"
                busy={busy}
                onConfirm={deleteDay}
                onClose={() => setDeleting(null)}
            />

            <Snackbar open={Boolean(done)} autoHideDuration={4000} onClose={() => setDone(null)} message={done || ''} />
        </Stack>
    );
}
