import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, getToken, setToken, onUnauthorized } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // `checking` covers the boot round-trip that turns a stored token into a
    // user. Without it the app would flash the login screen on every reload.
    const [checking, setChecking] = useState(Boolean(getToken()));

    const signOutLocally = useCallback(() => {
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => onUnauthorized(signOutLocally), [signOutLocally]);

    useEffect(() => {
        let cancelled = false;
        if (!getToken()) {
            setChecking(false);
            return undefined;
        }
        api.get('/api/auth/me')
            .then((me) => {
                if (!cancelled) setUser(me);
            })
            .catch(() => {
                // A 401 already cleared the token through onUnauthorized; any
                // other failure means the API is unreachable, and there is
                // nothing to show behind a login wall either way.
                if (!cancelled) signOutLocally();
            })
            .finally(() => {
                if (!cancelled) setChecking(false);
            });
        return () => {
            cancelled = true;
        };
    }, [signOutLocally]);

    /**
     * Sign in, or start binding an authenticator.
     *
     * Called with the password alone it answers with an enrollment ticket (never
     * bound) or `totpRequired` (bound, code still to come); called with a code as
     * well it answers with a session. Same request, three outcomes, so the caller
     * decides which screen to show rather than the server guessing.
     */
    const signIn = useCallback(async (username, password, code) => {
        const result = await api.post('/api/auth/login', {
            username,
            password,
            ...(code ? { code } : {}),
        });
        if (result.enrollment) return { enrollment: result.enrollment };
        if (result.totpRequired) return { totpRequired: true };

        setToken(result.token);
        // The login answer carries the name and role but not the permission
        // list; /me is the one place that assembles it, so it stays the one
        // place that has to be right.
        const me = await api.get('/api/auth/me');
        setUser(me);
        return { user: me };
    }, []);

    // Second half of binding: the ticket from signIn plus the first code the
    // authenticator produces. Succeeding signs them in.
    const enroll = useCallback(async (token, code) => {
        const result = await api.post('/api/auth/enroll', { token, code });
        setToken(result.token);
        const me = await api.get('/api/auth/me');
        setUser(me);
        return me;
    }, []);

    const signOut = useCallback(async () => {
        try {
            await api.post('/api/auth/logout');
        } catch (err) {
            // Already invalid server-side, or the API is unreachable. Either
            // way the local session goes.
            console.warn('logout call failed:', err.message);
        }
        signOutLocally();
    }, [signOutLocally]);

    /**
     * Does this operator hold a permission.
     *
     * Used to disable what they cannot do — never to decide whether something is
     * safe. Every API route checks for itself, and the contract pages sign from
     * the browser, where the private key is the only thing the chain listens to.
     */
    const can = useCallback(
        (key) => {
            if (!user || !Array.isArray(user.permissions)) return false;
            return user.permissions.includes(key);
        },
        [user]
    );

    const value = useMemo(
        () => ({ user, checking, signIn, signOut, enroll, can }),
        [user, checking, signIn, signOut, enroll, can]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}
