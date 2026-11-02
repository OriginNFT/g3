import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Link, Snackbar } from '@mui/material';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { getSigner, txUrl } from './wallet';

// Every on-chain write in this panel goes through here, and every one of them
// is confirmed first.
//
// The confirmation is not a formality: `detail` is where the caller spells out
// the contract, the function and the exact values being sent, because the
// wallet popup that follows shows a hex blob, not a sentence. Nothing here is
// recorded server-side — the panel's audit log covers database changes, and a
// signed transaction is already permanently recorded on chain.
const TxContext = createContext(null);

export function TxProvider({ children }) {
    const [pending, setPending] = useState(null);
    const [busy, setBusy] = useState(false);
    const [lastTx, setLastTx] = useState(null);
    const [toast, setToast] = useState(null);

    const request = useCallback((req) => {
        setPending(req);
    }, []);

    const close = useCallback(() => {
        if (!busy) setPending(null);
    }, [busy]);

    const confirm = useCallback(async () => {
        if (!pending) return;
        setBusy(true);
        try {
            const signer = await getSigner();
            const tx = await pending.build(signer);
            setToast({ severity: 'info', message: `${pending.title} — 已送出，等待上鏈`, hash: tx.hash });
            const receipt = await tx.wait();
            // A mined transaction can still have reverted. ethers v6 throws on
            // status 0 for most providers, but not all — check it explicitly
            // rather than reporting a revert as a success.
            if (receipt && receipt.status === 0) throw new Error('交易已上鏈但被回滾 (status 0)');
            setLastTx(tx.hash);
            setPending(null);
            setToast({ severity: 'success', message: `${pending.title} — 已完成`, hash: tx.hash });
            if (pending.onDone) await pending.onDone();
        } catch (err) {
            console.error('[TX] failed:', err.shortMessage || err.message, err);
            setToast({ severity: 'error', message: err.shortMessage || err.message || String(err), hash: null });
        } finally {
            setBusy(false);
        }
    }, [pending]);

    const value = useMemo(() => ({ request, busy, lastTx }), [request, busy, lastTx]);

    return (
        <TxContext.Provider value={value}>
            {children}

            <ConfirmDialog
                open={Boolean(pending)}
                title={pending ? pending.title : ''}
                detail={pending ? pending.detail : null}
                confirmLabel={busy ? '送出中...' : pending?.confirmLabel || '簽名送出'}
                busy={busy}
                onConfirm={confirm}
                onClose={close}
            />

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={toast && toast.severity === 'error' ? null : 6000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                {toast ? (
                    <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ maxWidth: 720 }}>
                        {toast.message}
                        {toast.hash ? (
                            <>
                                {' — '}
                                <Link href={txUrl(toast.hash)} target="_blank" rel="noopener">
                                    查看交易
                                </Link>
                            </>
                        ) : null}
                    </Alert>
                ) : null}
            </Snackbar>
        </TxContext.Provider>
    );
}

export function useTx() {
    const value = useContext(TxContext);
    if (!value) throw new Error('useTx must be used inside TxProvider');
    return value;
}
