import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    FormControlLabel,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';

import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useResource } from '../hooks/useResource';
import { Section } from '../components/Section';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { permissionLabel, groupLabel } from '../auth/permissions';

export function Roles() {
    const { data, error, loading, reload } = useResource('/api/roles');
    const { can } = useAuth();
    const mayWrite = can('admin.roles.write');

    const [catalogue, setCatalogue] = useState([]);
    const [selected, setSelected] = useState(null);
    const [draft, setDraft] = useState(null);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState(null);
    const [saved, setSaved] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [newRole, setNewRole] = useState({ name: '', description: '' });

    useEffect(() => {
        api.get('/api/roles/catalogue')
            .then(setCatalogue)
            .catch((err) => setActionError(err.message));
    }, []);

    const roles = data || [];

    // Keep the editor pointed at something real across reloads, and reset the
    // draft when the selection changes — an edit belongs to the role it started
    // on.
    useEffect(() => {
        if (roles.length === 0) return;
        const current = roles.find((role) => role.name === selected) || roles[0];
        if (current.name !== selected) setSelected(current.name);
        setDraft({ description: current.description || '', permissions: new Set(current.permissions) });
    }, [data, selected]); // eslint-disable-line react-hooks/exhaustive-deps

    const current = roles.find((role) => role.name === selected) || null;

    const groups = useMemo(() => {
        const byGroup = new Map();
        for (const entry of catalogue) {
            if (!byGroup.has(entry.group)) byGroup.set(entry.group, []);
            byGroup.get(entry.group).push(entry);
        }
        return [...byGroup.entries()];
    }, [catalogue]);

    const dirty =
        current &&
        draft &&
        (draft.description !== (current.description || '') ||
            draft.permissions.size !== current.permissions.length ||
            current.permissions.some((key) => !draft.permissions.has(key)));

    function toggle(key) {
        setDraft((d) => {
            const next = new Set(d.permissions);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return { ...d, permissions: next };
        });
    }

    async function save() {
        setBusy(true);
        setActionError(null);
        try {
            await api.put(`/api/roles/${encodeURIComponent(current.name)}`, {
                description: draft.description,
                permissions: [...draft.permissions],
            });
            setSaved(`${current.name} 已儲存`);
            await reload();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function create() {
        const name = newRole.name.trim();
        setBusy(true);
        setActionError(null);
        try {
            await api.post('/api/roles', { name, description: newRole.description, permissions: [] });
            setSaved(`已建立角色 ${name}`);
            setNewRole({ name: '', description: '' });
            // The selection can only move after the list carries the new role:
            // the effect above keeps `selected` on a role that exists, so
            // setting it while `data` is still the old list snaps it to roles[0].
            await reload();
            setSelected(name);
        } catch (err) {
            setActionError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        const target = pendingDelete;
        setPendingDelete(null);
        setBusy(true);
        setActionError(null);
        try {
            await api.del(`/api/roles/${encodeURIComponent(target.name)}`);
            setSaved(`已刪除角色 ${target.name}`);
            setSelected(null);
            await reload();
        } catch (err) {
            setActionError(err.message);
        } finally {
            setBusy(false);
        }
    }

    const editable = mayWrite && current && !current.builtin;

    return (
        <Section
            title="角色權限"
            description="一個角色就是一組權限。勾選的項目才是這個角色真正能做的事 —— 後端每一支 API 都會自己檢查，不是靠選單藏起來。內建的 admin 角色永遠持有全部權限且不能修改，這是確保後台不會被鎖死的最後一道保險。"
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
                    你只有檢視權限，下面的修改都是停用狀態。
                </Alert>
            ) : null}

            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ p: 2 }} spacing={2} alignItems="flex-start">
                <Paper variant="outlined" sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0 }}>
                    <List dense disablePadding>
                        {roles.map((role) => (
                            <ListItemButton
                                key={role.name}
                                selected={role.name === selected}
                                onClick={() => setSelected(role.name)}
                            >
                                <ListItemText
                                    primary={
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <span>{role.name}</span>
                                            {role.builtin ? <Chip size="small" label="內建" variant="outlined" /> : null}
                                        </Stack>
                                    }
                                    secondary={`${role.permissions.length} 項權限 · ${role.inUse} 人使用`}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                    <Divider />
                    <Box sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            新增角色
                        </Typography>
                        <Stack spacing={1}>
                            <TextField
                                size="small"
                                label="名稱"
                                helperText="2-16 字元：中文字，或小寫英文、數字、減號、底線"
                                value={newRole.name}
                                onChange={(event) => setNewRole((r) => ({ ...r, name: event.target.value }))}
                                disabled={!mayWrite || busy}
                            />
                            <TextField
                                size="small"
                                label="說明"
                                value={newRole.description}
                                onChange={(event) => setNewRole((r) => ({ ...r, description: event.target.value }))}
                                disabled={!mayWrite || busy}
                            />
                            <Button
                                variant="contained"
                                size="small"
                                disabled={!mayWrite || busy || !newRole.name.trim()}
                                onClick={create}
                            >
                                建立（不含任何權限）
                            </Button>
                        </Stack>
                    </Box>
                </Paper>

                <Box sx={{ flexGrow: 1, width: 0 }}>
                    {current && draft ? (
                        <>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                                <Typography variant="h6">{current.name}</Typography>
                                {current.builtin ? (
                                    <Chip size="small" color="primary" variant="outlined" label="內建角色，不可修改" />
                                ) : null}
                                <Box sx={{ flexGrow: 1 }} />
                                <Button variant="contained" size="small" disabled={!editable || !dirty || busy} onClick={save}>
                                    儲存
                                </Button>
                                <Button
                                    size="small"
                                    color="error"
                                    disabled={!editable || busy}
                                    onClick={() => setPendingDelete(current)}
                                >
                                    刪除角色
                                </Button>
                            </Stack>

                            <TextField
                                size="small"
                                fullWidth
                                label="說明"
                                value={draft.description}
                                onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
                                disabled={!editable}
                                sx={{ mb: 2, maxWidth: 520 }}
                            />

                            {groups.map(([group, entries]) => (
                                <Box key={group} sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                                        {groupLabel(group)}
                                        {group === 'contracts' ? (
                                            <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                                                —— 合約頁直接從瀏覽器簽名，這裡只控制面板顯示與流程，鏈上認的是私鑰
                                            </Typography>
                                        ) : null}
                                    </Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
                                        {entries.map((entry) => (
                                            <FormControlLabel
                                                key={entry.key}
                                                control={
                                                    <Checkbox
                                                        size="small"
                                                        checked={draft.permissions.has(entry.key)}
                                                        onChange={() => toggle(entry.key)}
                                                        disabled={!editable}
                                                    />
                                                }
                                                label={
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <span>{permissionLabel(entry.key)}</span>
                                                        {entry.danger ? (
                                                            <Chip size="small" color="warning" variant="outlined" label="需驗證碼" />
                                                        ) : null}
                                                        {/* A browser-signed key outside the contracts group gets the
                                                            same warning that group's caption gives: nothing enforces it. */}
                                                        {entry.scope === 'panel' && group !== 'contracts' ? (
                                                            <Tooltip title="按鈕直接從瀏覽器簽名，這裡只控制面板顯示與流程，鏈上認的是私鑰">
                                                                <Chip size="small" variant="outlined" label="僅面板" />
                                                            </Tooltip>
                                                        ) : null}
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                            {entry.key}
                                                        </Typography>
                                                    </Stack>
                                                }
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            ))}
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            {loading ? '載入中...' : '選一個角色來編輯。'}
                        </Typography>
                    )}
                </Box>
            </Stack>

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                title="刪除角色"
                detail={
                    pendingDelete ? (
                        <>
                            確定要刪除 <code>{pendingDelete.name}</code>？還有人使用這個角色時後端會擋下來 ——
                            角色被刪掉的帳號會變成「持有一個不存在的角色」，每一頁都是 403。
                        </>
                    ) : null
                }
                confirmLabel="刪除"
                busy={busy}
                onConfirm={remove}
                onClose={() => setPendingDelete(null)}
            />

            <Snackbar open={Boolean(saved)} autoHideDuration={3000} onClose={() => setSaved(null)} message={saved || ''} />
        </Section>
    );
}
