import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Link, Stack, TextField, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';

import { useAuth } from '../auth/AuthContext';
import { BRAND, CANVAS } from '../theme';

// Base32 in groups of four is what an authenticator's manual-entry field expects
// and what a person can actually read off a screen without losing their place.
function grouped(secret) {
    return (secret.match(/.{1,4}/g) || []).join(' ');
}

function CodeField({ value, onChange, disabled, label = '6 位數驗證碼', helperText }) {
    return (
        <TextField
            label={label}
            value={value}
            onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{ inputMode: 'numeric', pattern: '\\d{6}', maxLength: 6 }}
            autoComplete="one-time-code"
            fullWidth
            disabled={disabled}
            helperText={helperText}
        />
    );
}

/**
 * Binding an authenticator, on screen, behind the password.
 *
 * The alternative — reading a secret off the server console and sending it to
 * whoever needs it — puts the second factor through chat or email on its way to
 * the phone. Here it appears only in the browser of someone who already proved
 * they know the password, and only until the first code is accepted.
 */
function Enrollment({ enrollment, onDone, onCancel }) {
    const { enroll } = useAuth();
    const [code, setCode] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);

    async function copySecret() {
        try {
            await navigator.clipboard.writeText(enrollment.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Clipboard access can be refused; the secret is on screen anyway.
            console.warn('clipboard write failed:', err.message);
            setError('無法複製 — 請手動選取上方的金鑰');
        }
    }

    async function submit(event) {
        event.preventDefault();
        if (!/^\d{6}$/.test(code) || busy) return;
        setBusy(true);
        setError(null);
        try {
            await enroll(enrollment.token, code);
            onDone();
        } catch (err) {
            setError(err.message);
            setCode('');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit}>
            <Stack spacing={2}>
                <Alert severity="info">
                    這個帳號還沒有綁定驗證器。用 Google Authenticator 掃描下方的 QR
                    碼，或手動輸入設定金鑰，然後填入它顯示的 6 位數字。
                </Alert>

                {error ? <Alert severity="error">{error}</Alert> : null}

                {/* Rendered here in the browser, never fetched from a chart
                    service: the URL it encodes contains the secret, and handing
                    that to a third party would defeat the whole arrangement.
                    Black on white regardless of the theme, with a quiet zone —
                    a scanner needs the contrast and the margin, so this box does
                    not follow the palette. */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ bgcolor: '#ffffff', p: 1.5, borderRadius: 1, lineHeight: 0 }}>
                        <QRCodeSVG
                            value={enrollment.otpauthUrl}
                            size={176}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#000000"
                        />
                    </Box>
                </Box>

                <Box>
                    <Typography variant="caption" color="text.secondary">
                        設定金鑰
                    </Typography>
                    <Typography
                        sx={{
                            fontFamily: 'monospace',
                            fontSize: 15,
                            letterSpacing: 0.5,
                            wordBreak: 'break-all',
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            p: 1,
                            mt: 0.5,
                        }}
                    >
                        {grouped(enrollment.secret)}
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                        <Button size="small" onClick={copySecret}>
                            {copied ? '已複製' : '複製'}
                        </Button>
                        {/* On a phone this opens the authenticator directly; on a
                            desktop it is inert, which is why the key is shown
                            rather than hidden behind it. */}
                        <Link href={enrollment.otpauthUrl} variant="caption" underline="hover">
                            用驗證器開啟
                        </Link>
                    </Stack>
                </Box>

                <CodeField
                    value={code}
                    onChange={setCode}
                    disabled={busy}
                    label="驗證器顯示的驗證碼"
                    helperText="驗證碼不對？請確認手機時間是自動校時。"
                />

                <Button type="submit" variant="contained" size="large" disabled={!/^\d{6}$/.test(code) || busy}>
                    {busy ? '綁定中...' : '綁定並登入'}
                </Button>

                <Button size="small" onClick={onCancel} disabled={busy}>
                    返回
                </Button>

                <Typography variant="caption" color="text.secondary">
                    這組金鑰只會顯示這一次。第一個驗證碼通過之後就無法再讀取 —— 手機遺失的話，必須由管理員在伺服器上執行
                    reset-totp。
                </Typography>
            </Stack>
        </form>
    );
}

export function Login() {
    const { signIn } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [enrollment, setEnrollment] = useState(null);
    // The password goes first and the server says which of the two follows:
    // binding an authenticator, or the code from one already bound. Asking for a
    // code up front is a dead end for anyone who has none yet.
    const [awaitingCode, setAwaitingCode] = useState(false);

    const canSubmit = awaitingCode ? /^\d{6}$/.test(code) : Boolean(username.trim() && password);
    const submitLabel = awaitingCode ? (busy ? '登入中...' : '登入') : busy ? '檢查中...' : '下一步';

    function backToPassword() {
        setAwaitingCode(false);
        setCode('');
        setError(null);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!canSubmit || busy) return;
        setBusy(true);
        setError(null);
        try {
            const result = await signIn(username.trim(), password, awaitingCode ? code : undefined);
            if (result.enrollment) setEnrollment(result.enrollment);
            else if (result.totpRequired) setAwaitingCode(true);
        } catch (err) {
            setError(err.message);
            // The code is spent whether or not the rest was right, so clearing
            // it saves the next attempt from failing on a replay.
            setCode('');
        } finally {
            setBusy(false);
        }
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'grid',
                placeItems: 'center',
                p: 2,
                // One wash of brand, behind the only screen that has room for
                // it. Everything past this door is a working surface.
                background: `radial-gradient(120% 90% at 50% -10%, rgba(161, 106, 8, 0.16) 0%, rgba(161, 106, 8, 0) 60%), ${CANVAS}`,
            }}
        >
            <Card variant="outlined" sx={{ width: 420, p: 1 }}>
                <CardContent>
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
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
                                // The brand gold carries white text at full
                                // strength, so the mark wears the palette's
                                // contrastText rather than dark ink.
                                color: '#FFFFFF',
                                letterSpacing: '-0.04em',
                            }}
                        >
                            GG
                        </Box>
                        <Typography variant="h6">GOLDEN PACT 管理後台</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {enrollment ? '設定你的驗證器。' : awaitingCode ? '輸入驗證器上的驗證碼。' : '輸入帳號和密碼。'}
                    </Typography>

                    {enrollment ? (
                        <Enrollment
                            enrollment={enrollment}
                            onDone={() => setEnrollment(null)}
                            onCancel={() => {
                                setEnrollment(null);
                                setAwaitingCode(false);
                                setPassword('');
                                setCode('');
                            }}
                        />
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <Stack spacing={2}>
                                {error ? <Alert severity="error">{error}</Alert> : null}

                                <TextField
                                    label="帳號"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    autoComplete="username"
                                    autoFocus
                                    fullWidth
                                    disabled={busy || awaitingCode}
                                />
                                <TextField
                                    label="密碼"
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    autoComplete="current-password"
                                    fullWidth
                                    disabled={busy || awaitingCode}
                                />
                                {awaitingCode ? <CodeField value={code} onChange={setCode} disabled={busy} /> : null}

                                {/* Disabled, never hidden: the button stays visible so
                                    it is obvious that something is still missing. */}
                                <Button type="submit" variant="contained" size="large" disabled={!canSubmit || busy}>
                                    {submitLabel}
                                </Button>

                                {awaitingCode ? (
                                    <Button size="small" onClick={backToPassword} disabled={busy}>
                                        返回
                                    </Button>
                                ) : null}
                            </Stack>
                        </form>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
