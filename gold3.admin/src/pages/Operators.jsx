import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    MenuItem,
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

import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useResource } from '../hooks/useResource';
import { Section } from '../components/Section';
import { ConfirmDialog } from '../components/ConfirmDialog';

function when(value) {
    return value ? new Date(value).toLocaleString() : '—';
}

export function Operators() {
    const { data, error, loading, reload } = useResource('/api/admin-users');
    const { can, user: me } = useAuth();
    const mayWrite = can('admin.users.write');

    // The role list needs admin.roles.read, which someone managing operators
    // may not hold. Falling back to a plain text field keeps the page usable
    // instead of blocking on a permission it does not strictly need.
    const [roles, setRoles] = useState(null);
    const [roleDrafts, setRoleDrafts] = useState({});
    const [busy, setBusy] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [saved, setSaved] = useState(null);
    const [pendingDisable, setPendingDisable] = useState(null);
    const [passwordFor, setPasswordFor] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [creating, setCreating] = useState({ username: '', password: '', role: '' });

    useEffect(() => {
        api.get('/api/roles')
            .then((list) => setRoles(list))
            .catch((err) => {
                console.warn('role list unavailable:', err.message);
                setRoles([]);
            });
    }, []);

    useEffect(() => {
        if (!data) return;
        const next = {};
        for (const row of data) next[row.username] = row.role;
        setRoleDrafts(next);
    }, [data]);

    async function patch(username, body, message) {
        setBusy(username);
        setActionError(null);
        try {
            await api.put(`/api/admin-users/${encodeURIComponent(username)}`, body);
            setSaved(message);
            await reload();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setBusy(null);
        }
    }

    async function create() {
        setBusy('__new__');
        setActionError(null);
        try {
            // Send what the button validated: the API pattern matches no
            // whitespace, so a pasted name with padding would fail on the
            // character rule rather than on the padding that caused it.
            const username = creating.username.trim();
            await api.post('/api/admin-users', { ...creating, username });
            setSaved(`已建立 ${username}`);
            setCreating({ username: '', password: '', role: '' });
            await reload();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setBusy(null);
        }
    }

    const rows = data || [];
    const roleNames = roles ? roles.map((role) => role.name) : [];

    return (
        <Section
            title="操作員"
            description="能登入這個後台的帳號。角色決定他們看得到什麼、能改什麼。停用只是關掉登入，紀錄會留著。新帳號建立後沒有綁定驗證器 —— 他第一次用密碼登入時，瀏覽器會給他一組密鑰。"
            loading={loading}
            error={error}
            onRetry={reload}
        >
            {actionError ? (
                <Alert severity="error" onClose={() => setActionError(null)} sx={{ m: 2 }}>
                    {actionError}
                </Alert>
            ) : null}

            {!mayWrite ? (
                <Alert severity="info" sx={{ m: 2 }}>
                    你只有檢視權限，下面的操作都是停用狀態。
                </Alert>
            ) : null}

            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>帳號</TableCell>
                        <TableCell sx={{ width: 200 }}>角色</TableCell>
                        <TableCell>狀態</TableCell>
                        <TableCell>驗證器</TableCell>
                        <TableCell>最後登入</TableCell>
                        <TableCell align="right" sx={{ width: 260 }} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6}>
                                <Typography variant="body2" color="text.secondary">
                                    {loading ? '載入中...' : '沒有任何帳號。'}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : null}

                    {rows.map((row) => {
                        const draft = roleDrafts[row.username] !== undefined ? roleDrafts[row.username] : row.role;
                        const dirty = draft !== row.role;
                        const isMe = me && me.username === row.username;
                        return (
                            <TableRow key={row.username} hover>
                                <TableCell sx={{ fontFamily: 'monospace' }}>
                                    {row.username}
                                    {isMe ? (
                                        <Chip size="small" label="你自己" variant="outlined" sx={{ ml: 1 }} />
                                    ) : null}
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        select={roleNames.length > 0}
                                        value={draft}
                                        onChange={(event) =>
                                            setRoleDrafts((current) => ({ ...current, [row.username]: event.target.value }))
                                        }
                                        size="small"
                                        variant="standard"
                                        fullWidth
                                        disabled={!mayWrite || busy !== null}
                                    >
                                        {/* Children only mean anything in select
                                            mode; without the role list this is a
                                            plain text field. */}
                                        {roleNames.length > 0
                                            ? roleNames.map((name) => (
                                                  <MenuItem key={name} value={name}>
                                                      {name}
                                                  </MenuItem>
                                              ))
                                            : null}
                                    </TextField>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={row.enabled ? '啟用中' : '已停用'}
                                        color={row.enabled ? 'success' : 'default'}
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color={row.totpBound ? 'text.primary' : 'warning.main'}>
                                        {row.totpBound ? '已綁定' : '尚未綁定'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {when(row.lastLoginAt)}
                                        {row.lastLoginIp ? ` · ${row.lastLoginIp}` : ''}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                        <Button
                                            size="small"
                                            variant={dirty ? 'contained' : 'outlined'}
                                            disabled={!mayWrite || !dirty || busy !== null}
                                            onClick={() =>
                                                patch(row.username, { role: draft }, `${row.username} 的角色已改為 ${draft}`)
                                            }
                                        >
                                            儲存角色
                                        </Button>
                                        <Button
                                            size="small"
                                            disabled={!mayWrite || busy !== null}
                                            onClick={() => {
                                                setNewPassword('');
                                                setPasswordFor(row.username);
                                            }}
                                        >
                                            改密碼
                                        </Button>
                                        {row.enabled ? (
                                            <Button
                                                size="small"
                                                color="error"
                                                disabled={!mayWrite || busy !== null}
                                                onClick={() => setPendingDisable(row)}
                                            >
                                                停用
                                            </Button>
                                        ) : (
                                            <Button
                                                size="small"
                                                disabled={!mayWrite || busy !== null}
                                                onClick={() =>
                                                    patch(row.username, { enabled: true }, `${row.username} 已啟用`)
                                                }
                                            >
                                                啟用
                                            </Button>
                                        )}
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    新增操作員
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    密碼至少 12 個字元。驗證器不在這裡產生 —— 密鑰只會出現在本人第一次登入的瀏覽器裡，不經過任何人轉交。
                    如果有人換手機需要重綁，只能在伺服器上執行 <code>npm run reset-totp -- 帳號</code>，這是刻意的。
                </Typography>
                <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap>
                    <TextField
                        label="帳號"
                        size="small"
                        value={creating.username}
                        onChange={(event) => setCreating((c) => ({ ...c, username: event.target.value }))}
                        disabled={!mayWrite || busy !== null}
                        sx={{ width: 240 }}
                    />
                    <TextField
                        label="密碼"
                        size="small"
                        type="password"
                        value={creating.password}
                        onChange={(event) => setCreating((c) => ({ ...c, password: event.target.value }))}
                        disabled={!mayWrite || busy !== null}
                        sx={{ width: 240 }}
                    />
                    <TextField
                        label="角色"
                        size="small"
                        select={roleNames.length > 0}
                        value={creating.role}
                        onChange={(event) => setCreating((c) => ({ ...c, role: event.target.value }))}
                        disabled={!mayWrite || busy !== null}
                        sx={{ width: 200 }}
                    >
                        {roleNames.length > 0
                            ? roleNames.map((name) => (
                                  <MenuItem key={name} value={name}>
                                      {name}
                                  </MenuItem>
                              ))
                            : null}
                    </TextField>
                    <Button
                        variant="contained"
                        disabled={
                            !mayWrite || busy !== null || !creating.username.trim() || !creating.password || !creating.role
                        }
                        onClick={create}
                    >
                        新增
                    </Button>
                </Stack>
            </Box>

            <ConfirmDialog
                open={Boolean(pendingDisable)}
                title="停用這個帳號"
                detail={
                    pendingDisable ? (
                        <>
                            <code>{pendingDisable.username}</code> 將無法再登入。已存在的登入工作階段會在到期時失效，
                            紀錄與操作歷史都會保留。要恢復隨時可以按「啟用」。
                        </>
                    ) : null
                }
                confirmLabel="停用"
                busy={busy !== null}
                onConfirm={async () => {
                    const target = pendingDisable;
                    setPendingDisable(null);
                    await patch(target.username, { enabled: false }, `${target.username} 已停用`);
                }}
                onClose={() => setPendingDisable(null)}
            />

            <Dialog open={Boolean(passwordFor)} onClose={() => setPasswordFor(null)} maxWidth="xs" fullWidth>
                <DialogTitle>設定新密碼</DialogTitle>
                <DialogContent>
                    <DialogContentText component="div" sx={{ mb: 2 }}>
                        直接覆寫 <code>{passwordFor}</code> 的密碼。對方下次登入要用這組新密碼，驗證器綁定不受影響。
                    </DialogContentText>
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        type="password"
                        label="新密碼（至少 12 個字元）"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasswordFor(null)}>取消</Button>
                    <Button
                        variant="contained"
                        disabled={newPassword.length < 12 || busy !== null}
                        onClick={async () => {
                            const target = passwordFor;
                            setPasswordFor(null);
                            await patch(target, { password: newPassword }, `${target} 的密碼已更新`);
                            setNewPassword('');
                        }}
                    >
                        更新密碼
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(saved)} autoHideDuration={3000} onClose={() => setSaved(null)} message={saved || ''} />
        </Section>
    );
}
