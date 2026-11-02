'use strict';

const { readSession } = require('../utils/session');

// Bearer token from the Authorization header. Nothing reads cookies, so a
// cross-site request cannot ride along on an existing session.
function bearerToken(req) {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
    return token.trim();
}

async function requireAuth(req, res, next) {
    try {
        const token = bearerToken(req);
        const session = await readSession(token);
        if (!session) {
            return res.status(401).json({ error: 'not authenticated' });
        }
        req.admin = session;
        req.adminToken = token;
        next();
    } catch (err) {
        // A redis outage means sessions cannot be verified. Failing closed is
        // the only safe reading - never wave a request through because the
        // check itself broke.
        console.error('[AUTH] session lookup failed:', err.message, err);
        res.status(503).json({ error: 'session store unavailable' });
    }
}

module.exports = { requireAuth, bearerToken };
