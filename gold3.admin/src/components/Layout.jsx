import { useEffect, useState } from 'react';
import {
    AppBar,
    Box,
    Button,
    Chip,
    Collapse,
    Divider,
    Drawer,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { useWallet, shorten } from '../chain/wallet';
import { NAV_SECTIONS, allows } from '../nav';
import { BRAND, MONO } from '../theme';

const DRAWER_WIDTH = 244;

// Which groups are folded up, kept across reloads. A sidebar that forgets is a
// sidebar you re-fold every morning.
const NAV_STATE_KEY = 'gold3.admin.nav';

function readNavState() {
    try {
        const raw = localStorage.getItem(NAV_STATE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
        // A corrupt entry must not take the panel down with it.
        console.warn('nav state unreadable, starting fresh:', err.message);
        return {};
    }
}

function WalletButton() {
    const { account, connect, connecting, installed, wrongChain, expectedChainId, error } = useWallet();

    if (!installed) {
        return (
            <Tooltip title="這台機器的瀏覽器沒有錢包擴充功能，合約設置頁只能讀不能簽">
                <span>
                    <Button size="small" disabled>
                        未偵測到錢包
                    </Button>
                </span>
            </Tooltip>
        );
    }

    if (!account) {
        return (
            <Button size="small" variant="outlined" onClick={connect} disabled={connecting}>
                {connecting ? '連接中...' : '連接錢包'}
            </Button>
        );
    }

    return (
        <Stack direction="row" spacing={1} alignItems="center">
            {wrongChain ? (
                <Tooltip title={`錢包不在 chainId ${expectedChainId}，送出交易前會自動要求切換`}>
                    <Chip size="small" color="warning" label="鏈別不符" onClick={connect} />
                </Tooltip>
            ) : null}
            {error ? (
                <Tooltip title={error.message}>
                    <Chip size="small" color="error" label="錢包錯誤" />
                </Tooltip>
            ) : null}
            <Tooltip title={account}>
                <Chip size="small" variant="outlined" label={shorten(account)} sx={{ fontFamily: MONO }} />
            </Tooltip>
        </Stack>
    );
}

function NavItem({ item, allowed }) {
    const button = (
        <ListItemButton
            component={allowed ? NavLink : 'div'}
            to={allowed ? item.to : undefined}
            disabled={!allowed}
            sx={{ py: 0.6, '&.active .MuiListItemText-primary': { fontWeight: 600 } }}
        >
            <ListItemText
                primary={item.label}
                secondary={item.hint}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500, color: 'inherit' }}
                secondaryTypographyProps={{ variant: 'caption', color: 'text.disabled' }}
            />
        </ListItemButton>
    );

    if (allowed) return button;

    return (
        <Tooltip title="你的角色沒有這個頁面的權限" placement="right">
            {/* A disabled item swallows pointer events, so the tooltip needs a
                wrapper that still receives them. */}
            <span>{button}</span>
        </Tooltip>
    );
}

function NavGroup({ section, open, onToggle, can }) {
    const allowed = section.items.filter((item) => allows(can, item.perm)).length;

    return (
        <Box>
            <Divider sx={{ mx: 2 }} />
            <List dense disablePadding sx={{ py: 0.5 }}>
                <ListItemButton onClick={onToggle} aria-expanded={open} sx={{ py: 0.4 }}>
                    <ListItemText
                        primary={section.title}
                        primaryTypographyProps={{ variant: 'overline', fontSize: 11, color: 'text.disabled' }}
                        secondary={allowed === section.items.length ? null : `${allowed} / ${section.items.length} 可用`}
                        secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    {open ? <ExpandLess fontSize="small" color="disabled" /> : <ExpandMore fontSize="small" color="disabled" />}
                </ListItemButton>

                <Collapse in={open} timeout="auto" unmountOnExit>
                    <List dense disablePadding>
                        {section.items.map((item) => (
                            <NavItem key={item.to} item={item} allowed={allows(can, item.perm)} />
                        ))}
                    </List>
                </Collapse>
            </List>
        </Box>
    );
}

export function Layout() {
    const { user, signOut, can } = useAuth();
    const { pathname } = useLocation();
    const [navState, setNavState] = useState(readNavState);

    // Landing on a page inside a folded group unfolds it. Otherwise the sidebar
    // would show no trace of where you are, which reads as a broken menu.
    useEffect(() => {
        const active = NAV_SECTIONS.find((section) => section.items.some((item) => pathname.startsWith(item.to)));
        if (!active) return;
        setNavState((current) => {
            const stored = current[active.title];
            const closed = stored === false || (stored === undefined && active.folded);
            return closed ? { ...current, [active.title]: true } : current;
        });
    }, [pathname]);

    useEffect(() => {
        try {
            localStorage.setItem(NAV_STATE_KEY, JSON.stringify(navState));
        } catch (err) {
            console.warn('nav state could not be saved:', err.message);
        }
    }, [navState]);

    const isOpen = (section) => {
        const stored = navState[section.title];
        if (typeof stored === 'boolean') return stored;
        if (section.folded) return false;
        return section.items.some((item) => allows(can, item.perm));
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AppBar position="fixed" color="default" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar sx={{ gap: 2 }}>
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: DRAWER_WIDTH - 32 }}>
                        <Box
                            sx={{
                                width: 30,
                                height: 30,
                                borderRadius: 1.5,
                                background: BRAND,
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: 14,
                                fontWeight: 800,
                                color: '#FFFFFF',
                                letterSpacing: '-0.04em',
                            }}
                        >
                            GG
                        </Box>
                        <Stack sx={{ lineHeight: 1 }}>
                            <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
                                GOLDEN PACT
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.15 }}>
                                管理後台
                            </Typography>
                        </Stack>
                    </Stack>

                    <Box sx={{ flexGrow: 1 }} />

                    <Stack direction="row" spacing={2} alignItems="center">
                        <WalletButton />
                        <Divider orientation="vertical" flexItem sx={{ my: 1.25, borderStyle: 'solid' }} />
                        <Stack alignItems="flex-end" sx={{ lineHeight: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                {user ? user.username : ''}
                            </Typography>
                            {user && user.role ? (
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                    {user.role}
                                </Typography>
                            ) : null}
                        </Stack>
                        <Button size="small" color="inherit" onClick={signOut}>
                            登出
                        </Button>
                    </Stack>
                </Toolbar>
            </AppBar>

            <Drawer
                variant="permanent"
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
                }}
            >
                <Toolbar />
                {NAV_SECTIONS.map((section) => (
                    <NavGroup
                        key={section.title}
                        section={section}
                        can={can}
                        open={isOpen(section)}
                        onToggle={() => setNavState((current) => ({ ...current, [section.title]: !isOpen(section) }))}
                    />
                ))}
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, px: 4, pb: 6, pt: 0, width: 0 }}>
                <Toolbar />
                <Box sx={{ pt: 3 }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
