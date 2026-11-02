'use strict';

const express = require('express');

const config = require('../config');
const { AdminUser } = require('../model');
const { verifyPassword, hashPassword } = require('../utils/password');
const { verifyCode, generateSecret, otpauthUrl } = require('../utils/totp');
const {
    createSession,
    destroySession,
    failureCount,
    recordFailure,
    clearFailures,
    createEnrollment,
    readEnrollment,
    destroyEnrollment,
} = require('../utils/session');
const { requireAuth } = require('../middleware/auth');
const { permissionsOf } = require('../middleware/permission');
const { SUPERADMIN_ROLE } = require('../permissions');
const { audit } = require('../utils/audit');
const { wrap } = require('../utils/asyncRoute');

const router = express.Router();

// One message for every way a login can fail. Which of the three factors was
// wrong is exactly what an attacker wants told, and an operator with the right
// credentials never sees it.
const REJECTED = 'invalid credentials';

// Burns roughly the same time as a real verification when the username does not
// exist, so the response time does not answer "is there such an account".
const DUMMY_HASH = hashPassword('placeholder-for-timing-only');

// An account that has never spent a code has never finished binding an
// authenticator. Deriving it from totp_last_counter rather than a dedicated
// column keeps the table as it is - sequelize.sync() only ever CREATEs, so a
// column added later would never reach a database that already has this one.
const needsEnrollment = (user) => Number(user.totp_last_counter) === 0;

router.post('/login', wrap(async function (req, res) {
    const { username, password, code } = req.body || {};

    // `code` is optional: an account still binding its authenticator does not
    // have one to give yet.
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'username and password are required' });
    }

    const attempts = await failureCount(username);
    if (attempts >= config.loginMaxAttempts) {
        console.warn(`[AUTH] ${username} is locked out (${attempts} failures) from ${req.ip}`);
        return res.status(429).json({ error: 'too many attempts, try again later' });
    }

    const user = await AdminUser.findOne({ where: { username } });

    if (!user || !user.enabled) {
        await verifyPassword(password, await DUMMY_HASH);
        await recordFailure(username);
        console.warn(`[AUTH] login rejected for ${username} from ${req.ip} (no such account or disabled)`);
        return res.status(401).json({ error: REJECTED });
    }

    if (!(await verifyPassword(password, user.password_hash))) {
        const count = await recordFailure(username);
        console.warn(`[AUTH] wrong password for ${username} from ${req.ip} (failure ${count})`);
        return res.status(401).json({ error: REJECTED });
    }

    // Binding an authenticator happens here, behind the password, rather than by
    // reading a secret off the server console. The secret is only ever handed to
    // someone who already proved they know the password, and only until the
    // first code is accepted.
    if (needsEnrollment(user)) {
        let secret = user.totp_secret;
        if (!secret) {
            secret = generateSecret();
            await user.update({ totp_secret: secret });
        }
        const enrollment = await createEnrollment(username);
        console.log(`[AUTH] ${username} is binding an authenticator from ${req.ip}`);
        return res.json({
            enrollment: {
                token: enrollment.token,
                expiresIn: enrollment.expiresIn,
                secret,
                otpauthUrl: otpauthUrl(secret, username, config.totpIssuer),
            },
        });
    }

    // Bound account, no code yet: the password half is done and the panel can
    // now ask for the six digits. Mirrors the enrollment answer above - same
    // request, three outcomes, and the caller picks the screen.
    if (typeof code !== 'string') {
        return res.json({ totpRequired: true });
    }

    const counter = verifyCode(user.totp_secret, code, { window: config.totpWindow });
    if (counter === null) {
        const count = await recordFailure(username);
        console.warn(`[AUTH] wrong TOTP for ${username} from ${req.ip} (failure ${count})`);
        return res.status(401).json({ error: REJECTED });
    }

    // A code is good once. Without this it stays usable for its whole window,
    // which is long enough for anyone who saw it over a shoulder.
    if (Number(counter) <= Number(user.totp_last_counter)) {
        const count = await recordFailure(username);
        console.warn(`[AUTH] replayed TOTP for ${username} from ${req.ip} (failure ${count})`);
        return res.status(401).json({ error: REJECTED });
    }

    await user.update({
        totp_last_counter: counter,
        last_login_at: new Date(),
        last_login_ip: req.ip || null,
    });
    await clearFailures(username);

    const session = await createSession(user, { ip: req.ip });
    console.log(`[AUTH] ${username} logged in from ${req.ip}`);

    res.json({
        token: session.token,
        expiresIn: session.expiresIn,
        user: { username: user.username, role: user.role },
    });
}));

