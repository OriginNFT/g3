import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';

import { api } from '../api/client';
import { Section } from '../components/Section';

const PAGE_SIZE = 50;

// Only the fields that actually changed, so a row reads as "what moved" instead
// of a wall of unchanged values.
function diffOf(before, after) {
    if (!before && !after) return [];
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    const changes = [];
    for (const key of keys) {
        const from = before ? before[key] : undefined;
        const to = after ? after[key] : undefined;
        if (JSON.stringify(from) === JSON.stringify(to)) continue;
        changes.push({ key, from, to });
    }
    return changes;
}

function show(value) {
    if (value === undefined) return '—';
    if (value === null) return 'null';
    return String(value);
}

export function Audit() {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [entity, setEntity] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
        if (entity.trim()) query.set('entity', entity.trim());
        if (username.trim()) query.set('username', username.trim());
        try {
            const result = await api.get(`/api/audit?${query.toString()}`);
            setRows(result.rows);
            setTotal(result.total);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [offset, entity, username]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <Section
            title="操作紀錄"
            description="透過這個後台做過的每一次變更，連同修改前後的值。變更成功之後才寫入，而且沒有任何刪除的介面 —— 可以被整理過的紀錄就不算紀錄。"
            loading={loading}
            error={error}
            onRetry={load}
            actions={
                <Stack direction="row" spacing={1}>
                    <TextField
                        label="項目"
                        value={entity}
                        onChange={(event) => {
                            setOffset(0);
                            setEntity(event.target.value);
                        }}
                        size="small"
                        placeholder="parameter"
                        sx={{ width: 180 }}
                    />
                    <TextField
                        label="操作者"
                        value={username}
                        onChange={(event) => {
                            setOffset(0);
                            setUsername(event.target.value);
                        }}
                        size="small"
                        sx={{ width: 160 }}
                    />
                </Stack>
            }
        >
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 180 }}>時間</TableCell>
                        <TableCell sx={{ width: 120 }}>操作者</TableCell>
                        <TableCell sx={{ width: 220 }}>操作內容</TableCell>
                        <TableCell>變更</TableCell>
                        <TableCell sx={{ width: 130 }}>來源 IP</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5}>
                                <Typography variant="body2" color="text.secondary">
                                    {loading ? '載入中...' : '沒有符合的紀錄。'}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : null}

                    {rows.map((row) => {
                        const changes = diffOf(row.before, row.after);
                        return (
                            <TableRow key={row.id} hover>
                                <TableCell>
                                    <Typography variant="body2">{new Date(row.created_at).toLocaleString()}</Typography>
                                </TableCell>
                                <TableCell>{row.username}</TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip
                                            size="small"
                                            label={row.action}
                                            color={row.action === 'delete' ? 'error' : row.action === 'create' ? 'success' : 'default'}
                                        />
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                                            {row.entity}
                                            {row.entity_id ? `/${row.entity_id}` : ''}
                                        </Typography>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    {changes.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary">
                                            —
                                        </Typography>
                                    ) : (
                                        changes.map((change) => (
                                            <Typography
                                                key={change.key}
                                                variant="body2"
                                                sx={{ fontFamily: 'monospace', fontSize: 12 }}
                                            >
                                                {change.key}: {show(change.from)} → {show(change.to)}
                                            </Typography>
                                        ))
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {row.ip || ''}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end">
                    <Typography variant="body2" color="text.secondary">
                        {total === 0 ? '0' : `第 ${offset + 1}-${Math.min(offset + PAGE_SIZE, total)} 筆，共 ${total} 筆`}
                    </Typography>
                    <Button size="small" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                        較新
                    </Button>
                    <Button
                        size="small"
                        disabled={offset + PAGE_SIZE >= total}
                        onClick={() => setOffset(offset + PAGE_SIZE)}
                    >
                        較舊
                    </Button>
                </Stack>
            </Box>
        </Section>
    );
}
