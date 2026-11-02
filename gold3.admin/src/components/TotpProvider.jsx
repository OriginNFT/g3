import { useCallback, useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';

import { setTotpPrompt } from '../api/client';

/**
 * Asks for a verification code when the API demands one.
 *
 * Dangerous actions — deleting a parameter, resolving a payout batch, creating
 * an operator — answer 403 with `totpRequired` instead of doing the thing. The
 * API client calls in here, waits for six digits, and retries the same request
 * once. Pages know nothing about it: they call api.del() and it either happens
 * or it does not.
 *
 * The point is that a stolen session token is not enough on its own. The code
 * proves the account's owner is at the keyboard right now, and the server spends
 * it — the same code cannot be used twice.
 */
export function TotpProvider({ children }) {
    const [request, setRequest] = useState(null);
    const [code, setCode] = useState('');

    useEffect(
        () =>
            setTotpPrompt(
                (info) =>
                    new Promise((resolve) => {
                        setCode('');
                        setRequest({ info, resolve });
                    })
            ),
        []
    );

    const answer = useCallback(
        (value) => {
            if (request) request.resolve(value);
            setRequest(null);
            setCode('');
        },
        [request]
    );

    const digits = code.replace(/\D/g, '').slice(0, 6);

    return (
        <>
            {children}

            <Dialog open={Boolean(request)} onClose={() => answer(null)} maxWidth="xs" fullWidth>
                <DialogTitle>需要驗證碼</DialogTitle>
                <DialogContent>
                    <DialogContentText component="div" sx={{ mb: 2 }}>
                        這是高風險操作，請輸入驗證器目前顯示的 6 位數字。每組驗證碼只能使用一次。
                    </DialogContentText>
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        label="驗證碼"
                        value={digits}
                        onChange={(event) => setCode(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && digits.length === 6) answer(digits);
                        }}
                        inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 6 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => answer(null)}>取消</Button>
                    <Button variant="contained" disabled={digits.length !== 6} onClick={() => answer(digits)}>
                        確認
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
