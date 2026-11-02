import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

/**
 * Confirmation for anything destructive.
 *
 * `detail` is where the caller spells out what is actually about to change — a
 * dialog that only says "are you sure?" trains people to click through it.
 */
export function ConfirmDialog({ open, title, detail, confirmLabel = '確認', busy, onConfirm, onClose }) {
    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText component="div">{detail}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={busy}>
                    取消
                </Button>
                <Button onClick={onConfirm} color="error" variant="contained" disabled={busy}>
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
