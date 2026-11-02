import { useCallback, useEffect, useState } from 'react';
import { Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { formatUnits } from 'ethers';

import { api } from '../api/client';
import { ADDRESSES, getProvider } from '../chain/client';
import { AddressLink } from '../components/ContractCard';
import { Section } from '../components/Section';
import { useChainRead } from '../hooks/useChainRead';

const REFRESH_SECONDS = 15;

// The heartbeat carries a 60s TTL, so anything more than a minute behind is a
// service that stopped writing rather than one that is merely idle.
const BEHIND_WARN = 200;

// The keepers' signing wallets, by the address-book key that holds each one
// (gold3.sync/keepers, written into the book by the role grant scripts).
const KEEPER_WALLETS = [
    { service: 'oracle-updater', key: 'ORACLE_UPDATER_ACCOUNT' },
    { service: 'daily-settlement', key: 'SETTLEMENT_ACCOUNT' },
    { service: 'buyback', key: 'BUYBACK_ACCOUNT' },
    { service: 'community-accountant', key: 'ACCOUNTANT_ACCOUNT' },
];

// Each wallet with its address from the address book; null when the book has none.
function resolveWallets() {
    return KEEPER_WALLETS.map((wallet) => ({ ...wallet, address: (wallet.key && ADDRESSES[wallet.key]) || null }));
}

// One failed read marks its own row instead of failing the whole table.
async function loadWalletBalances() {
    const provider = getProvider();
    return Promise.all(
        resolveWallets().map(async (wallet) => {
            if (!wallet.address) return { ...wallet, balance: null, error: null };
            try {
                return { ...wallet, balance: await provider.getBalance(wallet.address), error: null };
            } catch (err) {
                console.error(`[SERVICES] balance of ${wallet.key} ${wallet.address} failed:`, err.message, err);
                return { ...wallet, balance: null, error: err.message };
            }
        })
    );
}

export function Services() {
    return (
        <Stack spacing={3}>
            <ServiceStatus />
            <KeeperWallets />
        </Stack>
    );
}

function KeeperWallets() {
    const { data, error, loading, reload } = useChainRead(loadWalletBalances);

    useEffect(() => {
        const timer = setInterval(reload, REFRESH_SECONDS * 1000);
        return () => clearInterval(timer);
    }, [reload]);

    const rows = data || resolveWallets();

    return (
        <Section
            title="Keeper Gas 錢包"
            description="各 keeper 簽名錢包的 gas 餘額，瀏覽器直接從 RPC 讀取。Anubis 用 DAI 付 gas；餘額不夠付一筆 tx 時，keeper 每個 tick 都以 INSUFFICIENT_FUNDS 失敗，錯誤會出現在上表的「最後一次錯誤」。"
            loading={loading}
            error={error}
            onRetry={reload}
            actions={
                <Button size="small" onClick={reload}>
                    重新整理
                </Button>
            }
        >
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>服務</TableCell>
                        <TableCell>地址</TableCell>
                        <TableCell align="right">Gas 餘額（DAI）</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((wallet) => (
                        <TableRow key={wallet.service} hover sx={{ opacity: wallet.address ? 1 : 0.5 }}>
                            <TableCell sx={{ fontWeight: 600 }}>{wallet.service}</TableCell>
                            <TableCell>
                                <AddressLink address={wallet.address} full />
                            </TableCell>
                            <TableCell align="right">
                                {!wallet.address ? (
                                    <Typography variant="caption" color="text.secondary">
                                        未配置：address book 沒有這個錢包的地址
                                    </Typography>
                                ) : wallet.error ? (
                                    <Typography variant="caption" color="error">
                                        讀取失敗：{wallet.error}
                                    </Typography>
                                ) : wallet.balance === null || wallet.balance === undefined ? (
                                    '—'
                                ) : (
                                    formatUnits(wallet.balance, 18)
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Section>
    );
}

function ServiceStatus() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await api.get('/api/services');
            setServices(result.services);
            setError(null);
            setUpdatedAt(new Date());
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(load, REFRESH_SECONDS * 1000);
        return () => clearInterval(timer);
    }, [load]);

    return (
        <Section
            title="服務狀態"
            description="gold3.sync 的各個服務寫進 redis 的心跳，TTL 為 60 秒。從這份清單上消失的服務就是停止寫入了 —— 一個默默掛掉的 listener 和一個閒置中的 listener 長得一模一樣，除非拿它的游標跟鏈頭比對。"
            loading={loading}
            error={error}
            onRetry={load}
            actions={
                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                        {updatedAt ? `更新於 ${updatedAt.toLocaleTimeString()}` : '尚未更新'}
                    </Typography>
                    <Button size="small" onClick={load}>
                        重新整理
                    </Button>
                </Stack>
            }
        >
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>服務</TableCell>
                        <TableCell>狀態</TableCell>
                        <TableCell align="right">同步游標</TableCell>
                        <TableCell align="right">鏈頭區塊</TableCell>
                        <TableCell align="right">落後</TableCell>
                        <TableCell align="right">已處理事件</TableCell>
                        <TableCell>最後一次錯誤</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {services.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7}>
                                <Typography variant="body2" color="text.secondary">
                                    {loading ? '載入中...' : 'redis 裡沒有任何心跳，代表沒有服務在跑。'}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : null}

                    {services.map((service) => {
                        const behind = service.behind;
                        const lagging = behind !== null && behind > BEHIND_WARN;
                        return (
                            <TableRow key={service.name} hover>
                                <TableCell sx={{ fontWeight: 600 }}>
                                    {service.name}
                                    {service.customStatus ? (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {Object.entries(service.customStatus)
                                                .map(([key, value]) => `${key}=${value}`)
                                                .join(' ')}
                                        </Typography>
                                    ) : null}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={service.online ? (service.isRunning ? '運作中' : '已停止') : '離線'}
                                        color={service.online ? (service.isRunning ? 'success' : 'warning') : 'error'}
                                    />
                                </TableCell>
                                <TableCell align="right">{service.cursor === null ? '—' : service.cursor}</TableCell>
                                <TableCell align="right">
                                    {service.latestChainBlock === null ? '—' : service.latestChainBlock}
                                </TableCell>
                                <TableCell align="right">
                                    {behind === null ? (
                                        '—'
                                    ) : (
                                        <Typography variant="body2" color={lagging ? 'error' : 'text.primary'}>
                                            {behind}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    {service.processedEvents === null ? '—' : service.processedEvents}
                                </TableCell>
                                <TableCell>
                                    {service.lastError ? (
                                        <>
                                            <Typography variant="caption" color="error" display="block">
                                                {service.lastError}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {service.lastErrorTime ? new Date(service.lastErrorTime).toLocaleString() : ''}
                                            </Typography>
                                        </>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">
                                            無
                                        </Typography>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Section>
    );
}
