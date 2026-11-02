import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../api/client';

/**
 * Load a collection from the API, with the three states every page needs:
 * loading, failed, and loaded.
 *
 * `data` deliberately keeps the last good value through a failed reload, so a
 * transient error leaves the table on screen (greyed out) instead of blanking
 * it — you can still read what the value WAS while the API is down.
 */
export function useResource(path) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // Which request is the current one. Several pages build `path` from a
    // filter box, so typing fires a request per keystroke and the answers can
    // arrive out of order - without this the slowest one wins and the table
    // ends up showing the results of a query the box no longer holds. A stale
    // answer is dropped entirely: it must not touch data, error or loading,
    // because clearing `loading` for a request that is no longer the current
    // one would un-grey the page while the real one is still in flight.
    const sequence = useRef(0);

    const reload = useCallback(async () => {
        const ticket = ++sequence.current;
        setLoading(true);
        try {
            const result = await api.get(path);
            if (ticket !== sequence.current) return null;
            setData(result);
            setError(null);
            return result;
        } catch (err) {
            if (ticket !== sequence.current) return null;
            setError(err);
            return null;
        } finally {
            if (ticket === sequence.current) setLoading(false);
        }
    }, [path]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { data, error, loading, reload, setData };
}
