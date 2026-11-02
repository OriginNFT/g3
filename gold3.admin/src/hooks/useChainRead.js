import { useCallback, useEffect, useState } from 'react';

/**
 * Read state off the chain, with the same three states useResource gives the
 * API pages: loading, failed, loaded.
 *
 * `loader` must be stable (wrap it in useCallback) — it is the dependency that
 * decides when to re-read. The last good value survives a failed reload so a
 * flaky RPC greys the card out instead of blanking it.
 */
export function useChainRead(loader) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const result = await loader();
            setData(result);
            setError(null);
            return result;
        } catch (err) {
            console.error('[CHAIN] read failed:', err.message, err);
            setError(err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [loader]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { data, error, loading, reload };
}
