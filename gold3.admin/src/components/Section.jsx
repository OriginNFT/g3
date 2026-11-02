import { Alert, Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';

/**
 * Page frame that carries the loading and error state.
 *
 * Content is never removed from the screen. While a page is loading or its last
 * request failed, the table stays where it is and goes inert — so the shape of
 * the page is stable, and a stale value is still readable while the API is
 * unreachable. An empty page tells you nothing; a greyed-out one tells you the
 * data did not arrive.
 */
export function Section({ title, description, actions, loading, error, onRetry, children }) {
    const inert = loading || Boolean(error);

    return (
        <Stack spacing={1.5}>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                alignItems={{ xs: 'stretch', md: 'flex-end' }}
                justifyContent="space-between"
                spacing={2}
            >
                <Box>
                    <Typography variant="h5">{title}</Typography>
                    {description ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 760 }}>
                            {description}
                        </Typography>
                    ) : null}
                </Box>
                {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
            </Stack>

            {error ? (
                <Alert
                    severity="error"
                    action={
                        onRetry ? (
                            <Button color="inherit" size="small" onClick={onRetry}>
                                重試
                            </Button>
                        ) : null
                    }
                >
                    {error.message}
                </Alert>
            ) : null}

            <Paper variant="outlined" sx={{ position: 'relative', overflow: 'hidden' }}>
                {/* Two pixels of brand at the top edge is the whole loading
                    indicator. A spinner over the content would hide the values
                    that are still perfectly readable. */}
                {loading ? <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 }} /> : null}
                <Box
                    aria-busy={loading}
                    sx={{
                        opacity: inert ? 0.5 : 1,
                        pointerEvents: inert ? 'none' : 'auto',
                        transition: 'opacity 120ms',
                        // Wide tables scroll inside the card rather than
                        // squeezing every column into unreadability, and the
                        // page itself never scrolls sideways.
                        overflowX: 'auto',
                    }}
                >
                    {children}
                </Box>
            </Paper>
        </Stack>
    );
}