/**
 * Finish binding an authenticator.
 *
 * Takes the ticket from /login plus the first code the app produces. Accepting
 * that code is what marks the binding done: totp_last_counter stops being 0, so
 * this route can never hand out the secret for this account again - a rebind
 * needs `npm run reset-totp` on the server, which is the point.
 */
router.post('/enroll', wrap(async function (req, res) {
    const { token, code } = req.body || {};
    if (typeof token !== 'string' || typeof code !== 'string') {
        return res.status(400).json({ error: 'token and code are required' });
    }

    const username = await readEnrollment(token);
    if (!username) {
        return res.status(401).json({ error: 'enrollment expired, sign in again' });
    }

    const user = await AdminUser.findOne({ where: { username } });
    if (!user || !user.enabled || !user.totp_secret) {
        await destroyEnrollment(token);
        return res.status(401).json({ error: REJECTED });
    }

    // A second browser cannot slip in after the first one finished: once a code
    // is spent the account is bound, and this ticket is worthless.
    if (!needsEnrollment(user)) {
        await destroyEnrollment(token);
        return res.status(409).json({ error: 'this account already has an authenticator bound' });
    }

    const counter = verifyCode(user.totp_secret, code, { window: config.totpWindow });
    if (counter === null) {
        const count = await recordFailure(username);
        console.warn(`[AUTH] wrong code while binding for ${username} from ${req.ip} (failure ${count})`);
        return res.status(401).json({ error: 'that code is not right - check the clock on your phone' });
    }

    await user.update({
        totp_last_counter: counter,
        last_login_at: new Date(),
        last_login_ip: req.ip || null,
    });
    await destroyEnrollment(token);
    await clearFailures(username);

    const session = await createSession(user, { ip: req.ip });
    // The audit helper reads the caller off req.admin, which nothing set here -
    // this route runs before there is a session. They are authenticated as of
    // the line above, so name them rather than logging "unknown".
    req.admin = { userId: user.id, username: user.username, role: user.role };
    await audit(req, { action: 'update', entity: 'admin_user_totp_bound', entityId: username });
    console.log(`[AUTH] ${username} bound an authenticator and signed in from ${req.ip}`);

    res.json({
        token: session.token,
        expiresIn: session.expiresIn,
        user: { username: user.username, role: user.role },
    });
}));

router.post('/logout', requireAuth, wrap(async function (req, res) {
    await destroySession(req.adminToken);
    console.log(`[AUTH] ${req.admin.username} logged out from ${req.ip}`);
    res.json({ ok: true });
}));

/**
 * Who am I, and what may I do.
 *
 * The permission list is read fresh rather than taken from the session, so a
 * role edited while someone is signed in reaches them on their next page load
 * instead of at their next login. The panel uses it to disable what they cannot
 * do - it is not the enforcement point, every route checks for itself.
 */
router.get('/me', requireAuth, wrap(async function (req, res) {
    const permissions = await permissionsOf(req.admin.role);
    res.json({
        username: req.admin.username,
        role: req.admin.role,
        createdAt: req.admin.createdAt,
        isSuperadmin: req.admin.role === SUPERADMIN_ROLE,
        // null means the role has been deleted out from under them: report it
        // as "no permissions" rather than failing, so the panel can show a
        // readable "ask an administrator" instead of a broken screen.
        permissions: permissions || [],
        roleMissing: permissions === null,
    });
}));

// Changing your own password. The current password AND a fresh code are both
// required: a stolen session alone must not be enough to take the account over.
router.post('/password', requireAuth, wrap(async function (req, res) {
    const { currentPassword, newPassword, code } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || typeof code !== 'string') {
        return res.status(400).json({ error: 'currentPassword, newPassword and code are required' });
    }

    const user = await AdminUser.findByPk(req.admin.userId);
    if (!user || !user.enabled) return res.status(401).json({ error: REJECTED });

    if (!(await verifyPassword(currentPassword, user.password_hash))) {
        console.warn(`[AUTH] password change rejected for ${user.username} (wrong current password)`);
        return res.status(401).json({ error: REJECTED });
    }

    const counter = verifyCode(user.totp_secret, code, { window: config.totpWindow });
    if (counter === null || Number(counter) <= Number(user.totp_last_counter)) {
        console.warn(`[AUTH] password change rejected for ${user.username} (bad or reused TOTP)`);
        return res.status(401).json({ error: REJECTED });
    }

    let hash;
    try {
        hash = await hashPassword(newPassword);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }

    await user.update({ password_hash: hash, totp_last_counter: counter });
    await audit(req, { action: 'update', entity: 'admin_user_password', entityId: user.username });
    console.log(`[AUTH] ${user.username} changed their password`);

    res.json({ ok: true });
}));

module.exports = router;
