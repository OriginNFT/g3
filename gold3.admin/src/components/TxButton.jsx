import { Button, Tooltip } from '@mui/material';

import { useTx } from '../chain/TxContext';
import { useWritePermission } from './Guarded';
import { permissionLabel } from '../auth/permissions';

/**
 * A button that signs one transaction.
 *
 * `title` and `detail` are what the operator reads in the confirmation dialog
 * before the wallet opens — name the contract, the function and the values.
 * `build` receives the signer and returns the sent transaction; it must not
 * await the receipt, TxProvider does that.
 *
 * The panel's write permission disables it, but does not secure it: these
 * transactions go straight from the browser to the chain, which obeys the
 * private key and knows nothing about this panel's roles. Treat it as process
 * control — the security boundary is which key the wallet holds.
 */
export function TxButton({
    title,
    detail,
    build,
    onDone,
    confirmLabel,
    disabled,
    children,
    color = 'primary',
    variant = 'outlined',
    size = 'small',
}) {
    const { request, busy } = useTx();
    const { key, allowed } = useWritePermission();

    const button = (
        <Button
            size={size}
            variant={variant}
            color={color}
            disabled={disabled || busy || !allowed}
            onClick={() => request({ title, detail, build, onDone, confirmLabel })}
        >
            {children}
        </Button>
    );

    if (allowed) return button;

    return (
        <Tooltip title={`你的角色沒有「${permissionLabel(key)}」權限`}>
            {/* A disabled button swallows pointer events, so the tooltip needs a
                wrapper that still receives them. */}
            <span>{button}</span>
        </Tooltip>
    );
}
