import { useCallback, useState } from 'react';
import { Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

import { contractAt, CONTRACTS } from '../../chain/contracts';
import { useChainRead } from '../../hooks/useChainRead';
import { ContractCard, ReadGrid, WriteRow, AddressLink } from '../../components/ContractCard';
import { amount18 } from './shared';

function OracleCard() {
    const load = useCallback(async () => {
        const c = contractAt('oracle');
        if (!c) return null;
        const [usdt, gg, twapWindowSeconds, count] = await Promise.all([c.usdt(), c.gg(), c.twapWindowSeconds(), c.pricedTokenCount()]);
        const tokens = [];
        for (let i = 0; i < Number(count); i += 1) {
            /* eslint-disable no-await-in-loop */
            const token = await c.pricedTokens(i);
            const o = await c.observations(token);
            let price = null;
            let priceError = null;
            try {
                price = await c.priceUSDT(token);
            } catch (err) {
                console.error(`[ORACLE] priceUSDT(${token}) failed:`, err.message, err);
                priceError = err.shortMessage || err.message;
            }
            tokens.push({ token, pair: o.pair, quote: o.quote, lastTimestamp: Number(o.lastTimestamp), lastTwap: o.lastTwap, lastLive: o.lastLive, price, priceError });
            /* eslint-enable no-await-in-loop */
        }
        return { usdt, gg, twapWindowSeconds: Number(twapWindowSeconds), tokens };
    }, []);

    const { data: d, error, loading, reload } = useChainRead(load);
    const [draft, setDraft] = useState({});
    const set = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
    const c = contractAt('oracle');

    return (
        <ContractCard
            title={CONTRACTS.oracle.label}
            subtitle="所有 USDT 估值的來源。GG 用 USDT/GG pair 的 TWAP；GOT2、AUG 用 X/GG pair 的 TWAP 再乘 GG 價。update() 由 oracle-updater keeper 呼叫，觀測窗沒過就跳過該 token。第一次 TWAP 成立前用即時價。"
            address={CONTRACTS.oracle.address}
            loading={loading}
            error={error}
            onRefresh={reload}
        >
            <ReadGrid
                items={[
                    { label: 'USDT', value: <AddressLink address={d && d.usdt} /> },
                    { label: 'GG', value: <AddressLink address={d && d.gg} /> },
                    { label: '觀測窗 twapWindowSeconds', value: d ? `${d.twapWindowSeconds.toLocaleString()} 秒` : '' },
                ]}
            />
            <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>token</TableCell>
                        <TableCell>pair</TableCell>
                        <TableCell>quote</TableCell>
                        <TableCell align="right">USDT 價 priceUSDT</TableCell>
                        <TableCell align="right">最後 TWAP（quote 計）</TableCell>
                        <TableCell>最後觀測</TableCell>
                        <TableCell>有量</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(d ? d.tokens : []).length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7}>
                                <Typography variant="body2" color="text.secondary">
                                    {loading ? '載入中...' : '還沒有登記任何 pair。'}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : null}
                    {(d ? d.tokens : []).map((row) => (
                        <TableRow key={row.token}>
                            <TableCell>
                                <AddressLink address={row.token} />
                            </TableCell>
                            <TableCell>
                                <AddressLink address={row.pair} />
                            </TableCell>
                            <TableCell>
                                <AddressLink address={row.quote} />
                            </TableCell>
                            <TableCell align="right">{row.price === null ? row.priceError || '讀不到' : amount18(row.price, 8)}</TableCell>
                            <TableCell align="right">{row.lastTwap === 0n ? '尚未成立' : amount18(row.lastTwap, 8)}</TableCell>
                            <TableCell>{row.lastTimestamp ? new Date(row.lastTimestamp * 1000).toLocaleString() : '—'}</TableCell>
                            <TableCell>{row.lastLive ? '是' : '否'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Divider sx={{ mb: 2 }} />

            <WriteRow
                fields={[]}
                values={draft}
                onChange={set}
                button="記錄一次觀測 update"
                title="記錄 TWAP 觀測 update"
                detail={<>OracleAdapter.update()：對每個登記的 token，觀測窗（{d ? d.twapWindowSeconds : '?'} 秒）已過就記一筆，沒過就跳過。任何地址都可以送出。</>}
                build={(signer) => c.connect(signer).update()}
                onDone={reload}
            />
            <WriteRow
                fields={[
                    { key: 'token', label: 'token 地址', width: 420 },
                    { key: 'pair', label: 'pair 地址', hint: 'GG 用 USDT/GG，其他用 X/GG', width: 420 },
                ]}
                values={draft}
                onChange={set}
                button="登記 pair"
                color="warning"
                title="登記 pair setPair"
                detail={
                    <>
                        OracleAdapter.setPair(<code>{draft.token}</code>, <code>{draft.pair}</code>)：<b>換 pair 會把該 token 已記錄的 TWAP 歸零並從頭起算</b>，在下一次觀測成立前用新池的即時價。
                    </>
                }
                build={(signer) => c.connect(signer).setPair(draft.token, draft.pair)}
                onDone={reload}
            />
            <WriteRow
                fields={[{ key: 'twapWindow', label: '觀測窗（秒）', hint: '3600 = 1 小時', width: 260 }]}
                values={draft}
                onChange={set}
                button="更新觀測窗"
                title="設定觀測窗 setTwapWindow"
                detail={<>OracleAdapter.setTwapWindow(<code>{draft.twapWindow}</code>)：目前 {d ? d.twapWindowSeconds : '?'} 秒。調短更跟市場也更容易被插針帶走。</>}
                build={(signer) => c.connect(signer).setTwapWindow(draft.twapWindow)}
                onDone={reload}
            />
        </ContractCard>
    );
}

export function ContractOracle() {
    return (
        <Stack spacing={3}>
            <Typography variant="h5">價格來源</Typography>
            <OracleCard />
        </Stack>
    );
}
