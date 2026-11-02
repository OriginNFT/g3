'use strict';
require('dotenv').config();

// Unbinds an admin's authenticator so they can bind a new one - the lost-phone
// path.
//   npm run reset-totp -- <username>
//
// Nothing secret is printed or transported: the old secret is dropped and the
// counter cleared, which puts the account back in the "not bound yet" state. The
// next successful password sign-in issues a fresh secret in their browser, the
// same way the first one did.
//
// Console only, deliberately. There is no self-service reset, because "I lost my
// phone" over chat is how a second factor gets talked away.

// Requiring ../model connects to the database as a side effect, so it is pulled
// in only once the arguments check out. Loading it up front means an argument
// mistake returns while that connection is still being made, and closing the
// pool from under it turns a one-line usage error into an unhandled rejection.
let db = null;

async function main() {
    const username = (process.argv[2] || '').trim();
    if (!username) {
        console.error('usage: npm run reset-totp -- <username>');
        process.exitCode = 1;
        return;
    }

    db = require('../model');
    const { ready, AdminUser, AdminAuditLog } = db;
    await ready;

    const user = await AdminUser.findOne({ where: { username } });
    if (!user) {
        console.error(`no such admin: ${username}`);
        process.exitCode = 1;
        return;
    }

    await user.update({ totp_secret: '', totp_last_counter: 0 });

    await AdminAuditLog.create({
        admin_user_id: user.id,
        username,
        action: 'update',
        entity: 'admin_user_totp_reset',
        entity_id: username,
        before: null,
        after: null,
        ip: 'console',
    });

    console.log(`\nunbound the authenticator for "${username}"`);
    console.log('Their next sign-in with the password will show a new secret to add and ask for a code.');
    console.log('Until they do that, the old app produces codes that no longer work.');
}

main()
    .catch((err) => {
        console.error('[FATAL] reset-totp:', err.message, err);
        process.exitCode = 1;
    })
    .finally(() => db && db.sequelize.close());
