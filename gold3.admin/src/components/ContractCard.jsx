import { useEffect } from 'react';
import { Alert, Box, Button, Grid, LinearProgress, Link, Paper, Stack, TextField, Typography } from '@mui/material';

import { addressUrl, shorten } from '../chain/wallet';
import { MONO } from '../theme';
import { TxButton } from './TxButton';

export function AddressLink({ address, full }) {
    if (!address || /^0x0{40}$/i.test(address)) return <span>—</span>;
    return (
        <Link
            href={addressUrl(address)}
            target="_blank"
            rel="noopener"
            sx={{ fontFamily: MONO, fontSize: 12, letterSpacing: '-0.01em' }}
        >
            {full ? address : shorten(address)}
        </Link>
    );
}

/**
 * One contract, one card: what it is, where it lives, what it currently says,
 * and what can be changed on it.
 *
 * A contract with no address still renders — greyed out with the reason — so
 * the page shows the whole system, including the parts that are not deployed
 * yet. Hiding them would make the panel silently disagree with the deployment.
 */
export function ContractCard({ title, subtitle, address, loading, error, onRefresh, children }) {
    const missing = !address;
    const inert = missing || loading || Boolean(error);

    return (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            {loading ? <LinearProgress /> : null}
            {/* Dashed seam, same as everything else in the frame. No tint: the
                card already floats on its own shadow, and a filled header on top
                of that is one layer too many. */}
            <Box sx={{ p: 2.5, borderBottom: (t) => `dashed 1px ${t.palette.divider}` }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {title}
                        </Typography>
                        {subtitle ? (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 860 }}>
                                {subtitle}
                            </Typography>
                        ) : null}
                        <Box sx={{ mt: 0.5 }}>
                            <AddressLink address={address} full />
                        </Box>
                    </Box>
                    {onRefresh ? (
                        <Button size="small" onClick={onRefresh} disabled={missing}>
                            重新讀取
                        </Button>
                    ) : null}
                </Stack>
            </Box>

            {missing ? (
                <Alert severity="info" sx={{ borderRadius: 0 }}>
                    地址簿沒有這個合約的地址（尚未部署，或 addresses.json 需要重新複製）。
                </Alert>
            ) : null}
            {error ? (
                <Alert severity="error" sx={{ borderRadius: 0 }}>
                    讀取失敗：{error.message}
                </Alert>
            ) : null}

            <Box
                sx={{
                    p: 2.5,
                    opacity: inert ? 0.5 : 1,
                    pointerEvents: inert ? 'none' : 'auto',
                    transition: 'opacity 120ms',
                    overflowX: 'auto',
                }}
            >
                {children}
            </Box>
        </Paper>
    );
}

/** Current on-chain values, read-only. `items` is [{ label, value, hint }]. */
export function ReadGrid({ items }) {
    return (
        <Grid container spacing={2} sx={{ mb: 1 }}>
            {items.map((item) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.label}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
                        {item.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                        {item.value === undefined || item.value === null || item.value === '' ? '—' : item.value}
                    </Typography>
                    {item.hint ? (
                        <Typography variant="caption" color="text.secondary">
                            {item.hint}
                        </Typography>
                    ) : null}
                </Grid>
            ))}
        </Grid>
    );
}

/**
 * One input plus the transaction it feeds. `fields` is [{ key, label, hint,
 * width, select, options }] and the current draft lives in the caller, so the
 * caller can also use the values in the confirmation detail.
 */
export function WriteRow({ fields = [], values = {}, onChange, button, disabled, ...tx }) {
    // A native select shows its first option whether or not the draft holds a
    // value. Seeding the draft keeps what is displayed and what gets signed the
    // same thing — an empty draft would otherwise send undefined.
    useEffect(() => {
        fields.forEach((f) => {
            if (f.select && (values[f.key] === undefined || values[f.key] === '')) onChange(f.key, f.options[0].value);
        });
    });

    const incomplete = fields.some((f) => f.optional !== true && String(values[f.key] ?? '').trim() === '');

    return (
        <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {fields.map((f) => (
                <TextField
                    key={f.key}
                    size="small"
                    label={f.label}
                    helperText={f.hint}
                    value={values[f.key] ?? ''}
                    onChange={(event) => onChange(f.key, event.target.value)}
                    select={Boolean(f.select)}
                    SelectProps={f.select ? { native: true } : undefined}
                    InputLabelProps={f.select ? { shrink: true } : undefined}
                    sx={{ width: f.width || 260 }}
                >
                    {f.select
                        ? f.options.map((o) => (
                              <option key={o.value} value={o.value}>
                                  {o.label}
                              </option>
                          ))
                        : null}
                </TextField>
            ))}
            <TxButton {...tx} disabled={disabled || incomplete}>
                {button}
            </TxButton>
        </Stack>
    );
}
