import { createContext, useContext, useMemo } from 'react';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';

import { useAuth } from '../auth/AuthContext';
import { permissionLabel } from '../auth/permissions';

// The write permission that applies to whatever is currently on screen. Set by
// the route wrapper, read by TxButton, so a page's signing buttons go inert
// without every page having to ask.
const WriteContext = createContext(null);

export function useWritePermission() {
    const key = useContext(WriteContext);
    const { can } = useAuth();
    // No key declared means the page never claimed to need one — do not invent a
    // restriction that was never configured.
    return { key, allowed: key ? can(key) : true };
}

/**
 * Route wrapper: read permission decides whether the page renders, write
 * permission is published to the page's buttons.
 *
 * Missing read permission shows a panel saying so, rather than a redirect or a
 * blank screen — the same reasoning as the rest of this panel, where a control
 * you cannot use is disabled and still visible. Hiding it would leave someone
 * staring at a menu item that does nothing.
 */
export function Guarded({ read, write, children }) {
    const { can } = useAuth();
    const value = useMemo(() => write || null, [write]);

    if (read && !can(read)) {
        return (
            <Stack spacing={2}>
                <Typography variant="h5">沒有權限</Typography>
                <Paper variant="outlined">
                    <Box sx={{ p: 3 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            這個頁面需要「{permissionLabel(read)}」權限。
                        </Alert>
                        <Typography variant="body2" color="text.secondary">
                            如果你認為這是設定錯誤，請找持有「新增與管理角色權限」的管理員調整你的角色。
                        </Typography>
                    </Box>
                </Paper>
            </Stack>
        );
    }

    return <WriteContext.Provider value={value}>{children}</WriteContext.Provider>;
}
